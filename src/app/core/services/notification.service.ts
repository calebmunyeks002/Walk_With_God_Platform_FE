import { Injectable, inject, signal, effect } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

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

  /** True while the initial load is in flight. */
  readonly loading = signal<boolean>(false);

  private client: Client | null = null;

  constructor() {
    // Load + connect whenever the user changes
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
    // Initial fetch — recent + unread count
    this.refresh();

    // WebSocket connection
    if (this.client?.active) return;
    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws') as any,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    this.client.onConnect = () => {
      this.client!.subscribe(
        `/topic/users/${userId}/notifications`,
        (frame: IMessage) => this.onLiveNotification(frame)
      );
    };

    this.client.activate();
  }

  private disconnect() {
    this.client?.deactivate();
    this.client = null;
    this.recent.set([]);
    this.unread.set(0);
  }

  /* =========================================================
     Public API
     ========================================================= */

  /** Reload the recent list + unread count. */
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

  markRead(id: string) {
    // Optimistic
    this.recent.update((list) =>
      list.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    this.unread.update((c) => Math.max(0, c - 1));

    this.api.markNotificationRead(id).subscribe({
      next: () => {},
      error: () => this.refresh(), // revert on failure
    });
  }

  markAllRead() {
    // Optimistic
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
        // Play a subtle sound (best-effort)
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