import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../core/services/api.service';

@Component({
  standalone: true,
  selector: 'app-admin-trivia-analytics',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-trivia-analytics.component.html',
  styleUrl: './admin-trivia-analytics.component.scss',
})
export class AdminTriviaAnalyticsComponent {
  api = inject(ApiService);

  overview = signal<any>(null);
  sessions = signal<any[]>([]);
  loading = signal(true);
  error = signal('');

  // Filters
  dateFilter = new Date().toISOString().slice(0, 10);
  difficultyFilter: 'ALL' | 'EASY' | 'MEDIUM' | 'HARD' = 'ALL';
  statusFilter: 'ALL' | 'COMPLETED' | 'PENDING' = 'ALL';
  passFilter: 'ALL' | 'PASSED' | 'FAILED' = 'ALL';
  searchText = '';

  page = signal(0);
  size = 30;
  totalPages = signal(0);
  totalElements = signal(0);

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');

    this.api.adminTriviaOverview(this.dateFilter).subscribe({
      next: (o) => this.overview.set(o),
      error: () => {}
    });

    this.api.adminTriviaSessions({
      date: this.dateFilter,
      difficulty: this.difficultyFilter === 'ALL' ? undefined : this.difficultyFilter,
      completed:
        this.statusFilter === 'ALL' ? undefined : this.statusFilter === 'COMPLETED',
      passed:
        this.passFilter === 'ALL' ? undefined : this.passFilter === 'PASSED',
      search: this.searchText.trim() || undefined,
      page: this.page(),
      size: this.size,
    }).subscribe({
      next: (p) => {
        this.sessions.set(p.content);
        this.totalPages.set(p.totalPages);
        this.totalElements.set(p.totalElements);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Failed to load');
        this.loading.set(false);
      }
    });
  }

  applyFilters() {
    this.page.set(0);
    this.load();
  }

  clearFilters() {
    this.difficultyFilter = 'ALL';
    this.statusFilter = 'ALL';
    this.passFilter = 'ALL';
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

  pct(v: number): string {
    return `${Math.round((v || 0) * 100)}%`;
  }
}