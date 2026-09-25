import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { User, Role, Page } from '../../../../core/models/models';

@Component({
  standalone: true,
  selector: 'app-admin-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent {
  api = inject(ApiService);

  users = signal<User[]>([]);
  loading = signal(true);
  error = signal('');
  actionBusy = signal<string | null>(null);
  actionMessage = signal('');

  // Filters
  search = '';
  roleFilter: Role | 'ALL' = 'ALL';
  statusFilter: 'ALL' | 'ACTIVE' | 'SUSPENDED' = 'ALL';

  // Pagination
  page = signal(0);
  size = 20;
  totalPages = signal(0);
  totalElements = signal(0);

  // Dialog state
  suspendDialogFor = signal<User | null>(null);
  suspendReason = '';
  roleDialogFor = signal<User | null>(null);
  roleNewValue: Role = 'MEMBER';
  roleReason = '';

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');

    this.api
      .adminUsers({
        search: this.search || undefined,
        role: this.roleFilter === 'ALL' ? undefined : this.roleFilter,
        enabled:
          this.statusFilter === 'ALL'
            ? undefined
            : this.statusFilter === 'ACTIVE',
        page: this.page(),
        size: this.size,
      })
      .subscribe({
        next: (p: Page<User>) => {
          this.users.set(p.content);
          this.totalPages.set(p.totalPages);
          this.totalElements.set(p.totalElements);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(e?.error?.message || 'Failed to load users.');
          this.loading.set(false);
        },
      });
  }

  applyFilters() {
    this.page.set(0);
    this.load();
  }

  clearFilters() {
    this.search = '';
    this.roleFilter = 'ALL';
    this.statusFilter = 'ALL';
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

  /* ---------- Suspend ---------- */

  openSuspendDialog(user: User) {
    this.suspendDialogFor.set(user);
    this.suspendReason = '';
  }

  cancelSuspend() {
    this.suspendDialogFor.set(null);
    this.suspendReason = '';
  }

  confirmSuspend() {
    const user = this.suspendDialogFor();
    if (!user) return;
    if (!this.suspendReason.trim()) return;

    this.actionBusy.set(user.id);
    this.api.adminSuspendUser(user.id, this.suspendReason.trim()).subscribe({
      next: () => {
        this.actionBusy.set(null);
        this.actionMessage.set(`${user.name} suspended.`);
        this.cancelSuspend();
        this.load();
      },
      error: (e) => {
        this.actionBusy.set(null);
        this.actionMessage.set(
          e?.error?.message || 'Failed to suspend user.'
        );
      },
    });
  }

  /* ---------- Reactivate ---------- */

  reactivate(user: User) {
    this.actionBusy.set(user.id);
    this.api.adminReactivateUser(user.id, 'Reactivated by admin').subscribe({
      next: () => {
        this.actionBusy.set(null);
        this.actionMessage.set(`${user.name} reactivated.`);
        this.load();
      },
      error: (e) => {
        this.actionBusy.set(null);
        this.actionMessage.set(
          e?.error?.message || 'Failed to reactivate user.'
        );
      },
    });
  }

  /* ---------- Change role ---------- */

  openRoleDialog(user: User, targetRole: Role) {
    this.roleDialogFor.set(user);
    this.roleNewValue = targetRole;
    this.roleReason = '';
  }

  cancelRoleChange() {
    this.roleDialogFor.set(null);
    this.roleReason = '';
  }

  confirmRoleChange() {
    const user = this.roleDialogFor();
    if (!user) return;

    this.actionBusy.set(user.id);
    this.api
      .adminChangeRole(user.id, this.roleNewValue, this.roleReason.trim())
      .subscribe({
        next: () => {
          this.actionBusy.set(null);
          this.actionMessage.set(
            `${user.name} is now ${this.roleNewValue}.`
          );
          this.cancelRoleChange();
          this.load();
        },
        error: (e) => {
          this.actionBusy.set(null);
          this.actionMessage.set(
            e?.error?.message || 'Failed to change role.'
          );
        },
      });
  }
}