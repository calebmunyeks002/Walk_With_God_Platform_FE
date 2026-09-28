import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent {
  auth = inject(AuthService);
  api = inject(ApiService);

  bio = '';
  saved = signal(false);
  bioError = signal('');
  savingBio = signal(false);

  // Password form
  pwOpen = signal(false);
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  pwError = signal('');
  pwSuccess = signal(false);
  savingPw = signal(false);

  constructor() {
    this.bio = this.auth.user()?.bio ?? '';
  }

  /* ---------- Bio save ---------- */

  saveBio() {
    this.savingBio.set(true);
    this.bioError.set('');

    // Backend only accepts `bio` — name/email are ignored if sent
    this.api.put('/users/me', { bio: this.bio }).subscribe({
      next: () => {
        this.savingBio.set(false);
        this.saved.set(true);
        this.auth.refreshUser();
        setTimeout(() => this.saved.set(false), 2500);
      },
      error: (e) => {
        this.savingBio.set(false);
        this.bioError.set(e?.error?.message || 'Failed to save bio.');
      },
    });
  }

  /* ---------- Password change ---------- */

  togglePasswordForm() {
    this.pwOpen.update((v) => !v);
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.pwError.set('');
    this.pwSuccess.set(false);
  }

  changePassword() {
    this.pwError.set('');
    this.pwSuccess.set(false);

    if (!this.currentPassword || !this.newPassword) {
      this.pwError.set('Please fill in all fields.');
      return;
    }
    if (this.newPassword.length < 8) {
      this.pwError.set('New password must be at least 8 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.pwError.set('New passwords do not match.');
      return;
    }

    this.savingPw.set(true);
    this.api.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.savingPw.set(false);
        this.pwSuccess.set(true);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        setTimeout(() => this.pwOpen.set(false), 2000);
      },
      error: (e) => {
        this.savingPw.set(false);
        this.pwError.set(e?.error?.message || 'Failed to change password.');
      },
    });
  }
}