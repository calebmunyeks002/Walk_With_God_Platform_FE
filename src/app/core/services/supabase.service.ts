import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'https://zlwmruimtzxwnurejqpk.supabase.co',
      'sb_publishable_MdvJJEaLx7MMuicbcmRL2Q_9C9l9qdf'
    );
  }

  signInWithGoogle() {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/login'
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

  async checkSession() {
    const { data, error } = await this.supabase.auth.getSession();
    if (data.session) {
      return data.session;
    }
    return null;
  }
}