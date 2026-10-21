import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-suspended',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card text-center" style="text-align: center; padding: 2.5rem 1.5rem;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
      <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--danger-700);">Tài Khoản Đang Bị Khóa</h2>
      <p style="color: var(--slate-600); margin-bottom: 2rem; font-size: 0.875rem; line-height: 1.6;">
        Tài khoản của bạn đã bị Quản trị viên tạm khóa hoặc chưa được phê duyệt kích hoạt. Vui lòng liên hệ ban quản trị để được hỗ trợ mở khóa.
      </p>
      <button class="btn btn-secondary" (click)="authService.signOut()">Đăng xuất tài khoản</button>
    </div>
  `
})
export class SuspendedComponent {
  authService = inject(AuthService);
}

