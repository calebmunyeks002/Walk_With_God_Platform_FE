import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { Page } from '../../../../core/models/models';

interface AdminDevotion {
  id: string;
  title: string;
  scripture: string;
  body: string;
  authorId: string;
  authorName: string;
  published: boolean;
  featured: boolean;
  hidden: boolean;
  hiddenReason?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  createdAt: string;
}

interface DevotionForm {
  title: string;
  scripture: string;
  body: string;
  published: boolean;
  featured: boolean;
}

@Component({
  standalone: true,
  selector: 'app-admin-devotions',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-devotions.component.html',
  styleUrl: './admin-devotions.component.scss',
})
export class AdminDevotionsComponent {
  api = inject(ApiService);

  devotions = signal<AdminDevotion[]>([]);
  loading = signal(true);
  error = signal('');
  actionBusy = signal<string | null>(null);
  actionMessage = signal('');

  // Filters
  searchText = '';
  publishedFilter: 'ALL' | 'PUBLISHED' | 'DRAFT' = 'ALL';
  visibilityFilter: 'ALL' | 'VISIBLE' | 'HIDDEN' = 'ALL';
  featuredFilter: 'ALL' | 'FEATURED' | 'NORMAL' = 'ALL';

  // Pagination
  page = signal(0);
  size = 12;
  totalPages = signal(0);
  totalElements = signal(0);

  // Editor modal
  editorOpen = signal(false);
  editorEditing = signal<AdminDevotion | null>(null);
  form: DevotionForm = emptyForm();
  formError = signal('');

  // Delete dialog
  deleteDialogFor = signal<AdminDevotion | null>(null);
  deleteReason = '';

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');

    this.api
      .adminDevotions({
        published:
          this.publishedFilter === 'ALL'
            ? undefined
            : this.publishedFilter === 'PUBLISHED',
        hidden:
          this.visibilityFilter === 'ALL'
            ? undefined
            : this.visibilityFilter === 'HIDDEN',
        featured:
          this.featuredFilter === 'ALL'
            ? undefined
            : this.featuredFilter === 'FEATURED',
        search: this.searchText.trim() || undefined,
        page: this.page(),
        size: this.size,
      })
      .subscribe({
        next: (p: Page<AdminDevotion>) => {
          this.devotions.set(p.content);
          this.totalPages.set(p.totalPages);
          this.totalElements.set(p.totalElements);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(e?.error?.message || 'Failed to load devotions.');
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
    this.publishedFilter = 'ALL';
    this.visibilityFilter = 'ALL';
    this.featuredFilter = 'ALL';
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

  /* =========================================================
     Editor
     ========================================================= */

  openCreate() {
    this.editorEditing.set(null);
    this.form = emptyForm();
    this.formError.set('');
    this.editorOpen.set(true);
  }

  openEdit(devotion: AdminDevotion) {
    this.editorEditing.set(devotion);
    this.form = {
      title: devotion.title,
      scripture: devotion.scripture,
      body: devotion.body,
      published: devotion.published,
      featured: devotion.featured,
    };
    this.formError.set('');
    this.editorOpen.set(true);
  }

  closeEditor() {
    this.editorOpen.set(false);
    this.editorEditing.set(null);
    this.formError.set('');
  }

  saveEditor() {
    // Validation
    if (!this.form.title.trim()) {
      this.formError.set('Title is required.');
      return;
    }
    if (!this.form.scripture.trim()) {
      this.formError.set('Scripture reference is required.');
      return;
    }
    if (!this.form.body.trim()) {
      this.formError.set('Body is required.');
      return;
    }

    const editing = this.editorEditing();
    this.formError.set('');

    if (editing) {
      this.actionBusy.set(editing.id);
      this.api
        .adminUpdateDevotion(editing.id, {
          title: this.form.title.trim(),
          scripture: this.form.scripture.trim(),
          body: this.form.body.trim(),
          published: this.form.published,
          featured: this.form.featured,
        })
        .subscribe({
          next: () => {
            this.actionBusy.set(null);
            this.actionMessage.set('Devotion updated.');
            this.closeEditor();
            this.load();
          },
          error: (e) => {
            this.actionBusy.set(null);
            this.formError.set(e?.error?.message || 'Failed to update.');
          },
        });
    } else {
      this.actionBusy.set('new');
      this.api
        .adminCreateDevotion({
          title: this.form.title.trim(),
          scripture: this.form.scripture.trim(),
          body: this.form.body.trim(),
          published: this.form.published,
          featured: this.form.featured,
        })
        .subscribe({
          next: () => {
            this.actionBusy.set(null);
            this.actionMessage.set('Devotion created.');
            this.closeEditor();
            this.load();
          },
          error: (e) => {
            this.actionBusy.set(null);
            this.formError.set(e?.error?.message || 'Failed to create.');
          },
        });
    }
  }

  /* =========================================================
     Quick actions
     ========================================================= */

  togglePublish(devotion: AdminDevotion) {
    this.actionBusy.set(devotion.id);
    this.api
      .adminUpdateDevotion(devotion.id, { published: !devotion.published })
      .subscribe({
        next: () => {
          this.actionBusy.set(null);
          this.actionMessage.set(
            devotion.published ? 'Devotion unpublished.' : 'Devotion published.'
          );
          this.load();
        },
        error: (e) => {
          this.actionBusy.set(null);
          this.actionMessage.set(e?.error?.message || 'Failed to toggle publish.');
        },
      });
  }

  toggleFeature(devotion: AdminDevotion) {
    this.actionBusy.set(devotion.id);
    this.api
      .adminUpdateDevotion(devotion.id, { featured: !devotion.featured })
      .subscribe({
        next: () => {
          this.actionBusy.set(null);
          this.actionMessage.set(
            devotion.featured ? 'Unfeatured.' : 'Marked as featured.'
          );
          this.load();
        },
        error: (e) => {
          this.actionBusy.set(null);
          this.actionMessage.set(e?.error?.message || 'Failed to toggle feature.');
        },
      });
  }

  /* =========================================================
     Delete (soft)
     ========================================================= */

  openDeleteDialog(devotion: AdminDevotion) {
    this.deleteDialogFor.set(devotion);
    this.deleteReason = '';
  }

  cancelDelete() {
    this.deleteDialogFor.set(null);
    this.deleteReason = '';
  }

  confirmDelete() {
    const devotion = this.deleteDialogFor();
    if (!devotion || !this.deleteReason.trim()) return;

    this.actionBusy.set(devotion.id);
    this.api
      .adminDeleteDevotion(devotion.id, this.deleteReason.trim())
      .subscribe({
        next: () => {
          this.actionBusy.set(null);
          this.actionMessage.set('Devotion hidden.');
          this.cancelDelete();
          this.load();
        },
        error: (e) => {
          this.actionBusy.set(null);
          this.actionMessage.set(e?.error?.message || 'Failed to hide.');
        },
      });
  }

  /* =========================================================
     Helpers
     ========================================================= */

  preview(body: string): string {
    return body.length <= 180 ? body : body.slice(0, 180) + '…';
  }
}

function emptyForm(): DevotionForm {
  return {
    title: '',
    scripture: '',
    body: '',
    published: true,
    featured: false,
  };
}