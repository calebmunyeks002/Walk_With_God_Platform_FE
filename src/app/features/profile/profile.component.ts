import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent {
  auth = inject(AuthService);
  api = inject(ApiService);

  name = '';
  bio = '';
  saved = signal(false);
  error = signal('');

  constructor() {
    const u = this.auth.user();
    this.name = u?.name || '';
    this.bio = u?.bio || '';
  }

  save() {
    this.error.set('');

    this.api.put('/users/me', { name: this.name, bio: this.bio }).subscribe({
      next: () => {
        this.saved.set(true);
        // Refresh the user signal so the header updates immediately
        this.auth.refreshUser();
        setTimeout(() => this.saved.set(false), 2500);
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Failed to save profile.');
      },
    });
  }
}