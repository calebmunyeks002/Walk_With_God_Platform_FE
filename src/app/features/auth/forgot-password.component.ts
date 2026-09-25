import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <section class="auth-visual">
        <div class="visual-bg"></div>
        <div class="visual-overlay"></div>

        <div class="visual-content">
          <div class="brand-top">
            <span>✝</span>
            <strong>Walk<span>With</span>God</strong>
          </div>

          <div class="hero-copy">
            <h1>Come back to<br /><em>your journey.</em></h1>
            <p>Your faith journey matters. We’ll help you get back into the community.</p>
          </div>
        </div>
      </section>

      <section class="auth-panel">
        <div class="auth-card compact">
          <h2>Reset Password</h2>
          <div class="accent"></div>
          <p class="sub">Enter your email and we’ll send instructions to reset your password.</p>

          <form (ngSubmit)="sent.set(true)">
            <label>
              ✉
              <input
                name="email"
                [(ngModel)]="email"
                type="email"
                required
                placeholder="Email address"
              />
            </label>
            <button class="primary">Send Reset Link  →</button>
          </form>

          <div class="success" *ngIf="sent()">
            If an account exists for this email, reset instructions have been sent.
          </div>

          <p class="signup-line">
            <a routerLink="/login">← Back to Log In</a>
          </p>
        </div>
      </section>
    </div>
  `,
  styleUrl: './auth.scss',
})
export class ForgotPasswordComponent {
  email = '';
  sent = signal(false);
}