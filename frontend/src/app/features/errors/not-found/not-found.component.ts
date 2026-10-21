import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="card text-center" style="max-width: 28rem; margin: 4rem auto; text-align: center; padding: 3rem 1.5rem;">
      <div style="font-size: 3.5rem; font-weight: 900; color: var(--primary-600); margin-bottom: 0.5rem;">404</div>
      <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Không tìm thấy trang</h2>
      <p style="color: var(--slate-600); font-size: 0.875rem; margin-bottom: 1.5rem;">
        Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển.
      </p>
      <a routerLink="/dashboard" class="btn btn-primary">Trở về Dashboard</a>
    </div>
  `
})
export class NotFoundComponent {}

