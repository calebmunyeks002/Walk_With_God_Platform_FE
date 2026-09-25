import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Post } from '../../../../core/models/models';

interface UserStats {
  dayStreak: number;
  versesRead: number;
  devotionsRead: number;
  postsCreated: number;
  triviaAnswered: number;
  chaptersRead: number;
  highlights: number;
  triviaPassedTotal: number;
  triviaPassedToday: number;
  triviaPassedTodayEasy: boolean;
  triviaPassedTodayMedium: boolean;
  triviaPassedTodayHard: boolean;
}
@Component({
  standalone: true,
  selector: 'app-member-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './member-dashboard.component.html',
  styleUrl: './member-dashboard.component.scss',
})
export class MemberDashboardComponent {
  api = inject(ApiService);
  auth = inject(AuthService);

  posts = signal<Post[]>([]);
  loading = signal(true);

    stats = signal<UserStats>({
    dayStreak: 0,
    versesRead: 0,
    devotionsRead: 0,
    postsCreated: 0,
    triviaAnswered: 0,
    chaptersRead: 0,
    highlights: 0,
    triviaPassedTotal: 0,
    triviaPassedToday: 0,
    triviaPassedTodayEasy: false,
    triviaPassedTodayMedium: false,
    triviaPassedTodayHard: false,
  });
  
  triviaTodayCount = computed(() => {
    const s = this.stats();
    return [
      s.triviaPassedTodayEasy,
      s.triviaPassedTodayMedium,
      s.triviaPassedTodayHard,
    ].filter(Boolean).length;
  });

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  });

  firstName = computed(() => {
    const name = this.auth.user()?.name ?? '';
    return name.split(' ')[0] || 'friend';
  });

  greetingEmoji = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅';
    if (hour < 17) return '☀️';
    if (hour < 21) return '🌆';
    return '🌙';
  });

  constructor() {
    this.api.posts().subscribe({
      next: (r) => {
        this.posts.set(r.content);
        this.loading.set(false);
      },
      error: () => {
        this.posts.set([]);
        this.loading.set(false);
      },
    });

    this.api.myStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => {
        /* keep defaults on error */
      },
    });
  }
}