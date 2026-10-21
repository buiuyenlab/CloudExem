import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="card text-center" style="max-width: 28rem; margin: 4rem auto; text-align: center; padding: 3rem 1.5rem;">
      <div style="font-size: 3.5rem; font-weight: 900; color: var(--danger-500); margin-bottom: 0.5rem;">403</div>
      <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Truy cập bị từ chối</h2>
      <p style="color: var(--slate-600); font-size: 0.875rem; margin-bottom: 1.5rem;">
        Bạn không có quyền truy cập vào tài nguyên hoặc chức năng này.
      </p>
      <a routerLink="/dashboard" class="btn btn-primary">Trở về Dashboard</a>
    </div>
  `
})
export class ForbiddenComponent {}

