import { Injectable, inject, signal, effect } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private auth = inject(AuthService);
  private api = inject(ApiService);

  /** Most recent notifications (loaded on login, updated via WS). */
  readonly recent = signal<NotificationView[]>([]);

  /** Unread count for the bell badge. */
  readonly unread = signal<number>(0);

  /** Unread messages across all conversations (for the ✉ badge). */
  readonly unreadMessages = signal<number>(0);

  /** True while the initial load is in flight. */
  readonly loading = signal<boolean>(false);

  private client: Client | null = null;
  private pollHandle: any = null;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.bootstrap(user.id);
      } else {
        this.disconnect();
      }
    });
  }

  /* =========================================================
     Bootstrap
     ========================================================= */

  private bootstrap(userId: string) {
    this.refresh();
    this.refreshUnreadMessages();

    // Poll unread messages every 30 seconds (fallback if WS misses an event)
    if (this.pollHandle) clearInterval(this.pollHandle);
    this.pollHandle = setInterval(() => this.refreshUnreadMessages(), 30_000);

    if (this.client?.active) return;
    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl) as any,      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    this.client.onConnect = () => {
      this.client!.subscribe(
        `/topic/users/${userId}/notifications`,
        (frame: IMessage) => this.onLiveNotification(frame)
      );

      // Also listen for messages so the ✉ badge updates instantly
      this.client!.subscribe(
        `/topic/users/${userId}/messages`,
        () => this.refreshUnreadMessages()
      );
    };

    this.client.activate();
  }

  private disconnect() {
    this.client?.deactivate();
    this.client = null;
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    this.recent.set([]);
    this.unread.set(0);
    this.unreadMessages.set(0);
  }

  /* =========================================================
     Public API
     ========================================================= */

  refresh() {
    this.loading.set(true);

    this.api.notifications(0, 20).subscribe({
      next: (page) => {
        this.recent.set(page.content);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });

    this.api.notificationsUnreadCount().subscribe({
      next: (r) => this.unread.set(r.count),
      error: () => {},
    });
  }

  /** Recompute total unread messages from /api/conversations. */
  refreshUnreadMessages() {
    this.api.conversations().subscribe({
      next: (list) => {
        const total = list.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
        this.unreadMessages.set(total);
      },
      error: () => {},
    });
  }

  markRead(id: string) {
    this.recent.update((list) =>
      list.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    this.unread.update((c) => Math.max(0, c - 1));

    this.api.markNotificationRead(id).subscribe({
      next: () => {},
      error: () => this.refresh(),
    });
  }

  markAllRead() {
    this.recent.update((list) => list.map((n) => ({ ...n, read: true })));
    this.unread.set(0);

    this.api.markAllNotificationsRead().subscribe({
      next: () => {},
      error: () => this.refresh(),
    });
  }

  /* =========================================================
     Live updates
     ========================================================= */

  private onLiveNotification(frame: IMessage) {
    try {
      const payload = JSON.parse(frame.body);
      if (payload.type === 'NOTIFICATION' && payload.notification) {
        const n = payload.notification as NotificationView;
        this.recent.update((list) => [n, ...list].slice(0, 20));
        this.unread.update((c) => c + 1);
        this.ding();
      }
    } catch {
      /* ignore bad payloads */
    }
  }

  private ding() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 720;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      setTimeout(() => ctx.close(), 500);
    } catch {
      /* silently ignore */
    }
  }
}