import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="header">
      <div class="header-left">
        <a routerLink="/dashboard" class="logo">
          <span class="logo-badge">☁️</span>
          <span class="logo-text">CloudExam</span>
        </a>
      </div>

      <div class="header-right">
        <div *ngIf="authService.currentUser() as user" class="user-profile">
          <span class="badge" [ngClass]="{
            'badge-primary': user.role === 'admin',
            'badge-warning': user.role === 'teacher',
            'badge-success': user.role === 'student'
          }">
            {{ user.role === 'admin' ? 'Quản Trị Viên' : user.role === 'teacher' ? 'Giáo Viên' : 'Sinh Viên' }}
          </span>

          <div class="user-info">
            <span class="user-name">{{ user.full_name }}</span>
          </div>

          <button class="btn btn-secondary btn-sm" (click)="authService.signOut()">
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      height: 4rem;
      background: white;
      border-bottom: 1px solid var(--slate-200);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      position: sticky;
      top: 0;
      z-index: 40;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
    }
    .logo-badge {
      font-size: 1.5rem;
    }
    .logo-text {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--primary-600);
      letter-spacing: -0.025em;
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .user-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--slate-800);
    }
  `]
})
export class HeaderComponent {
  authService = inject(AuthService);
}

