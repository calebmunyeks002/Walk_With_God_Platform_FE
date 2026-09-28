import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { DailyPrayers, Prayer } from '../../../core/models/models';

@Component({
  standalone: true,
  selector: 'app-prayer',
  imports: [CommonModule],
  templateUrl: './prayer.component.html',
  styleUrl: './prayer.component.scss',
})
export class PrayerComponent {
  private api = inject(ApiService);

  prayers = signal<DailyPrayers>({});
  loading = signal(true);

  constructor() {
    this.api.todaysPrayers().subscribe({
      next: (p) => {
        this.prayers.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isMorning(): boolean {
    return new Date().getHours() < 12;
  }
}