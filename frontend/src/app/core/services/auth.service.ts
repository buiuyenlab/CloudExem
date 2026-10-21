import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { UserProfile } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;

  currentUser = signal<UserProfile | null>(null);
  accessToken = signal<string | null>(null);
  isLoading = signal<boolean>(true);

  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === 'admin');
  isTeacher = computed(() => this.currentUser()?.role === 'teacher');
  isStudent = computed(() => this.currentUser()?.role === 'student');

  constructor(private router: Router) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });

    this.initSession();

    // Keep token in sync when Supabase refreshes the session automatically
    this.supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        this.accessToken.set(session.access_token);
      } else {
        this.accessToken.set(null);
        this.currentUser.set(null);
      }
    });
  }

  private async initSession(): Promise<void> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) {
        this.accessToken.set(session.access_token);
        await this.loadProfile(session.user.id, session.user.email);
      }
    } catch (e) {
      console.warn('Supabase auth session load warning:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadProfile(userId: string, email?: string): Promise<void> {
    // Fetch profile from backend (which verifies token & returns permitted fields)
    try {
      const res = await fetch(`${environment.apiBaseUrl}/me/profile`, {
        headers: { Authorization: `Bearer ${this.accessToken()}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          this.currentUser.set({ ...json.data, email: email || json.data.email || '' });
          return;
        }
      }
    } catch (_) {}

    // Fallback: fetch directly from Supabase client (uses RLS)
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile && !error) {
      this.currentUser.set({ ...profile, email: email || '' });
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // Translate common Supabase error messages to Vietnamese
        const msg = this.translateAuthError(error.message);
        return { success: false, error: msg };
      }

      if (data.session) {
        this.accessToken.set(data.session.access_token);
        await this.loadProfile(data.user.id, data.user.email);

        // Check if account is suspended
        if (this.currentUser()?.status === 'suspended') {
          await this.supabase.auth.signOut();
          this.currentUser.set(null);
          this.accessToken.set(null);
          return { success: false, error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.' };
        }

        return { success: true };
      }

      return { success: false, error: 'Không nhận được phiên đăng nhập.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async signUp(email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (error) {
        return { success: false, error: this.translateAuthError(error.message) };
      }

      // Supabase may require email confirmation
      const needsConfirm = !data.session && !!data.user;
      return { success: true, needsEmailConfirmation: needsConfirm };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
    } catch (_) {}
    this.currentUser.set(null);
    this.accessToken.set(null);
    this.router.navigate(['/auth/login']);
  }

  // Translate Supabase English error messages to Vietnamese
  private translateAuthError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Email hoặc mật khẩu không chính xác.';
    if (msg.includes('Email not confirmed')) return 'Vui lòng xác nhận email trước khi đăng nhập.';
    if (msg.includes('User already registered')) return 'Email này đã được đăng ký trước đó.';
    if (msg.includes('Password should be')) return 'Mật khẩu phải có ít nhất 6 ký tự.';
    if (msg.includes('rate limit')) return 'Bạn đã thử quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.';
    return msg;
  }
}
