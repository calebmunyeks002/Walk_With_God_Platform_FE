import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { AuditLog, Page } from '../../../../core/models/models';

@Component({
  standalone: true,
  selector: 'app-admin-audit',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-audit.component.html',
  styleUrl: './admin-audit.component.scss',
})
export class AdminAuditComponent {
  api = inject(ApiService);

  logs = signal<AuditLog[]>([]);
  loading = signal(true);
  error = signal('');
  expandedRow = signal<string | null>(null);

  // Filters
  actionFilter = 'ALL';
  successFilter: 'ALL' | 'SUCCESS' | 'FAILED' = 'ALL';
  fromDate = '';
  toDate = '';
  searchText = '';

  // Pagination
  page = signal(0);
  size = 25;
  totalPages = signal(0);
  totalElements = signal(0);

  // Actions catalogue for the dropdown
  actions = [
    'ALL',
    // Users
    'USER_CREATED',
    'USER_UPDATED',
    'USER_SUSPENDED',
    'USER_REACTIVATED',
    'ROLE_CHANGED',
    // Mentor workflow
    'MENTOR_APPLICATION_SUBMITTED',
    'MENTOR_APPLICATION_APPROVED',
    'MENTOR_APPLICATION_REJECTED',
    'MENTOR_REQUEST_SENT',
    'MENTOR_REQUEST_ACCEPTED',
    'MENTOR_REQUEST_DECLINED',
    // Community
    'POST_CREATED',
    'POST_DELETED',
    'POST_REPORTED',
    'COMMENT_DELETED',
    // Devotions
    'DEVOTION_PUBLISHED',
    'DEVOTION_DELETED',
    // Trivia
    'TRIVIA_CREATED',
    'TRIVIA_DELETED',
    // Auth
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'PASSWORD_RESET_REQUESTED',
    'PASSWORD_RESET_COMPLETED',
    'ACCOUNT_LOCKED',
  ];

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');

    this.api
      .adminAudit({
        action: this.actionFilter === 'ALL' ? undefined : (this.actionFilter as any),
        success:
          this.successFilter === 'ALL'
            ? undefined
            : this.successFilter === 'SUCCESS',
        from: this.fromDate ? new Date(this.fromDate).toISOString() : undefined,
        to: this.toDate
          ? new Date(this.toDate + 'T23:59:59').toISOString()
          : undefined,
        page: this.page(),
        size: this.size,
      })
      .subscribe({
        next: (p: Page<AuditLog>) => {
          this.logs.set(p.content);
          this.totalPages.set(p.totalPages);
          this.totalElements.set(p.totalElements);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(e?.error?.message || 'Failed to load audit log.');
          this.loading.set(false);
        },
      });
  }

  /** Client-side filter on top of the server results. */
  filteredLogs(): AuditLog[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.logs();

    return this.logs().filter(
      (l) =>
        (l.actorName ?? '').toLowerCase().includes(q) ||
        (l.actorRole ?? '').toLowerCase().includes(q) ||
        (l.action ?? '').toLowerCase().includes(q) ||
        (l.reason ?? '').toLowerCase().includes(q) ||
        (l.targetType ?? '').toLowerCase().includes(q) ||
        (l.targetId ?? '').toLowerCase().includes(q)
    );
  }

  applyFilters() {
    this.page.set(0);
    this.load();
  }

  clearFilters() {
    this.actionFilter = 'ALL';
    this.successFilter = 'ALL';
    this.fromDate = '';
    this.toDate = '';
    this.searchText = '';
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

  toggleRow(id: string) {
    this.expandedRow.update((current) => (current === id ? null : id));
  }

  /** Visual tone for action badges. */
  actionTone(action: string): string {
    if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('SUSPENDED') || action.includes('FAILED')) {
      return 'danger';
    }
    if (action.includes('CREATED') || action.includes('APPROVED') || action.includes('ACCEPTED') || action.includes('REACTIVATED') || action.includes('SUCCESS')) {
      return 'success';
    }
    if (action.includes('ROLE_CHANGED') || action.includes('UPDATED')) {
      return 'warn';
    }
    return 'neutral';
  }

  /** Friendly label from SCREAMING_SNAKE_CASE. */
  actionLabel(action: string): string {
    return action
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  }
}