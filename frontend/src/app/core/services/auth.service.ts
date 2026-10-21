import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
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
  }

  private async initSession(): Promise<void> {
    try {
      // Check stored session or mock for demo
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) {
        this.accessToken.set(session.access_token);
        await this.loadProfile(session.user.id, session.user.email);
      } else {
        // Check local demo mock if any
        const saved = localStorage.getItem('cloudexam_mock_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.currentUser.set(parsed);
          this.accessToken.set('mock-access-token-' + parsed.role);
        }
      }
    } catch (e) {
      console.warn('Supabase auth session load warning:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadProfile(userId: string, email?: string): Promise<void> {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile && !error) {
      this.currentUser.set({
        ...profile,
        email: email || ''
      });
    }
  }

  async signIn(email: string, password: string):Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        this.accessToken.set(data.session.access_token);
        await this.loadProfile(data.user.id, data.user.email);
        return { success: true };
      }

      return { success: false, error: 'Không nhận được phiên đăng nhập.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async signUp(email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fast Demo Login to test the 3 roles seamlessly
   */
  loginAsDemo(role: 'admin' | 'teacher' | 'student'): void {
    const mockUsers: Record<string, UserProfile> = {
      admin: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@cloudexam.edu.vn',
        full_name: 'Quản Trị Viên Hệ Thống',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
        role: 'admin',
        status: 'active'
      },
      teacher: {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'teacher@cloudexam.edu.vn',
        full_name: 'ThS. Nguyễn Văn Thầy',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher',
        role: 'teacher',
        status: 'active'
      },
      student: {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'student@cloudexam.edu.vn',
        full_name: 'Trần Văn Sinh Viên',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student1',
        role: 'student',
        status: 'active'
      }
    };

    const user = mockUsers[role];
    this.currentUser.set(user);
    this.accessToken.set('demo-token-' + role);
    localStorage.setItem('cloudexam_mock_user', JSON.stringify(user));
    this.router.navigate(['/dashboard']);
  }

  async signOut(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    this.currentUser.set(null);
    this.accessToken.set(null);
    localStorage.removeItem('cloudexam_mock_user');
    this.router.navigate(['/auth/login']);
  }
}

