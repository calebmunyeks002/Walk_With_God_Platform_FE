import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';

interface MenteeView {
  requestId: string;
  member: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
    bio?: string | null;
    createdAt?: string;
  };
  since: string | null;
  lastMessage: string | null;
  status: 'ACCEPTED' | 'COMPLETED';
}

@Component({
  standalone: true,
  selector: 'app-mentor-mentees',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mentor-mentees.component.html',
  styleUrl: './mentor-mentees.component.scss',
})
export class MentorMenteesComponent {
  api = inject(ApiService);

  mentees = signal<MenteeView[]>([]);
  loading = signal(true);
  error = signal('');
  actionMessage = signal('');

  searchText = '';
  statusFilter: 'ALL' | 'ACCEPTED' | 'COMPLETED' = 'ALL';
  sortBy: 'RECENT' | 'OLDEST' | 'NAME' = 'RECENT';

  stats = signal({ active: 0, completed: 0, total: 0 });

  visibleMentees = computed(() => {
    let list = this.mentees();

    if (this.statusFilter !== 'ALL') {
      list = list.filter((m) => m.status === this.statusFilter);
    }

    const q = this.searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.member.name.toLowerCase().includes(q) ||
          m.member.email.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (this.sortBy === 'RECENT') {
      sorted.sort(
        (a, b) =>
          new Date(b.since ?? 0).getTime() - new Date(a.since ?? 0).getTime()
      );
    } else if (this.sortBy === 'OLDEST') {
      sorted.sort(
        (a, b) =>
          new Date(a.since ?? 0).getTime() - new Date(b.since ?? 0).getTime()
      );
    } else if (this.sortBy === 'NAME') {
      sorted.sort((a, b) => a.member.name.localeCompare(b.member.name));
    }
    return sorted;
  });

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');

    this.api.mentorMentees().subscribe({
      next: (list) => {
        this.mentees.set(list);
        this.stats.set({
          active: list.filter((m: MenteeView) => m.status === 'ACCEPTED').length,
          completed: list.filter((m: MenteeView) => m.status === 'COMPLETED').length,
          total: list.length,
        });
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Failed to load mentees.');
        this.loading.set(false);
      },
    });
  }

  timeAgo(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const days = Math.floor(diffMs / 86400000);
    if (days < 1) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    return d.toLocaleDateString();
  }
}