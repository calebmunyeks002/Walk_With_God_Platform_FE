import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';

interface MentorRequestView {
  id: string;
  member: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
    bio?: string | null;
    createdAt?: string;
  };
  message: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED';
  respondedAt: string | null;
  responseNote: string | null;
  createdAt: string;
}

@Component({
  standalone: true,
  selector: 'app-mentor-requests',
  imports: [CommonModule, FormsModule],
  templateUrl: './mentor-requests.component.html',
  styleUrl: './mentor-requests.component.scss',
})
export class MentorRequestsComponent {
  api = inject(ApiService);
  auth = inject(AuthService);
  private router = inject(Router);

  requests = signal<MentorRequestView[]>([]);
  history = signal<MentorRequestView[]>([]);
  loading = signal(true);
  loadingHistory = signal(false);
  error = signal('');
  actionBusy = signal<string | null>(null);
  actionMessage = signal('');

  // Filters
  searchText = '';
  statusFilter: 'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' = 'PENDING';
  sortBy: 'NEWEST' | 'OLDEST' | 'NAME' = 'NEWEST';

  // Dialogs
  acceptDialogFor = signal<MentorRequestView | null>(null);
  acceptNote = '';
  declineDialogFor = signal<MentorRequestView | null>(null);
  declineReason = '';

  /** Combine pending + history for the "all" view. */
  allRequests = computed(() => [...this.requests(), ...this.history()]);

  /** Filtered + sorted list based on current filters. */
  visibleRequests = computed(() => {
    let list: MentorRequestView[];

    if (this.statusFilter === 'PENDING') {
      list = this.requests();
    } else if (this.statusFilter === 'ALL') {
      list = this.allRequests();
    } else {
      list = this.allRequests().filter((r) => r.status === this.statusFilter);
    }

    const q = this.searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.member.name.toLowerCase().includes(q) ||
          r.member.email.toLowerCase().includes(q) ||
          (r.message ?? '').toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (this.sortBy === 'NEWEST') {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (this.sortBy === 'OLDEST') {
      sorted.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (this.sortBy === 'NAME') {
      sorted.sort((a, b) => a.member.name.localeCompare(b.member.name));
    }
    return sorted;
  });

  counts = computed(() => {
    const all = this.allRequests();
    return {
      pending: all.filter((r) => r.status === 'PENDING').length,
      accepted: all.filter((r) => r.status === 'ACCEPTED').length,
      declined: all.filter((r) => r.status === 'DECLINED').length,
      completed: all.filter((r) => r.status === 'COMPLETED').length,
    };
  });

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');

    this.api.mentorRequests().subscribe({
      next: (list) => {
        this.requests.set(list);
        this.loading.set(false);
        this.loadHistory();
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Failed to load requests.');
        this.loading.set(false);
      },
    });
  }

  loadHistory() {
    this.loadingHistory.set(true);
    this.api.mentorRequestHistory().subscribe({
      next: (list) => {
        this.history.set(list);
        this.loadingHistory.set(false);
      },
      error: () => {
        this.loadingHistory.set(false);
      },
    });
  }

  /* ---------- Accept ---------- */

  openAcceptDialog(r: MentorRequestView) {
    this.acceptDialogFor.set(r);
    this.acceptNote = '';
  }

  cancelAccept() {
    this.acceptDialogFor.set(null);
    this.acceptNote = '';
  }

  confirmAccept() {
    const req = this.acceptDialogFor();
    if (!req) return;

    this.actionBusy.set(req.id);
    this.api.mentorAcceptRequest(req.id, this.acceptNote.trim() || undefined).subscribe({
      next: () => {
        this.actionBusy.set(null);
        this.actionMessage.set(`${req.member.name} is now your mentee.`);
        this.cancelAccept();
        this.load();
      },
      error: (e) => {
        this.actionBusy.set(null);
        this.actionMessage.set(e?.error?.message || 'Failed to accept.');
      },
    });
  }

  /* ---------- Decline ---------- */

  openDeclineDialog(r: MentorRequestView) {
    this.declineDialogFor.set(r);
    this.declineReason = '';
  }

  cancelDecline() {
    this.declineDialogFor.set(null);
    this.declineReason = '';
  }

  confirmDecline() {
    const req = this.declineDialogFor();
    if (!req || !this.declineReason.trim()) return;

    this.actionBusy.set(req.id);
    this.api.mentorDeclineRequest(req.id, this.declineReason.trim()).subscribe({
      next: () => {
        this.actionBusy.set(null);
        this.actionMessage.set(`Declined request from ${req.member.name}.`);
        this.cancelDecline();
        this.load();
      },
      error: (e) => {
        this.actionBusy.set(null);
        this.actionMessage.set(e?.error?.message || 'Failed to decline.');
      },
    });
  }

  /* ---------- Chat with mentee (NEW) ---------- */

  openChat(memberUserId: string) {
    if (!memberUserId) return;
    this.router.navigate(['/inbox'], {
      queryParams: { user: memberUserId },
    });
  }

  /* ---------- Helpers ---------- */

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING':   return 'status-pending';
      case 'ACCEPTED':  return 'status-accepted';
      case 'DECLINED':  return 'status-declined';
      case 'COMPLETED': return 'status-completed';
      default:          return '';
    }
  }

  timeAgo(iso: string): string {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  }
}