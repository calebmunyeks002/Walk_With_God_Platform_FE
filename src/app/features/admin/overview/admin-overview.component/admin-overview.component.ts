import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SystemStats } from '../../../../core/models/models';

@Component({
  standalone: true,
  selector: 'app-admin-overview',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.scss',
})
export class AdminOverviewComponent {
  api = inject(ApiService);
  auth = inject(AuthService);

  stats = signal<SystemStats | null>(null);
  loading = signal(true);
  error = signal('');

  constructor() {
    this.api.adminStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Unable to load system stats.');
        this.loading.set(false);
      },
    });
  }
}