import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AdminMedia } from '../../../../core/models/models';

@Component({
  standalone: true,
  selector: 'app-admin-media-review',
  imports: [CommonModule],
  templateUrl: './admin-media-review.component.html',
  styleUrl: './admin-media-review.component.scss',
})
export class AdminMediaReviewComponent implements OnInit {
  private http = inject(HttpClient);

  items = signal<AdminMedia[]>([]);
  loading = signal(false);
  filter = signal<'FLAGGED' | 'PENDING' | 'REJECTED' | 'APPROVED'>('FLAGGED');
  counts = signal<Record<string, number>>({});

  readonly filters = ['FLAGGED', 'PENDING', 'REJECTED', 'APPROVED'] as const;

  ngOnInit(): void {
    this.load();
    this.loadCounts();
  }

  load() {
    this.loading.set(true);
    this.http
      .get<{ content: AdminMedia[] }>(`/api/admin/media?status=${this.filter()}&size=50`)
      .subscribe({
        next: (r) => { this.items.set(r.content); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  loadCounts() {
    this.http.get<Record<string, number>>('/api/admin/media/counts').subscribe({
      next: (c) => this.counts.set(c),
    });
  }

    setFilter(f: 'FLAGGED' | 'PENDING' | 'REJECTED' | 'APPROVED') {
    this.filter.set(f);
    this.load();
  }

  rawUrl(id: string) {
    return `/api/media/${id}/raw`;
  }

  approve(m: AdminMedia) {
    this.http.post(`/api/admin/media/${m.id}/approve`, {}).subscribe({
      next: () => {
        this.items.update((list) => list.filter((x) => x.id !== m.id));
        this.loadCounts();
      },
    });
  }

  reject(m: AdminMedia) {
    const reason = prompt('Reason for rejection?', 'Content violates community guidelines');
    if (!reason) return;
    this.http.post(`/api/admin/media/${m.id}/reject`, { reason }).subscribe({
      next: () => {
        this.items.update((list) => list.filter((x) => x.id !== m.id));
        this.loadCounts();
      },
    });
  }

  hardDelete(m: AdminMedia) {
    if (!confirm('Permanently delete this file? This cannot be undone.')) return;
    this.http.delete(`/api/admin/media/${m.id}`).subscribe({
      next: () => {
        this.items.update((list) => list.filter((x) => x.id !== m.id));
        this.loadCounts();
      },
    });
  }

  humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}