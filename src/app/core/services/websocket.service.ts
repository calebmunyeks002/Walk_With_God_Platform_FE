import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface LiveMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private auth = inject(AuthService);
  private client: Client | null = null;

  /** Latest received message — components can watch this signal. */
  readonly lastMessage = signal<LiveMessage | null>(null);

  /** Connection state. */
  readonly connected = signal(false);

  connect() {
    if (this.client?.active) return;
    const userId = this.auth.user()?.id;
    if (!userId) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl) as any,      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {
        /* silence; turn on for troubleshooting */
      },
    });

    this.client.onConnect = () => {
      this.connected.set(true);

      // Subscribe to this user's private message topic
      this.client!.subscribe(
        `/topic/users/${userId}/messages`,
        (frame: IMessage) => {
          try {
            const msg = JSON.parse(frame.body) as LiveMessage;
            this.lastMessage.set(msg);
          } catch (e) {
            console.error('Bad WS payload', frame.body);
          }
        }
      );
    };

    this.client.onDisconnect = () => this.connected.set(false);
    this.client.onWebSocketClose = () => this.connected.set(false);

    this.client.activate();
  }

  disconnect() {
    this.client?.deactivate();
    this.client = null;
    this.connected.set(false);
  }

  ngOnDestroy() {
    this.disconnect();
  }
}