import { Component, inject, computed, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallService } from '../../../../core/services/call.service';

@Component({
  standalone: true,
  selector: 'app-call-widget',
  imports: [CommonModule],
  templateUrl: './call-widget.component.html',
  styleUrl: './call-widget.component.scss',
})
export class CallWidgetComponent implements AfterViewChecked {
  call = inject(CallService);

  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef?: ElementRef<HTMLVideoElement>;

  /** Formatted duration string for the connected timer. */
  readonly duration = computed(() => {
    const c = this.call.activeCall();
    if (!c || !c.connectedAt) return '00:00';
    // Recompute every render — cheap and works fine
    const secs = Math.floor((Date.now() - c.connectedAt) / 1000);
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  ngAfterViewChecked() {
    // Bind the streams to the <video> elements
    const local = this.call.localStream();
    if (local && this.localVideoRef?.nativeElement.srcObject !== local) {
      this.localVideoRef!.nativeElement.srcObject = local;
    }
    const remote = this.call.remoteStream();
    if (remote && this.remoteVideoRef?.nativeElement.srcObject !== remote) {
      this.remoteVideoRef!.nativeElement.srcObject = remote;
    }
  }

  accept() { this.call.acceptCall(); }
  decline() { this.call.declineCall(); }
  hangup() { this.call.endCall('HANGUP'); }
  toggleMute() { this.call.toggleMute(); }
  toggleCamera() { this.call.toggleCamera(); }
}