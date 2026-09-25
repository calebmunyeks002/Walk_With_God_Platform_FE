import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';

interface AdminNotificationRow {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  senderId: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  emailSent: boolean;
  readAt: string | null;
  createdAt: string;
}

@Component({
  standalone: true,
  selector: 'app-admin-notifications',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-notifications.component.html',
  styleUrl: './admin-notifications.component.scss',
})
export class AdminNotificationsComponent {
  api = inject(ApiService);

  rows = signal<AdminNotificationRow[]>([]);
  loading = signal(true);
  error = signal('');
  actionMessage = signal('');

  // Filters
  typeFilter: 'ALL' | 'WELCOME' | 'MENTOR_REQUEST' | 'MENTOR_ACCEPTED' | 'MENTOR_DECLINED' | 'ADMIN_BROADCAST' | 'POST_REPORTED' | 'CALL_MISSED' = 'ALL';
  readFilter: 'ALL' | 'READ' | 'UNREAD' = 'ALL';
  searchText = '';
  fromDate = '';
  toDate = '';

  // Pagination
  page = signal(0);
  size = 30;
  totalPages = signal(0);
  totalElements = signal(0);

  // Send dialog
  composerOpen = signal(false);
  sendTarget: 'ALL' | 'ROLE' | 'USER' = 'ALL';
  sendRole: 'MEMBER' | 'MENTOR' | 'ADMIN' = 'MEMBER';
  sendUserId = '';
  sendSearch = '';
  sendSearchResults = signal<Array<{ id: string; name: string; email: string; role: string }>>([]);
  sendTitle = '';
  sendBody = '';
  sendLink = '';
  sendEmail = false;
  sending = signal(false);
  composerError = signal('');

  readonly notificationTypes = [
    'ALL', 'WELCOME', 'MENTOR_REQUEST', 'MENTOR_ACCEPTED',
    'MENTOR_DECLINED', 'ADMIN_BROADCAST', 'POST_REPORTED', 'CALL_MISSED'
  ] as const;

  readonly roles = ['MEMBER', 'MENTOR', 'ADMIN'] as const;

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');

    this.api
      .adminNotifications({
        type: this.typeFilter === 'ALL' ? undefined : this.typeFilter,
        read: this.readFilter === 'ALL' ? undefined : this.readFilter === 'READ',
        search: this.searchText.trim() || undefined,
        from: this.fromDate ? new Date(this.fromDate).toISOString() : undefined,
        to: this.toDate ? new Date(this.toDate + 'T23:59:59').toISOString() : undefined,
        page: this.page(),
        size: this.size,
      })
      .subscribe({
        next: (p) => {
          this.rows.set(p.content);
          this.totalPages.set(p.totalPages);
          this.totalElements.set(p.totalElements);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(e?.error?.message || 'Failed to load notifications.');
          this.loading.set(false);
        },
      });
  }

  applyFilters() {
    this.page.set(0);
    this.load();
  }

  clearFilters() {
    this.typeFilter = 'ALL';
    this.readFilter = 'ALL';
    this.searchText = '';
    this.fromDate = '';
    this.toDate = '';
    this.page.set(0);
    this.load();
  }

  nextPage() {
    if (this.page() + 1 < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }

  prevPage() {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  /* ---------- Composer ---------- */

  openComposer() {
    this.composerOpen.set(true);
    this.composerError.set('');
    this.sendTarget = 'ALL';
    this.sendRole = 'MEMBER';
    this.sendUserId = '';
    this.sendSearch = '';
    this.sendSearchResults.set([]);
    this.sendTitle = '';
    this.sendBody = '';
    this.sendLink = '';
    this.sendEmail = false;
  }

  closeComposer() {
    this.composerOpen.set(false);
  }

  /** Simple user search for the "specific user" target. */
  searchUsers() {
    const q = this.sendSearch.trim();
    if (q.length < 2) {
      this.sendSearchResults.set([]);
      return;
    }
    this.api.adminUsers({ search: q, page: 0, size: 10 }).subscribe({
      next: (p) => {
        this.sendSearchResults.set(
          p.content.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
          }))
        );
      },
      error: () => this.sendSearchResults.set([]),
    });
  }

  pickUser(u: { id: string; name: string; email: string; role: string }) {
    this.sendUserId = u.id;
    this.sendSearch = `${u.name} (${u.email})`;
    this.sendSearchResults.set([]);
  }

  sendNotification() {
    if (!this.sendTitle.trim()) {
      this.composerError.set('Title is required.');
      return;
    }
    if (this.sendTarget === 'USER' && !this.sendUserId) {
      this.composerError.set('Pick a user first.');
      return;
    }

    this.sending.set(true);
    this.composerError.set('');

    this.api
      .adminSendNotification({
        target: this.sendTarget,
        userId: this.sendTarget === 'USER' ? this.sendUserId : undefined,
        role: this.sendTarget === 'ROLE' ? this.sendRole : undefined,
        title: this.sendTitle.trim(),
        body: this.sendBody.trim() || undefined,
        link: this.sendLink.trim() || undefined,
        sendEmail: this.sendEmail,
      })
      .subscribe({
        next: (r) => {
          this.sending.set(false);
          this.actionMessage.set(
            `Sent to ${r.recipients} recipient${r.recipients === 1 ? '' : 's'}.`
          );
          this.closeComposer();
          this.applyFilters();
        },
        error: (e) => {
          this.sending.set(false);
          this.composerError.set(e?.error?.message || 'Failed to send.');
        },
      });
  }

  /* ---------- Helpers ---------- */

  typeIcon(t: string): string {
    switch (t) {
      case 'WELCOME': return '✨';
      case 'MENTOR_REQUEST': return '✍';
      case 'MENTOR_ACCEPTED': return '✓';
      case 'MENTOR_DECLINED': return '✕';
      case 'ADMIN_BROADCAST': return '📢';
      case 'POST_REPORTED': return '⚠';
      case 'CALL_MISSED': return '📞';
      default: return '🔔';
    }
  }

  typeLabel(t: string): string {
    return t
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  }
}