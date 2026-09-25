import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { Page } from '../../../../core/models/models';

interface AdminPost {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  scriptureReference?: string | null;
  imageUrl?: string | null;
  hidden: boolean;
  hiddenReason?: string | null;
  hiddenAt?: string | null;
  reportCount: number;
  createdAt: string;
}

@Component({
  standalone: true,
  selector: 'app-admin-posts',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-posts.component.html',
  styleUrl: './admin-posts.component.scss',
})
export class AdminPostsComponent {
  api = inject(ApiService);

  posts = signal<AdminPost[]>([]);
  loading = signal(true);
  error = signal('');
  actionBusy = signal<string | null>(null);
  actionMessage = signal('');

  // Filters
  searchText = '';
  visibilityFilter: 'ALL' | 'VISIBLE' | 'HIDDEN' = 'ALL';

  // Pagination
  page = signal(0);
  size = 20;
  totalPages = signal(0);
  totalElements = signal(0);

  // Delete dialog
  deleteDialogFor = signal<AdminPost | null>(null);
  deleteReason = '';

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');

    this.api
      .adminPosts({
        hidden:
          this.visibilityFilter === 'ALL'
            ? undefined
            : this.visibilityFilter === 'HIDDEN',
        search: this.searchText.trim() || undefined,
        page: this.page(),
        size: this.size,
      })
      .subscribe({
        next: (p: Page<AdminPost>) => {
          this.posts.set(p.content);
          this.totalPages.set(p.totalPages);
          this.totalElements.set(p.totalElements);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(e?.error?.message || 'Failed to load posts.');
          this.loading.set(false);
        },
      });
  }

  applyFilters() {
    this.page.set(0);
    this.load();
  }

  clearFilters() {
    this.searchText = '';
    this.visibilityFilter = 'ALL';
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

  /* ---------- Hide (soft delete) ---------- */

  openDeleteDialog(post: AdminPost) {
    this.deleteDialogFor.set(post);
    this.deleteReason = '';
  }

  cancelDelete() {
    this.deleteDialogFor.set(null);
    this.deleteReason = '';
  }

  confirmDelete() {
    const post = this.deleteDialogFor();
    if (!post || !this.deleteReason.trim()) return;

    this.actionBusy.set(post.id);
    this.api.adminDeletePost(post.id, this.deleteReason.trim()).subscribe({
      next: () => {
        this.actionBusy.set(null);
        this.actionMessage.set('Post hidden.');
        this.cancelDelete();
        this.load();
      },
      error: (e) => {
        this.actionBusy.set(null);
        this.actionMessage.set(e?.error?.message || 'Failed to hide post.');
      },
    });
  }

  /* ---------- Restore ---------- */

  restore(post: AdminPost) {
    this.actionBusy.set(post.id);
    this.api.adminRestorePost(post.id, 'Restored by admin').subscribe({
      next: () => {
        this.actionBusy.set(null);
        this.actionMessage.set('Post restored.');
        this.load();
      },
      error: (e) => {
        this.actionBusy.set(null);
        this.actionMessage.set(
          e?.error?.message || 'Failed to restore post.'
        );
      },
    });
  }

  /** Show a compact preview of post content. */
  preview(content: string): string {
    return content.length <= 180 ? content : content.slice(0, 180) + '…';
  }
}