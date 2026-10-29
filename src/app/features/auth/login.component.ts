import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);
  private http = inject(HttpClient);

  email = '';
  password = '';
  remember = false;
  showPassword = false;
  loading = false;
  error = '';

  constructor() {
    this.checkOAuthSession();
  }

  async checkOAuthSession() {
    try {
      const session = await this.supabaseService.getSessionFromUrl();
      if (!session) return;

      this.http.post<{ token: string; user: any }>(
        `${environment.apiUrl}/api/auth/oauth-login`,
        { supabaseToken: session.access_token }
      ).subscribe({
        next: (res) => {
          localStorage.setItem('wwg_token', res.token);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.error = err?.error?.message || 'OAuth login failed.';
        },
      });
    } catch (err) {
      console.error('Failed to check OAuth session', err);
    }
  }

  submit() {
    if (!this.email || !this.password) return;

    this.loading = true;
    this.error = '';

    this.auth.login(this.email, this.password, this.remember).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Invalid email or password.';
      },
    });
  }

  loginWithGoogle() {
    this.supabaseService.signInWithGoogle();
  }

  loginWithApple() {
    this.supabaseService.signInWithApple();
  }
}