import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="card auth-card">
      <h2 class="card-title">Quên mật khẩu</h2>
      <p class="card-desc">Nhập địa chỉ email đăng ký để nhận liên kết thiết lập lại mật khẩu.</p>

      <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label>Email đăng ký</label>
          <input type="email" formControlName="email" class="form-control" placeholder="name@example.com" />
        </div>

        <button type="submit" [disabled]="forgotForm.invalid || isSent" class="btn btn-primary" style="width: 100%;">
          {{ isSent ? 'Đã gửi hướng dẫn' : 'Gửi liên kết khôi phục' }}
        </button>
      </form>

      <div class="auth-footer" style="text-align: center; margin-top: 1.5rem; font-size: 0.875rem;">
        <a routerLink="/auth/login" class="font-semibold text-primary-600">&larr; Quay lại đăng nhập</a>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  isSent = false;
  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  onSubmit(): void {
    if (this.forgotForm.invalid) return;
    this.isSent = true;
    this.toast.success('Nếu email tồn tại, hệ thống đã gửi liên kết khôi phục mật khẩu.');
  }
}

