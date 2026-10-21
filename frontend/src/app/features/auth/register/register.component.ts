import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="card auth-card">
      <h2 class="card-title">Tạo tài khoản mới</h2>
      <p class="card-desc">Đăng ký tham gia nền tảng thi trực tuyến CloudExam.</p>

      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label>Họ và tên</label>
          <input type="text" formControlName="fullName" class="form-control" placeholder="Nguyễn Văn A" />
          <div *ngIf="registerForm.get('fullName')?.touched && registerForm.get('fullName')?.invalid" class="form-error">
            Vui lòng nhập họ tên đầy đủ.
          </div>
        </div>

        <div class="form-group">
          <label>Email</label>
          <input type="email" formControlName="email" class="form-control" placeholder="name@example.com" />
          <div *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.invalid" class="form-error">
            Vui lòng nhập email hợp lệ.
          </div>
        </div>

        <div class="form-group">
          <label>Mật khẩu</label>
          <input type="password" formControlName="password" class="form-control" placeholder="Tối thiểu 6 ký tự" />
          <div *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.invalid" class="form-error">
            Mật khẩu phải có ít nhất 6 ký tự.
          </div>
        </div>

        <button type="submit" [disabled]="registerForm.invalid || isSubmitting" class="btn btn-primary" style="width: 100%;">
          {{ isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản' }}
        </button>
      </form>

      <div class="auth-footer">
        Đã có tài khoản? <a routerLink="/auth/login" class="font-semibold text-primary-600">Đăng nhập</a>
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
    .auth-footer {
      text-align: center;
      font-size: 0.875rem;
      color: var(--slate-600);
      margin-top: 1.5rem;
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  isSubmitting = false;

  registerForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) return;

    this.isSubmitting = true;
    const { fullName, email, password } = this.registerForm.value;

    const res = await this.authService.signUp(email!, password!, fullName!);
    this.isSubmitting = false;

    if (res.success) {
      this.toast.success('Đăng ký thành công! Vui lòng kiểm tra email kích hoạt hoặc đăng nhập.');
      this.router.navigate(['/auth/login']);
    } else {
      this.toast.error(res.error || 'Đăng ký thất bại.');
    }
  }
}

