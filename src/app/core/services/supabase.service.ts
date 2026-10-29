import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl || 'https://zlwmruimtzxwnurejqpk.supabase.co',
      environment.supabaseAnonKey || 'sb_publishable_MdvJJEaLx7MMuicbcmRL2Q_9C9l9qdf',
      {
        auth: {
          detectSessionInUrl: true,
          flowType: 'implicit'
        }
      }
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

  async getSessionFromUrl(): Promise<Session | null> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error.message);
      return null;
    }
    return data.session;
  }
}