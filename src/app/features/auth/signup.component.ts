import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './auth.scss',
})
export class SignupComponent {
  auth = inject(AuthService);
  router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirm = '';
  agree = false;

  error = signal('');
  busy = signal(false);

  submit() {
    if (this.password !== this.confirm) {
      this.error.set('Passwords do not match.');
      return;
    }

    if (!this.agree) {
      this.error.set('Please accept the community guidelines.');
      return;
    }

    this.busy.set(true);

    this.auth
      .register({
        name: this.name,
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (e) => {
          this.error.set(e?.error?.message || 'Registration failed.');
          this.busy.set(false);
        },
      });
  }
}