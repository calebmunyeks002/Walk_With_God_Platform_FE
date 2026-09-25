import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './auth.scss',
})
export class LoginComponent {
  auth = inject(AuthService);
  router = inject(Router);

  email = '';
  password = '';
  remember = false;

  show = signal(false);
  error = signal('');
  busy = signal(false);

  login() {
    this.busy.set(true);
    this.error.set('');

    this.auth.login(this.email, this.password, this.remember).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.error.set(
          e?.error?.message || 'Unable to sign in. Please check your details.'
        );
        this.busy.set(false);
      },
    });
  }
}