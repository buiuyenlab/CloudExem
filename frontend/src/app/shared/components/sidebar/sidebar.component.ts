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

      <!-- Current User Info Card -->
      <div class="user-card" *ngIf="authService.currentUser() as user">
        <img [src]="user.avatar_url || defaultAvatar(user.full_name)" [alt]="user.full_name" class="user-avatar" />
        <div class="user-info">
          <div class="user-name">{{ user.full_name }}</div>
          <div class="user-role">
            <span class="role-badge" [ngClass]="'role-' + user.role">
              {{ roleLabel(user.role) }}
            </span>
          </div>
        </div>
        <button (click)="authService.signOut()" class="sign-out-btn" title="Đăng xuất">⏏</button>
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
      overflow-y: auto;
    }
    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      flex: 1;
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
    /* User card at bottom */
    .user-card {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.75rem;
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      margin-top: 1rem;
    }
    .user-avatar {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 9999px;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid var(--slate-200);
    }
    .user-info {
      flex: 1;
      min-width: 0;
    }
    .user-name {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--slate-800);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-role {
      margin-top: 0.125rem;
    }
    .role-badge {
      font-size: 0.625rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      &.role-admin { background: var(--danger-50); color: var(--danger-700, #b91c1c); }
      &.role-teacher { background: var(--primary-50); color: var(--primary-700); }
      &.role-student { background: #f0fdf4; color: #15803d; }
    }
    .sign-out-btn {
      background: none;
      border: none;
      font-size: 1rem;
      cursor: pointer;
      color: var(--slate-400);
      padding: 0.25rem;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
      &:hover { color: var(--danger-600, #dc2626); background: #fee2e2; }
    }
  `]
})
export class SidebarComponent {
  authService = inject(AuthService);

  roleLabel(role: string): string {
    if (role === 'admin') return 'Quản trị viên';
    if (role === 'teacher') return 'Giáo viên';
    return 'Sinh viên';
  }

  defaultAvatar(name: string): string {
    const seed = encodeURIComponent(name || 'user');
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=4f46e5&textColor=ffffff`;
  }
}

