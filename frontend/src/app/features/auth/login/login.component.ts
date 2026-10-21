import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="card auth-card">
      <h2 class="card-title">Đăng nhập tài khoản</h2>
      <p class="card-desc">Nhập email và mật khẩu của bạn để truy cập hệ thống.</p>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label>Email</label>
          <input type="email" formControlName="email" class="form-control" placeholder="name@example.com" />
          <div *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.invalid" class="form-error">
            Vui lòng nhập email hợp lệ.
          </div>
        </div>

        <div class="form-group">
          <div class="flex justify-between items-center mb-1">
            <label>Mật khẩu</label>
            <a routerLink="/auth/forgot-password" class="text-xs text-primary-600 hover:underline">Quên mật khẩu?</a>
          </div>
          <input type="password" formControlName="password" class="form-control" placeholder="••••••••" />
          <div *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.invalid" class="form-error">
            Mật khẩu phải có ít nhất 6 ký tự.
          </div>
        </div>

        <button type="submit" [disabled]="loginForm.invalid || isSubmitting" class="btn btn-primary w-full" style="width: 100%;">
          {{ isSubmitting ? 'Đang xác thực...' : 'Đăng nhập' }}
        </button>
      </form>

      <!-- Fast Demo Role Login -->
      <div class="demo-section">
        <div class="divider">
          <span>HOẶC TRẢI NGHIỆM NHANH (DEMO)</span>
        </div>
        <div class="demo-buttons">
          <button (click)="authService.loginAsDemo('admin')" type="button" class="btn btn-secondary btn-sm flex-1">Admin</button>
          <button (click)="authService.loginAsDemo('teacher')" type="button" class="btn btn-secondary btn-sm flex-1">Giáo viên</button>
          <button (click)="authService.loginAsDemo('student')" type="button" class="btn btn-secondary btn-sm flex-1">Sinh viên</button>
        </div>
      </div>

      <div class="auth-footer">
        Chưa có tài khoản? <a routerLink="/auth/register" class="font-semibold text-primary-600">Đăng ký ngay</a>
      </div>
    </div>
  `,
  styles: [`
    .auth-card {
      box-shadow: var(--shadow-md);
    }
    .card-title {
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }
    .card-desc {
      color: var(--slate-500);
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }
    .divider {
      position: relative;
      text-align: center;
      margin: 1.5rem 0 1rem;
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: var(--slate-200);
      }
      span {
        position: relative;
        background: white;
        padding: 0 0.5rem;
        font-size: 0.6875rem;
        font-weight: 700;
        color: var(--slate-400);
      }
    }
    .demo-buttons {
      display: flex;
      gap: 0.5rem;
    }
    .flex-1 { flex: 1; }
    .auth-footer {
      text-align: center;
      font-size: 0.875rem;
      color: var(--slate-600);
      margin-top: 1.5rem;
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  authService = inject(AuthService);
  private toast = inject(ToastService);

  isSubmitting = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.isSubmitting = true;
    const { email, password } = this.loginForm.value;

    const res = await this.authService.signIn(email!, password!);
    this.isSubmitting = false;

    if (res.success) {
      this.toast.success('Đăng nhập thành công!');
      this.router.navigate(['/dashboard']);
    } else {
      this.toast.error(res.error || 'Đăng nhập thất bại.');
    }
  }
}

