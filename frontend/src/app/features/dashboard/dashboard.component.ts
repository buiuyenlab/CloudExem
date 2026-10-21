import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-page">
      <!-- Welcome Header -->
      <div class="welcome-header">
        <div>
          <h1 class="text-2xl font-bold">Xin chào, {{ authService.currentUser()?.full_name }}! 👋</h1>
          <p class="text-slate-500 text-sm mt-1">Chào mừng bạn quay trở lại bảng điều khiển CloudExam.</p>
        </div>
        <div class="actions">
          <a *ngIf="authService.isStudent()" routerLink="/classes" class="btn btn-primary">
            + Tham gia lớp mới
          </a>
          <a *ngIf="authService.isTeacher()" routerLink="/exams" class="btn btn-primary">
            + Tạo kỳ thi mới
          </a>
        </div>
      </div>

      <!-- ADMIN DASHBOARD -->
      <ng-container *ngIf="authService.isAdmin()">
        <div class="stats-grid">
          <div class="stat-card card">
            <span class="stat-icon bg-indigo-50 text-indigo-600">👥</span>
            <div>
              <div class="stat-val">{{ adminMetrics()?.total_users ?? 4 }}</div>
              <div class="stat-label">Tổng người dùng</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-purple-50 text-purple-600">👨‍🏫</span>
            <div>
              <div class="stat-val">{{ adminMetrics()?.total_teachers ?? 1 }}</div>
              <div class="stat-label">Giáo viên</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-emerald-50 text-emerald-600">🎓</span>
            <div>
              <div class="stat-val">{{ adminMetrics()?.total_students ?? 2 }}</div>
              <div class="stat-label">Sinh viên</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-blue-50 text-blue-600">📝</span>
            <div>
              <div class="stat-val">{{ adminMetrics()?.total_exams ?? 1 }}</div>
              <div class="stat-label">Kỳ thi đã tạo</div>
            </div>
          </div>
        </div>

        <div class="card mt-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold">Lối tắt quản trị hệ thống</h3>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <a routerLink="/admin/users" class="admin-shortcut card card-hover">
              <span class="text-xl">👤</span>
              <div>
                <div class="font-bold text-sm">Quản lý tài khoản & Phân quyền</div>
                <div class="text-xs text-muted">Khóa, mở khóa và thăng cấp vai trò người dùng an toàn.</div>
              </div>
            </a>
            <a routerLink="/admin/audit-logs" class="admin-shortcut card card-hover">
              <span class="text-xl">📜</span>
              <div>
                <div class="font-bold text-sm">Nhật ký kiểm toán (Audit Logs)</div>
                <div class="text-xs text-muted">Theo dõi lịch sử thay đổi phân quyền và thao tác quan trọng.</div>
              </div>
            </a>
          </div>
        </div>
      </ng-container>

      <!-- TEACHER DASHBOARD -->
      <ng-container *ngIf="authService.isTeacher()">
        <div class="stats-grid">
          <div class="stat-card card">
            <span class="stat-icon bg-blue-50 text-blue-600">🏫</span>
            <div>
              <div class="stat-val">2</div>
              <div class="stat-label">Lớp đang giảng dạy</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-indigo-50 text-indigo-600">📚</span>
            <div>
              <div class="stat-val">1</div>
              <div class="stat-label">Ngân hàng câu hỏi</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-purple-50 text-purple-600">📝</span>
            <div>
              <div class="stat-val">1</div>
              <div class="stat-label">Đề thi đã phát hành</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-emerald-50 text-emerald-600">✅</span>
            <div>
              <div class="stat-val">2</div>
              <div class="stat-label">Lượt nộp bài gần đây</div>
            </div>
          </div>
        </div>

        <div class="mt-6 flex gap-4">
          <a routerLink="/classes" class="btn btn-secondary flex-1 card card-hover text-center" style="display:block;">
            <div class="font-bold">🏫 Quản lý lớp học</div>
            <div class="text-xs text-muted mt-1">Tạo mã mời và danh sách sinh viên</div>
          </a>
          <a routerLink="/question-banks" class="btn btn-secondary flex-1 card card-hover text-center" style="display:block;">
            <div class="font-bold">📚 Ngân hàng câu hỏi</div>
            <div class="text-xs text-muted mt-1">Quản lý câu hỏi trắc nghiệm & điểm</div>
          </a>
          <a routerLink="/exams" class="btn btn-secondary flex-1 card card-hover text-center" style="display:block;">
            <div class="font-bold">📝 Quản lý đề thi & Bảng điểm</div>
            <div class="text-xs text-muted mt-1">Xuất CSV điểm số & chấm tự động</div>
          </a>
        </div>
      </ng-container>

      <!-- STUDENT DASHBOARD -->
      <ng-container *ngIf="authService.isStudent()">
        <div class="stats-grid">
          <div class="stat-card card">
            <span class="stat-icon bg-emerald-50 text-emerald-600">🏫</span>
            <div>
              <div class="stat-val">1</div>
              <div class="stat-label">Lớp học đã tham gia</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-indigo-50 text-indigo-600">📝</span>
            <div>
              <div class="stat-val">1</div>
              <div class="stat-label">Kỳ thi đang mở</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-blue-50 text-blue-600">🎯</span>
            <div>
              <div class="stat-val">10.0</div>
              <div class="stat-label">Điểm trung bình</div>
            </div>
          </div>
        </div>

        <div class="card mt-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold">Kỳ thi sẵn sàng làm bài</h3>
            <a routerLink="/exams" class="text-xs font-semibold text-primary-600">Xem tất cả &rarr;</a>
          </div>

          <div class="p-4 border rounded-xl bg-slate-50 flex items-center justify-between">
            <div>
              <span class="badge badge-success mb-2">ĐANG MỞ</span>
              <h4 class="font-bold text-base">Kiểm Tra Giữa Kỳ - Kiến Trúc Cloud & Serverless</h4>
              <p class="text-xs text-slate-500 mt-1">Thời gian làm bài: 30 phút • Tối đa: 2 lần làm</p>
            </div>
            <a routerLink="/exams" class="btn btn-primary btn-sm">
              Xem chi tiết & Làm bài
            </a>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .welcome-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .stat-icon {
      font-size: 1.75rem;
      width: 3.5rem;
      height: 3.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-lg);
    }
    .stat-val {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--slate-900);
      line-height: 1;
    }
    .stat-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--slate-500);
      margin-top: 0.25rem;
    }
    .admin-shortcut {
      display: flex;
      align-items: center;
      gap: 1rem;
      text-decoration: none;
      color: inherit;
    }
    .mt-6 { margin-top: 1.5rem; }
  `]
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private api = inject(ApiService);

  adminMetrics = signal<any>(null);

  ngOnInit(): void {
    if (this.authService.isAdmin()) {
      this.api.get<any>('/admin/overview').subscribe({
        next: res => this.adminMetrics.set(res?.metrics),
        error: () => {}
      });
    }
  }
}

