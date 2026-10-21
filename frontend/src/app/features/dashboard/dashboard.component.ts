import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

interface AdminMetrics {
  total_users: number;
  total_admins: number;
  total_teachers: number;
  total_students: number;
  total_classes: number;
  total_exams: number;
  total_attempts: number;
}

interface TeacherStats {
  classes: number;
  question_banks: number;
  published_exams: number;
  total_attempts: number;
}

interface StudentStats {
  enrolled_classes: number;
  open_exams: number;
  total_attempts: number;
  avg_score: number | null;
}

interface RecentExam {
  id: string;
  title: string;
  status: string;
  duration_minutes: number;
  start_at: string;
  end_at: string;
  max_attempts: number;
  pass_score: number;
  classes?: { name: string };
}

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
          <a *ngIf="authService.isTeacher()" routerLink="/exams/new" class="btn btn-primary">
            + Tạo kỳ thi mới
          </a>
        </div>
      </div>

      <!-- Loading indicator -->
      <div *ngIf="isLoading()" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p class="text-slate-500 mt-3 text-sm">Đang tải dữ liệu...</p>
      </div>

      <!-- ADMIN DASHBOARD -->
      <ng-container *ngIf="!isLoading() && authService.isAdmin()">
        <div class="stats-grid">
          <div class="stat-card card">
            <span class="stat-icon bg-indigo-50 text-indigo-600">👥</span>
            <div>
              <div class="stat-val">{{ adminMetrics()?.total_users ?? '—' }}</div>
              <div class="stat-label">Tổng người dùng</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-purple-50 text-purple-600">👨‍🏫</span>
            <div>
              <div class="stat-val">{{ adminMetrics()?.total_teachers ?? '—' }}</div>
              <div class="stat-label">Giáo viên</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-emerald-50 text-emerald-600">🎓</span>
            <div>
              <div class="stat-val">{{ adminMetrics()?.total_students ?? '—' }}</div>
              <div class="stat-label">Sinh viên</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-blue-50 text-blue-600">📝</span>
            <div>
              <div class="stat-val">{{ adminMetrics()?.total_exams ?? '—' }}</div>
              <div class="stat-label">Kỳ thi đã tạo</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-amber-50 text-amber-600">🏫</span>
            <div>
              <div class="stat-val">{{ adminMetrics()?.total_classes ?? '—' }}</div>
              <div class="stat-label">Lớp học</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-rose-50 text-rose-600">📋</span>
            <div>
              <div class="stat-val">{{ adminMetrics()?.total_attempts ?? '—' }}</div>
              <div class="stat-label">Lượt làm bài</div>
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
            <a routerLink="/classes" class="admin-shortcut card card-hover">
              <span class="text-xl">🏫</span>
              <div>
                <div class="font-bold text-sm">Quản lý lớp học</div>
                <div class="text-xs text-muted">Xem và giám sát tất cả các lớp học trong hệ thống.</div>
              </div>
            </a>
            <a routerLink="/exams" class="admin-shortcut card card-hover">
              <span class="text-xl">📝</span>
              <div>
                <div class="font-bold text-sm">Quản lý đề thi</div>
                <div class="text-xs text-muted">Giám sát các kỳ thi và kết quả trên toàn hệ thống.</div>
              </div>
            </a>
          </div>
        </div>
      </ng-container>

      <!-- TEACHER DASHBOARD -->
      <ng-container *ngIf="!isLoading() && authService.isTeacher()">
        <div class="stats-grid">
          <div class="stat-card card">
            <span class="stat-icon bg-blue-50 text-blue-600">🏫</span>
            <div>
              <div class="stat-val">{{ teacherStats()?.classes ?? '—' }}</div>
              <div class="stat-label">Lớp đang giảng dạy</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-indigo-50 text-indigo-600">📚</span>
            <div>
              <div class="stat-val">{{ teacherStats()?.question_banks ?? '—' }}</div>
              <div class="stat-label">Ngân hàng câu hỏi</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-purple-50 text-purple-600">📝</span>
            <div>
              <div class="stat-val">{{ teacherStats()?.published_exams ?? '—' }}</div>
              <div class="stat-label">Đề thi đã phát hành</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-emerald-50 text-emerald-600">✅</span>
            <div>
              <div class="stat-val">{{ teacherStats()?.total_attempts ?? '—' }}</div>
              <div class="stat-label">Tổng lượt nộp bài</div>
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
      <ng-container *ngIf="!isLoading() && authService.isStudent()">
        <div class="stats-grid">
          <div class="stat-card card">
            <span class="stat-icon bg-emerald-50 text-emerald-600">🏫</span>
            <div>
              <div class="stat-val">{{ studentStats()?.enrolled_classes ?? '—' }}</div>
              <div class="stat-label">Lớp học đã tham gia</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-indigo-50 text-indigo-600">📝</span>
            <div>
              <div class="stat-val">{{ studentStats()?.open_exams ?? '—' }}</div>
              <div class="stat-label">Kỳ thi đang mở</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-blue-50 text-blue-600">📋</span>
            <div>
              <div class="stat-val">{{ studentStats()?.total_attempts ?? '—' }}</div>
              <div class="stat-label">Số lần làm bài</div>
            </div>
          </div>
          <div class="stat-card card">
            <span class="stat-icon bg-amber-50 text-amber-600">🎯</span>
            <div>
              <div class="stat-val">
                {{ studentStats()?.avg_score != null ? (studentStats()!.avg_score! | number:'1.1-1') : '—' }}
              </div>
              <div class="stat-label">Điểm trung bình</div>
            </div>
          </div>
        </div>

        <!-- Available exams for student -->
        <div class="card mt-6" *ngIf="availableExams().length > 0">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold">Kỳ thi đang mở</h3>
            <a routerLink="/exams" class="text-xs font-semibold text-primary-600">Xem tất cả &rarr;</a>
          </div>
          <div class="exams-list">
            <div *ngFor="let ex of availableExams()" class="exam-row">
              <div class="exam-info">
                <span class="badge badge-success mb-1">ĐANG MỞ</span>
                <h4 class="font-bold text-sm">{{ ex.title }}</h4>
                <p class="text-xs text-slate-500 mt-1">
                  Thời gian: {{ ex.duration_minutes }} phút •
                  Tối đa: {{ ex.max_attempts }} lần •
                  Lớp: {{ ex.classes?.name || '—' }}
                </p>
              </div>
              <a [routerLink]="['/exams']" class="btn btn-primary btn-sm">Vào thi &rarr;</a>
            </div>
          </div>
        </div>

        <div class="card mt-6" *ngIf="availableExams().length === 0">
          <div class="text-center p-6">
            <div class="text-4xl mb-2">📭</div>
            <h4 class="font-bold text-slate-700">Không có kỳ thi nào đang mở</h4>
            <p class="text-sm text-muted mt-1">Hãy kiểm tra lại hoặc tham gia thêm lớp học để xem kỳ thi.</p>
            <a routerLink="/classes" class="btn btn-secondary btn-sm mt-4">Tham gia lớp học &rarr;</a>
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
    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
    }
    .loading-spinner {
      width: 2.5rem;
      height: 2.5rem;
      border: 3px solid var(--slate-200);
      border-top-color: var(--primary-600);
      border-radius: 9999px;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
      flex-shrink: 0;
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
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .grid { display: grid; }
    .gap-4 { gap: 1rem; }
    .exams-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .exam-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      background: var(--slate-50);
    }
    .exam-info { flex: 1; min-width: 0; }
  `]
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private api = inject(ApiService);

  isLoading = signal<boolean>(true);
  adminMetrics = signal<AdminMetrics | null>(null);
  teacherStats = signal<TeacherStats | null>(null);
  studentStats = signal<StudentStats | null>(null);
  availableExams = signal<RecentExam[]>([]);

  ngOnInit(): void {
    const role = this.authService.currentUser()?.role;

    if (role === 'admin') {
      this.loadAdminData();
    } else if (role === 'teacher') {
      this.loadTeacherData();
    } else if (role === 'student') {
      this.loadStudentData();
    } else {
      this.isLoading.set(false);
    }
  }

  private loadAdminData(): void {
    this.api.get<any>('/admin/overview').subscribe({
      next: res => {
        this.adminMetrics.set(res?.metrics ?? null);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  private loadTeacherData(): void {
    // Load classes, question banks, exams in parallel
    Promise.all([
      this.fetchCount('/classes'),
      this.fetchCount('/question-banks'),
      this.fetchPublishedExamCount(),
      this.fetchTotalAttempts()
    ]).then(([classes, question_banks, published_exams, total_attempts]) => {
      this.teacherStats.set({ classes, question_banks, published_exams, total_attempts });
      this.isLoading.set(false);
    }).catch(() => this.isLoading.set(false));
  }

  private loadStudentData(): void {
    // Load enrolled classes and available exams
    Promise.all([
      this.fetchCount('/classes'),
      this.fetchAvailableExams(),
      this.fetchStudentAttemptStats()
    ]).then(([enrolled_classes, { exams, stats }]) => {
      this.availableExams.set(exams);
      this.studentStats.set({
        enrolled_classes,
        open_exams: exams.length,
        total_attempts: stats.total_attempts,
        avg_score: stats.avg_score
      });
      this.isLoading.set(false);
    }).catch(() => this.isLoading.set(false));
  }

  private fetchCount(endpoint: string): Promise<number> {
    return new Promise(resolve => {
      this.api.get<any[]>(endpoint).subscribe({
        next: data => resolve(Array.isArray(data) ? data.length : 0),
        error: () => resolve(0)
      });
    });
  }

  private fetchPublishedExamCount(): Promise<number> {
    return new Promise(resolve => {
      this.api.get<any[]>('/exams').subscribe({
        next: data => resolve(Array.isArray(data) ? data.filter((e: any) => e.status === 'published').length : 0),
        error: () => resolve(0)
      });
    });
  }

  private fetchTotalAttempts(): Promise<number> {
    return new Promise(resolve => {
      // Teacher sees gradebooks for their exams - approximate via exams endpoint
      this.api.get<any[]>('/exams').subscribe({
        next: data => {
          // Count total attempts across all exams from gradebook
          if (!Array.isArray(data) || data.length === 0) return resolve(0);
          const fetches = data.slice(0, 5).map((ex: any) =>
            new Promise<number>(r => {
              this.api.get<any>(`/results/exams/${ex.id}/gradebook`).subscribe({
                next: (gb: any) => r(gb?.total_students ?? 0),
                error: () => r(0)
              });
            })
          );
          Promise.all(fetches).then(counts => resolve(counts.reduce((a, b) => a + b, 0)));
        },
        error: () => resolve(0)
      });
    });
  }

  private fetchAvailableExams(): Promise<{ exams: RecentExam[]; stats: any }> {
    return new Promise(resolve => {
      this.api.get<RecentExam[]>('/exams').subscribe({
        next: data => {
          const now = new Date();
          const open = (data || []).filter((e: any) =>
            e.status === 'published' &&
            new Date(e.start_at) <= now &&
            new Date(e.end_at) >= now
          );
          resolve({ exams: open, stats: { total_attempts: 0, avg_score: null } });
        },
        error: () => resolve({ exams: [], stats: { total_attempts: 0, avg_score: null } })
      });
    });
  }

  private fetchStudentAttemptStats(): Promise<{ total_attempts: number; avg_score: number | null }> {
    // This would ideally come from a dedicated endpoint; approximate here
    return Promise.resolve({ total_attempts: 0, avg_score: null });
  }
}
