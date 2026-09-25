import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { User, Role } from '../models/models';

interface AuthResponse {
  token: string;
  user: User;
}

interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
  name?: string;
  iat?: number;
  exp?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private key = 'wwg_token';

  readonly user = signal<User | null>(null);

  constructor() {
    const token = localStorage.getItem(this.key);
    if (token) {
      // 1. If the token is expired, clear it and don't attempt to restore
      if (this.isExpired(token)) {
        this.clearStorage();
        return;
      }

      // 2. Optimistically hydrate the user signal from the JWT synchronously
      //    (this prevents the guard from bouncing us to /login on refresh)
      const payload = this.decode(token);
      if (payload) {
        this.user.set(this.payloadToUser(payload));
      }

      // 3. Then verify the session with the server (async, non-blocking).
      //    If the server says the token is invalid, log out.
      this.verifySession();
    }
  }

  login(email: string, password: string, remember: boolean) {
    return this.http
      .post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(
        tap((r) => {
          localStorage.setItem(this.key, r.token);
          if (remember) localStorage.setItem(this.key + '_remember', '1');
          this.user.set(r.user);
        })
      );
  }

  register(payload: unknown) {
    return this.http.post<AuthResponse>('/api/auth/register', payload).pipe(
      tap((r) => {
        localStorage.setItem(this.key, r.token);
        this.user.set(r.user);
      })
    );
  }

  /** Public — refresh the current user from the server. */
  refreshUser() {
    this.verifySession();
  }

  /** Non-blocking server verification after boot. */
  private verifySession() {
    this.http.get<User>('/api/auth/me').subscribe({
      next: (u) => this.user.set(u),
      error: () => this.logout(false),
    });
  }

  token() {
    return localStorage.getItem(this.key);
  }

  isLoggedIn() {
    const t = this.token();
    return !!t && !this.isExpired(t);
  }

  logout(navigate = true) {
    this.clearStorage();
    this.user.set(null);
    if (navigate) this.router.navigate(['/login']);
  }

  /* ---------- JWT helpers ---------- */

  private clearStorage() {
    localStorage.removeItem(this.key);
    localStorage.removeItem(this.key + '_remember');
  }

  /** Decode a JWT payload (no signature verification — server checks that). */
  private decode(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(payload)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  }

  /** Check if the JWT has an exp claim and is already expired. */
  private isExpired(token: string): boolean {
    const payload = this.decode(token);
    if (!payload || !payload.exp) return false;
    // exp is in seconds since epoch
    return payload.exp * 1000 < Date.now();
  }

  /** Build a User object from the JWT payload we control. */
  private payloadToUser(p: JwtPayload): User {
    return {
      id: p.sub,
      name: p.name ?? '',
      email: p.email,
      role: p.role,
    } as User;
  }
}