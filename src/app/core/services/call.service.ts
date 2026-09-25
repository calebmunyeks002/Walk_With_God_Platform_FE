import { Injectable, inject, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';

export type CallMediaType = 'AUDIO' | 'VIDEO';
export type CallPhase =
  | 'IDLE'
  | 'OUTGOING_RINGING'   // caller side
  | 'INCOMING_RINGING'   // callee side
  | 'CONNECTING'         // accepted, WebRTC handshake in progress
  | 'CONNECTED'          // media flowing
  | 'ENDED';

export interface ActiveCall {
  callId: string;
  peerId: string;
  peerName: string;
  mediaType: CallMediaType;
  direction: 'OUTGOING' | 'INCOMING';
  phase: CallPhase;
  startedAt: number;
  connectedAt?: number;
  muted: boolean;
  cameraOff: boolean;
  incomingSdp?: RTCSessionDescriptionInit;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

@Injectable({ providedIn: 'root' })
export class CallService {
  private auth = inject(AuthService);
  private ws = inject(WebSocketService);

  /** Current call state — null when idle. */
  readonly activeCall = signal<ActiveCall | null>(null);

  /** Local + remote media streams — components bind to these. */
  readonly localStream = signal<MediaStream | null>(null);
  readonly remoteStream = signal<MediaStream | null>(null);

  /** Any user-facing error message. */
  readonly lastError = signal<string>('');

  private peerConnection: RTCPeerConnection | null = null;
  private callClient: Client | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  /* =========================================================
     Init — called once at app startup by AppShellComponent
     ========================================================= */

  init() {
    if (this.callClient?.active) return;
    const user = this.auth.user();
    if (!user) return;

    this.callClient = new Client({
      webSocketFactory: () => new SockJS('/ws') as any,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    this.callClient.onConnect = () => {
      // Subscribe to this user's personal call topic
      this.callClient!.subscribe(
        `/topic/users/${user.id}/calls`,
        (frame: IMessage) => this.handleSignal(frame)
      );
    };

    this.callClient.activate();
  }

  disconnect() {
    this.endCall('DISCONNECTED');
    this.callClient?.deactivate();
    this.callClient = null;
  }

  /* =========================================================
     Public API
     ========================================================= */

  async startCall(peerId: string, peerName: string, mediaType: CallMediaType): Promise<void> {
    if (this.activeCall()) return;

    const user = this.auth.user();
    if (!user) return;

    this.activeCall.set({
      callId: '',  // will be set by server
      peerId,
      peerName,
      mediaType,
      direction: 'OUTGOING',
      phase: 'OUTGOING_RINGING',
      startedAt: Date.now(),
      muted: false,
      cameraOff: false,
    });

    // Get local media first (so caller sees themselves right away)
    await this.acquireLocalMedia(mediaType);

    // Ask the server to ring the callee
    this.publish('/app/call/request', {
      fromUserId: user.id,
      fromName: user.name,
      calleeId: peerId,
      mediaType,
    });
  }

  async acceptCall(): Promise<void> {
    const call = this.activeCall();
    if (!call || call.direction !== 'INCOMING') return;

    this.activeCall.update((c) => c ? { ...c, phase: 'CONNECTING' } : c);

    await this.acquireLocalMedia(call.mediaType);

    // Tell the server we picked up
    this.publish('/app/call/accept', {
      callId: call.callId,
      fromUserId: this.auth.user()?.id,
    });
  }

  declineCall(): void {
    const call = this.activeCall();
    if (!call) return;
    this.publish('/app/call/decline', {
      callId: call.callId,
      fromUserId: this.auth.user()?.id,
    });
    this.cleanup();
  }

  endCall(reason: string = 'HANGUP'): void {
    const call = this.activeCall();
    if (call && call.callId) {
      if (call.phase === 'OUTGOING_RINGING') {
        // Caller cancelled before callee answered
        this.publish('/app/call/cancel', {
          callId: call.callId,
          fromUserId: this.auth.user()?.id,
        });
      } else {
        this.publish('/app/call/end', {
          callId: call.callId,
          fromUserId: this.auth.user()?.id,
          reason,
        });
      }
    }
    this.cleanup();
  }

  toggleMute(): void {
    const call = this.activeCall();
    const stream = this.localStream();
    if (!call || !stream) return;

    const newMuted = !call.muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
    this.activeCall.update((c) => c ? { ...c, muted: newMuted } : c);
  }

  toggleCamera(): void {
    const call = this.activeCall();
    const stream = this.localStream();
    if (!call || !stream) return;

    const newOff = !call.cameraOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = !newOff));
    this.activeCall.update((c) => c ? { ...c, cameraOff: newOff } : c);
  }

  /* =========================================================
     Signal handling (messages from WebSocket)
     ========================================================= */

  private async handleSignal(frame: IMessage) {
    let msg: any;
    try {
      msg = JSON.parse(frame.body);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'CALL_INCOMING':
        await this.onIncoming(msg);
        break;

      case 'CALL_ACCEPTED':
        await this.onAccepted(msg);
        break;

      case 'CALL_DECLINED':
      case 'CALL_CANCELLED':
      case 'CALL_ENDED':
        this.onRemoteEnded(msg);
        break;

      case 'CALL_SDP':
        await this.onRemoteSdp(msg);
        break;

      case 'CALL_ICE':
        await this.onRemoteIce(msg);
        break;
    }
  }

  private async onIncoming(msg: any) {
    // If already in a call, ignore (or auto-decline)
    if (this.activeCall()) return;

    this.activeCall.set({
      callId: msg.callId,
      peerId: msg.fromUserId,
      peerName: msg.fromName ?? 'Unknown',
      mediaType: msg.mediaType ?? 'VIDEO',
      direction: 'INCOMING',
      phase: 'INCOMING_RINGING',
      startedAt: Date.now(),
      muted: false,
      cameraOff: false,
    });

    // Ring tone (best-effort; browser may block)
    this.playRingtone();
  }

  private async onAccepted(msg: any) {
    const call = this.activeCall();
    if (!call) return;

    // Only the CALLER creates the offer after receiving CALL_ACCEPTED
    if (call.direction === 'OUTGOING') {
      this.activeCall.update((c) => c ? { ...c, callId: msg.callId, phase: 'CONNECTING' } : c);
      await this.createPeerConnection();
      await this.sendOffer();
    }
    this.stopRingtone();
  }

  private onRemoteEnded(_msg: any) {
    this.stopRingtone();
    this.cleanup();
  }

  private async onRemoteSdp(msg: any) {
    const pc = this.peerConnection;
    if (!pc) return;

    if (msg.sdpType === 'offer') {
      await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
      await this.flushPendingCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.publish('/app/call/sdp', {
        callId: this.activeCall()?.callId,
        toUserId: msg.fromUserId ?? this.activeCall()?.peerId,
        sdpType: 'answer',
        sdp: answer.sdp,
      });
    } else if (msg.sdpType === 'answer') {
      await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
      await this.flushPendingCandidates();
    }
  }

  private async onRemoteIce(msg: any) {
    const pc = this.peerConnection;
    if (!pc) return;

    const candidate: RTCIceCandidateInit = {
      candidate: msg.candidate,
      sdpMid: msg.sdpMid,
      sdpMLineIndex: msg.sdpMLineIndex,
    };

    // If remote description not set yet, buffer
    if (!pc.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(candidate);
    } catch (e) {
      console.warn('ICE add failed', e);
    }
  }

  /* =========================================================
     WebRTC primitives
     ========================================================= */

  private async acquireLocalMedia(mediaType: CallMediaType): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: mediaType === 'VIDEO' ? { width: 1280, height: 720 } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream.set(stream);
    } catch (e) {
      this.lastError.set('Could not access microphone/camera. Check permissions.');
      this.endCall('MEDIA_ERROR');
    }
  }

  private async createPeerConnection(): Promise<void> {
    if (this.peerConnection) return;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peerConnection = pc;

    // Add local tracks
    const local = this.localStream();
    if (local) {
      local.getTracks().forEach((track) => pc.addTrack(track, local));
    }

    // When remote tracks arrive, attach them
    const remote = new MediaStream();
    this.remoteStream.set(remote);

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((t) => {
        if (!remote.getTracks().some((x) => x.id === t.id)) {
          remote.addTrack(t);
        }
      });
      // Trigger signal update so the widget re-renders
      this.remoteStream.set(remote);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const call = this.activeCall();
        if (!call) return;
        this.publish('/app/call/ice', {
          callId: call.callId,
          toUserId: call.peerId,
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.activeCall.update((c) =>
          c ? { ...c, phase: 'CONNECTED', connectedAt: Date.now() } : c
        );
        this.stopRingtone();
      } else if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        this.endCall('CONNECTION_LOST');
      }
    };
  }

  private async sendOffer(): Promise<void> {
    const pc = this.peerConnection;
    const call = this.activeCall();
    if (!pc || !call) return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.publish('/app/call/sdp', {
      callId: call.callId,
      toUserId: call.peerId,
      sdpType: 'offer',
      sdp: offer.sdp,
    });
  }

  private async flushPendingCandidates(): Promise<void> {
    const pc = this.peerConnection;
    if (!pc) return;
    const pending = [...this.pendingCandidates];
    this.pendingCandidates = [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(c);
      } catch (e) {
        console.warn('ICE flush failed', e);
      }
    }
  }

  /* =========================================================
     Helpers
     ========================================================= */

  private publish(destination: string, body: any) {
    if (!this.callClient?.connected) {
      this.lastError.set('Call service not connected. Refresh and try again.');
      return;
    }
    this.callClient.publish({ destination, body: JSON.stringify(body) });
  }

  private cleanup() {
    // Stop local media
    this.localStream()?.getTracks().forEach((t) => t.stop());
    this.localStream.set(null);

    // Stop remote media
    this.remoteStream()?.getTracks().forEach((t) => t.stop());
    this.remoteStream.set(null);

    // Close peer connection
    this.peerConnection?.close();
    this.peerConnection = null;

    // Reset pending ICE
    this.pendingCandidates = [];

    // Reset state
    this.activeCall.set(null);
    this.stopRingtone();
  }

  /* =========================================================
     Ringtone (simple WebAudio beep)
     ========================================================= */

  private ringtoneCtx: AudioContext | null = null;
  private ringtoneInterval: number | null = null;

  private playRingtone() {
    try {
      this.ringtoneCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const beep = () => {
        if (!this.ringtoneCtx) return;
        const osc = this.ringtoneCtx.createOscillator();
        const gain = this.ringtoneCtx.createGain();
        osc.frequency.value = 480;
        osc.connect(gain);
        gain.connect(this.ringtoneCtx.destination);
        gain.gain.setValueAtTime(0.15, this.ringtoneCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ringtoneCtx.currentTime + 0.6);
        osc.start();
        osc.stop(this.ringtoneCtx.currentTime + 0.7);
      };
      beep();
      this.ringtoneInterval = window.setInterval(beep, 1500);
    } catch {
      /* silent */
    }
  }

  private stopRingtone() {
    if (this.ringtoneInterval !== null) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
    this.ringtoneCtx?.close();
    this.ringtoneCtx = null;
  }
}