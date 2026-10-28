import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';

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
      const session = await this.supabaseService.checkSession();
      if (session) {
        console.log('OAuth Login Successful for:', session.user.email);
        // TODO: Exchange this token with backend once /api/auth/oauth-login exists
      }
    } catch (err) {
      console.error('Failed to check OAuth session', err);
    }
  }

  submit() {
    if (!this.email || !this.password) return;

    this.loading = true;
    this.error = '';

    // Your AuthService.login() requires 3 args: email, password, remember
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