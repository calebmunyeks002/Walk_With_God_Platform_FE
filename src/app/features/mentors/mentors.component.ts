import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface MentorView {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
    bio?: string | null;
    createdAt?: string;
  };
  denomination?: string | null;
  church?: string | null;
  specialties: string[];
  bio?: string | null;
  yearsExperience: number;
  verified: boolean;
  rating?: number | null;
}

@Component({
  standalone: true,
  selector: 'app-mentors',
  imports: [CommonModule, FormsModule],
  templateUrl: './mentors.component.html',
  styleUrl: './mentors.scss',
})
export class MentorsComponent {
  api = inject(ApiService);
  auth = inject(AuthService);

  mentors = signal<MentorView[]>([]);
  loading = signal(true);
  error = signal('');
  requestMessage = signal('');
  sending = signal(false);
  actionMessage = signal('');

  // Filters
  searchText = '';
  specialtyFilter = 'ALL';
  experienceFilter: 'ALL' | '0-5' | '5-10' | '10+' = 'ALL';
  sortBy: 'NAME' | 'EXPERIENCE' | 'RATING' = 'NAME';

  // Request dialog
  requestDialogFor = signal<MentorView | null>(null);
  requestNote = '';

  /** True if the current user is a mentor (has a mentor profile). */
  isMentor = computed(() => this.auth.user()?.role === 'MENTOR');

  /** True if this mentor profile belongs to the current user. */
  isOwnProfile = (m: MentorView): boolean =>
    m.user.id === this.auth.user()?.id;

  /** All specialties across the directory (for the filter dropdown). */
  allSpecialties = computed(() => {
    const set = new Set<string>();
    this.mentors().forEach((m) =>
      m.specialties?.forEach((s) => set.add(s))
    );
    return ['ALL', ...Array.from(set).sort()];
  });

  /** Filtered + sorted list, own profile first. */
  visibleMentors = computed(() => {
    let list = [...this.mentors()];

    // Search by name, church, or specialty
    const q = this.searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.user.name.toLowerCase().includes(q) ||
          (m.church ?? '').toLowerCase().includes(q) ||
          (m.specialties ?? []).some((s) => s.toLowerCase().includes(q))
      );
    }

    // Specialty filter
    if (this.specialtyFilter !== 'ALL') {
      list = list.filter((m) =>
        (m.specialties ?? []).includes(this.specialtyFilter)
      );
    }

    // Experience filter
    if (this.experienceFilter !== 'ALL') {
      list = list.filter((m) => {
        const y = m.yearsExperience ?? 0;
        if (this.experienceFilter === '0-5') return y >= 0 && y <= 5;
        if (this.experienceFilter === '5-10') return y > 5 && y <= 10;
        if (this.experienceFilter === '10+') return y > 10;
        return true;
      });
    }

    // Sort
    if (this.sortBy === 'NAME') {
      list.sort((a, b) => a.user.name.localeCompare(b.user.name));
    } else if (this.sortBy === 'EXPERIENCE') {
      list.sort((a, b) => (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0));
    } else if (this.sortBy === 'RATING') {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    // Own profile always first
    const myId = this.auth.user()?.id;
    if (myId) {
      list.sort((a, b) => {
        const aIsMe = a.user.id === myId ? 0 : 1;
        const bIsMe = b.user.id === myId ? 0 : 1;
        return aIsMe - bIsMe;
      });
    }

    return list;
  });

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.mentors().subscribe({
      next: (list) => {
        this.mentors.set(list as MentorView[]);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Failed to load mentors.');
        this.loading.set(false);
      },
    });
  }

  openRequestDialog(m: MentorView) {
    // Safety guard — don't open for own profile
    if (this.isOwnProfile(m)) return;
    this.requestDialogFor.set(m);
    this.requestNote = '';
  }

  cancelRequest() {
    this.requestDialogFor.set(null);
    this.requestNote = '';
  }

  confirmRequest() {
    const mentor = this.requestDialogFor();
    if (!mentor) return;

    this.sending.set(true);
    this.api.requestMentor(mentor.id, this.requestNote.trim()).subscribe({
      next: () => {
        this.sending.set(false);
        this.actionMessage.set(
          `Request sent to ${mentor.user.name}. They'll respond in your inbox.`
        );
        this.cancelRequest();
      },
      error: (e) => {
        this.sending.set(false);
        this.actionMessage.set(
          e?.error?.message || 'Failed to send request.'
        );
      },
    });
  }
}