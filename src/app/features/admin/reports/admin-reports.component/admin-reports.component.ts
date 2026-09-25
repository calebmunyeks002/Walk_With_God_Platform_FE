import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { Page } from '../../../../core/models/models';

interface ReportRow {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'POST' | 'COMMENT' | 'USER';
  targetId: string;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

type ResolveDecision = 'RESOLVED' | 'DISMISSED' | 'UNDER_REVIEW';

@Component({
  standalone: true,
  selector: 'app-admin-reports',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reports.component.html',
  styleUrl: './admin-reports.component.scss',
})
export class AdminReportsComponent {
  api = inject(ApiService);

  reports = signal<ReportRow[]>([]);
  loading = signal(true);
  error = signal('');
  actionBusy = signal<string | null>(null);
  actionMessage = signal('');

  // Filters
  statusFilter: 'ALL' | 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' = 'OPEN';
  targetFilter: 'ALL' | 'POST' | 'COMMENT' | 'USER' = 'ALL';

  // Pagination
  page = signal(0);
  size = 20;
  totalPages = signal(0);
  totalElements = signal(0);

  // Resolve dialog
  resolveDialogFor = signal<ReportRow | null>(null);
  resolveDecision: ResolveDecision = 'RESOLVED';
  resolveNote = '';

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');

    this.api
      .adminReports({
        status: this.statusFilter === 'ALL' ? undefined : this.statusFilter,
        targetType: this.targetFilter === 'ALL' ? undefined : this.targetFilter,
        page: this.page(),
        size: this.size,
      })
      .subscribe({
        next: (p: Page<ReportRow>) => {
          this.reports.set(p.content);
          this.totalPages.set(p.totalPages);
          this.totalElements.set(p.totalElements);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(e?.error?.message || 'Failed to load reports.');
          this.loading.set(false);
        },
      });
  }

  applyFilters() {
    this.page.set(0);
    this.load();
  }

  clearFilters() {
    this.statusFilter = 'OPEN';
    this.targetFilter = 'ALL';
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

  /* ---------- Resolve ---------- */

  openResolveDialog(report: ReportRow, decision: ResolveDecision = 'RESOLVED') {
    this.resolveDialogFor.set(report);
    this.resolveDecision = decision;
    this.resolveNote = '';
  }

  cancelResolve() {
    this.resolveDialogFor.set(null);
    this.resolveNote = '';
  }

  confirmResolve() {
    const report = this.resolveDialogFor();
    if (!report) return;

    this.actionBusy.set(report.id);
    this.api
      .adminResolveReport(report.id, this.resolveDecision, this.resolveNote.trim())
      .subscribe({
        next: () => {
          this.actionBusy.set(null);
          this.actionMessage.set(
            `Report ${this.resolveDecision.toLowerCase()}.`
          );
          this.cancelResolve();
          this.load();
        },
        error: (e) => {
          this.actionBusy.set(null);
          this.actionMessage.set(
            e?.error?.message || 'Failed to resolve report.'
          );
        },
      });
  }

  /** Friendly label from reason code. */
  reasonLabel(reason: string): string {
    return reason
      .split(/[_\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  /** Badge tone for status. */
  statusTone(status: string): string {
    switch (status) {
      case 'OPEN': return 'open';
      case 'UNDER_REVIEW': return 'warn';
      case 'RESOLVED': return 'success';
      case 'DISMISSED': return 'dismissed';
      default: return 'neutral';
    }
  }

  /** Badge tone for target type. */
  targetTone(type: string): string {
    switch (type) {
      case 'POST': return 'post';
      case 'COMMENT': return 'comment';
      case 'USER': return 'user';
      default: return 'neutral';
    }
  }
}