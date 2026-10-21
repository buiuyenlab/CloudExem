import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar">
      <nav class="nav-list">
        <!-- Dashboard -->
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
          <span class="icon">📊</span>
          <span>Tổng quan</span>
        </a>

        <!-- Classes -->
        <a routerLink="/classes" routerLinkActive="active" class="nav-item">
          <span class="icon">🏫</span>
          <span>{{ authService.isStudent() ? 'Lớp học của tôi' : 'Quản lý lớp học' }}</span>
        </a>

        <!-- Teacher / Admin: Question Banks -->
        <a *ngIf="authService.isTeacher() || authService.isAdmin()"
           routerLink="/question-banks" routerLinkActive="active" class="nav-item">
          <span class="icon">📚</span>
          <span>Ngân hàng câu hỏi</span>
        </a>

        <!-- Exams -->
        <a routerLink="/exams" routerLinkActive="active" class="nav-item">
          <span class="icon">📝</span>
          <span>{{ authService.isStudent() ? 'Kỳ thi có sẵn' : 'Quản lý đề thi' }}</span>
        </a>

        <!-- Admin Specific Navigation -->
        <ng-container *ngIf="authService.isAdmin()">
          <div class="nav-divider">QUẢN TRỊ</div>

          <a routerLink="/admin/users" routerLinkActive="active" class="nav-item">
            <span class="icon">👥</span>
            <span>Quản lý người dùng</span>
          </a>

          <a routerLink="/admin/audit-logs" routerLinkActive="active" class="nav-item">
            <span class="icon">📜</span>
            <span>Nhật ký hệ thống</span>
          </a>
        </ng-container>
      </nav>

      <!-- Switch Demo Role Panel (Helpful for pairs and reviewers) -->
      <div class="demo-role-switcher">
        <div class="switcher-title">Đổi vai trò nhanh (Demo):</div>
        <div class="switcher-buttons">
          <button (click)="authService.loginAsDemo('admin')" class="switch-btn" [class.current]="authService.isAdmin()">Admin</button>
          <button (click)="authService.loginAsDemo('teacher')" class="switch-btn" [class.current]="authService.isTeacher()">Giáo viên</button>
          <button (click)="authService.loginAsDemo('student')" class="switch-btn" [class.current]="authService.isStudent()">Sinh viên</button>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 16rem;
      background: white;
      border-right: 1px solid var(--slate-200);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: calc(100vh - 4rem);
      padding: 1.5rem 1rem;
      position: sticky;
      top: 4rem;
    }
    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .nav-divider {
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--slate-400);
      letter-spacing: 0.05em;
      margin: 1.25rem 0.75rem 0.5rem;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--slate-600);
      text-decoration: none;
      transition: all 0.15s ease;

      &:hover {
        background-color: var(--slate-100);
        color: var(--slate-900);
      }

      &.active {
        background-color: var(--primary-50);
        color: var(--primary-700);
      }
    }
    .icon {
      font-size: 1.125rem;
    }
    .demo-role-switcher {
      background: var(--slate-50);
      border: 1px dashed var(--slate-300);
      border-radius: var(--radius-md);
      padding: 0.75rem;
    }
    .switcher-title {
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--slate-500);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }
    .switcher-buttons {
      display: flex;
      gap: 0.25rem;
    }
    .switch-btn {
      flex: 1;
      padding: 0.25rem;
      font-size: 0.6875rem;
      font-weight: 600;
      border: 1px solid var(--slate-200);
      background: white;
      border-radius: var(--radius-sm);
      cursor: pointer;

      &:hover {
        background: var(--slate-100);
      }

      &.current {
        background: var(--primary-600);
        color: white;
        border-color: var(--primary-600);
      }
    }
  `]
})
export class SidebarComponent {
  authService = inject(AuthService);
}

