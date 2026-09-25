import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { Page } from '../../../../core/models/models';

interface AdminTrivia {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string | null;
  difficulty: string;
  hidden: boolean;
  hiddenReason?: string | null;
  hiddenAt?: string | null;
  updatedAt?: string | null;
  createdAt: string;
}

interface TriviaForm {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

@Component({
  standalone: true,
  selector: 'app-admin-trivia',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-trivia.component.html',
  styleUrl: './admin-trivia.component.scss',
})
export class AdminTriviaComponent {
  api = inject(ApiService);

  questions = signal<AdminTrivia[]>([]);
  loading = signal(true);
  error = signal('');
  actionBusy = signal<string | null>(null);
  actionMessage = signal('');

  // Filters
  searchText = '';
  difficultyFilter: 'ALL' | Difficulty = 'ALL';
  visibilityFilter: 'ALL' | 'VISIBLE' | 'HIDDEN' = 'ALL';

  // Pagination
  page = signal(0);
  size = 15;
  totalPages = signal(0);
  totalElements = signal(0);

  // Editor modal
  editorOpen = signal(false);
  editorEditing = signal<AdminTrivia | null>(null);
  form: TriviaForm = emptyForm();
  formError = signal('');

  // Delete dialog
  deleteDialogFor = signal<AdminTrivia | null>(null);
  deleteReason = '';

  readonly letterLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');

    this.api
      .adminTrivia({
        difficulty: this.difficultyFilter === 'ALL' ? undefined : this.difficultyFilter,
        hidden:
          this.visibilityFilter === 'ALL'
            ? undefined
            : this.visibilityFilter === 'HIDDEN',
        search: this.searchText.trim() || undefined,
        page: this.page(),
        size: this.size,
      })
      .subscribe({
        next: (p: Page<AdminTrivia>) => {
          this.questions.set(p.content);
          this.totalPages.set(p.totalPages);
          this.totalElements.set(p.totalElements);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(e?.error?.message || 'Failed to load trivia.');
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
    this.difficultyFilter = 'ALL';
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

  /* =========================================================
     Editor
     ========================================================= */

  openCreate() {
    this.editorEditing.set(null);
    this.form = emptyForm();
    this.formError.set('');
    this.editorOpen.set(true);
  }

  openEdit(q: AdminTrivia) {
    this.editorEditing.set(q);
    this.form = {
      question: q.question,
      options: [...q.options],
      answerIndex: q.answerIndex,
      explanation: q.explanation ?? '',
      difficulty: q.difficulty as Difficulty,
    };
    this.formError.set('');
    this.editorOpen.set(true);
  }

  closeEditor() {
    this.editorOpen.set(false);
    this.editorEditing.set(null);
    this.formError.set('');
  }

  /** Add a new empty option. */
  addOption() {
    if (this.form.options.length < 6) {
      this.form.options.push('');
    }
  }

  /** Remove the option at index and fix answerIndex if needed. */
  removeOption(index: number) {
    if (this.form.options.length <= 2) return;
    this.form.options.splice(index, 1);
    if (this.form.answerIndex >= this.form.options.length) {
      this.form.answerIndex = 0;
    } else if (this.form.answerIndex > index) {
      this.form.answerIndex--;
    }
  }

  /** Track-by function for options ngFor. */
  trackByIndex(i: number): number {
    return i;
  }

  saveEditor() {
    // Validation
    if (!this.form.question.trim()) {
      this.formError.set('Question is required.');
      return;
    }
    if (this.form.options.length < 2) {
      this.formError.set('At least 2 options are required.');
      return;
    }
    if (this.form.options.some((o) => !o.trim())) {
      this.formError.set('All options must be filled in.');
      return;
    }
    if (this.form.answerIndex < 0 || this.form.answerIndex >= this.form.options.length) {
      this.formError.set('Please select the correct answer.');
      return;
    }

    const payload = {
      question: this.form.question.trim(),
      options: this.form.options.map((o) => o.trim()),
      answerIndex: this.form.answerIndex,
      explanation: this.form.explanation.trim() || undefined,
      difficulty: this.form.difficulty,
    };

    const editing = this.editorEditing();
    this.formError.set('');

    if (editing) {
      this.actionBusy.set(editing.id);
      this.api.adminUpdateTrivia(editing.id, payload).subscribe({
        next: () => {
          this.actionBusy.set(null);
          this.actionMessage.set('Question updated.');
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
      this.api.adminCreateTrivia(payload).subscribe({
        next: () => {
          this.actionBusy.set(null);
          this.actionMessage.set('Question created.');
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
     Delete (soft)
     ========================================================= */

  openDeleteDialog(q: AdminTrivia) {
    this.deleteDialogFor.set(q);
    this.deleteReason = '';
  }

  cancelDelete() {
    this.deleteDialogFor.set(null);
    this.deleteReason = '';
  }

  confirmDelete() {
    const q = this.deleteDialogFor();
    if (!q || !this.deleteReason.trim()) return;

    this.actionBusy.set(q.id);
    this.api.adminDeleteTrivia(q.id, this.deleteReason.trim()).subscribe({
      next: () => {
        this.actionBusy.set(null);
        this.actionMessage.set('Question hidden.');
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

  /** Difficulty badge color class. */
  difficultyClass(d: string): string {
    switch (d) {
      case 'EASY': return 'diff-easy';
      case 'MEDIUM': return 'diff-medium';
      case 'HARD': return 'diff-hard';
      default: return '';
    }
  }

  /** Truncate the question for card display. */
  preview(text: string): string {
    return text.length <= 140 ? text : text.slice(0, 140) + '…';
  }
}

function emptyForm(): TriviaForm {
  return {
    question: '',
    options: ['', '', '', ''],
    answerIndex: 0,
    explanation: '',
    difficulty: 'EASY',
  };
}