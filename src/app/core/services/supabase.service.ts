import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    // You will need to add these to your environment.prod.ts and environment.ts
    this.supabase = createClient(
      'https://zlwmruimtzxwnurejqpk.supabase.co', 
      'YOUR_SUPABASE_ANON_KEY' // Replace with your actual anon key
    );
  }

  signInWithGoogle() {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/login' // Redirects back to login to handle session
      }
    });
  }

  signInWithApple() {
    return this.supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin + '/login'
      }
    });
  }

  // Call this on app init or login page to catch the OAuth redirect
  async checkSession() {
    const { data, error } = await this.supabase.auth.getSession();
    if (data.session) {
      console.log('Logged in with Supabase:', data.session.user.email);
      // Here you would exchange this Supabase token for your backend JWT
      // or update your AuthService to recognize the session.
    }
  }
}
