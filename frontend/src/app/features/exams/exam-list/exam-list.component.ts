import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { Exam } from '../../../core/models';

@Component({
  selector: 'app-exam-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="exam-list-page">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold">{{ authService.isStudent() ? 'Kỳ thi có sẵn' : 'Quản lý đề thi & Kỳ thi' }}</h1>
          <p class="text-sm text-muted">Danh sách các kỳ thi kiểm tra trắc nghiệm trực tuyến.</p>
        </div>

        <a *ngIf="authService.isTeacher() || authService.isAdmin()" routerLink="/exams/new" class="btn btn-primary">
          + Thiết lập kỳ thi mới
        </a>
      </div>

      <!-- Exams Grid -->
      <div class="exams-grid" *ngIf="!isLoading">
        <div *ngFor="let ex of exams()" class="card exam-card card-hover">
          <div class="flex justify-between items-start mb-2">
            <span class="badge" [ngClass]="{
              'badge-success': ex.status === 'published',
              'badge-warning': ex.status === 'draft',
              'badge-danger': ex.status === 'closed'
            }">
              {{ ex.status === 'published' ? 'Đang mở' : ex.status === 'draft' ? 'Bản nháp' : 'Đã đóng' }}
            </span>
            <span class="text-xs font-semibold text-muted">⏱️ {{ ex.duration_minutes }} phút</span>
          </div>

          <h3 class="exam-title">{{ ex.title }}</h3>
          <p class="exam-desc">{{ ex.description || 'Chưa có hướng dẫn thi.' }}</p>

          <div class="exam-meta">
            <div>🏫 Lớp: <strong>{{ ex.classes?.name || 'Môn học' }}</strong></div>
            <div>📅 Thời gian mở: {{ ex.start_at | date:'dd/MM HH:mm' }} - {{ ex.end_at | date:'dd/MM HH:mm' }}</div>
            <div>🎯 Điểm đạt: {{ ex.pass_score }} / 10 • Tối đa: {{ ex.max_attempts }} lần làm</div>
          </div>

          <div class="exam-actions mt-4 pt-3 border-t flex gap-2">
            <!-- Student Action -->
            <button *ngIf="authService.isStudent()"
                    [disabled]="ex.status !== 'published'"
                    (click)="startExam(ex.id)"
                    class="btn btn-primary btn-sm flex-1">
              Bắt đầu làm bài &rarr;
            </button>

            <!-- Teacher Actions -->
            <ng-container *ngIf="authService.isTeacher() || authService.isAdmin()">
              <button *ngIf="ex.status === 'draft'" (click)="publishExam(ex.id)" class="btn btn-primary btn-sm flex-1">
                Xuất bản
              </button>
              <button *ngIf="ex.status === 'published'" (click)="closeExam(ex.id)" class="btn btn-danger btn-sm flex-1">
                Đóng đề
              </button>
              <a [routerLink]="['/results/exams', ex.id]" class="btn btn-secondary btn-sm flex-1 text-center">
                Bảng điểm CSV
              </a>
            </ng-container>
          </div>
        </div>
      </div>

      <div *ngIf="exams().length === 0" class="card text-center p-8">
        <p class="text-muted">Chưa có kỳ thi nào.</p>
      </div>
    </div>
  `,
  styles: [`
    .mb-6 { margin-bottom: 1.5rem; }
    .exams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }
    .exam-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .exam-title { font-size: 1.125rem; font-weight: 700; margin: 0.5rem 0 0.25rem; }
    .exam-desc {
      font-size: 0.8125rem;
      color: var(--slate-600);
      margin-bottom: 1rem;
      flex: 1;
    }
    .exam-meta {
      font-size: 0.75rem;
      color: var(--slate-500);
      line-height: 1.6;
    }
    .border-t { border-top: 1px solid var(--slate-100); }
    .flex-1 { flex: 1; }
  `]
})
export class ExamListComponent implements OnInit {
  authService = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);

  exams = signal<Exam[]>([]);
  isLoading = false;

  ngOnInit(): void {
    this.loadExams();
  }

  loadExams(): void {
    this.isLoading = true;
    this.api.get<Exam[]>('/exams').subscribe({
      next: data => {
        this.exams.set(data || []);
        this.isLoading = false;
      },
      error: err => {
        this.isLoading = false;
        this.toast.error('Không thể tải danh sách kỳ thi. Vui lòng thử lại.');
      }
    });
  }

  startExam(examId: string): void {
    this.api.post<any>(`/exams/${examId}/attempts`, {}).subscribe({
      next: res => {
        const attempt = res.attempt;
        this.toast.success(res.resumed ? 'Đang tiếp tục bài thi...' : 'Bắt đầu làm bài thi!');
        this.router.navigate(['/exam-taking', attempt.id]);
      },
      error: err => {
        const msg = err?.error?.message || 'Không thể bắt đầu bài thi. Vui lòng thử lại.';
        this.toast.error(msg);
      }
    });
  }

  publishExam(examId: string): void {
    this.api.post(`/exams/${examId}/publish`, {}).subscribe({
      next: () => {
        this.toast.success('Đã xuất bản kỳ thi!');
        this.loadExams();
      },
      error: () => this.toast.error('Lỗi khi xuất bản.')
    });
  }

  closeExam(examId: string): void {
    this.api.post(`/exams/${examId}/close`, {}).subscribe({
      next: () => {
        this.toast.success('Đã đóng kỳ thi.');
        this.loadExams();
      },
      error: () => this.toast.error('Lỗi khi đóng đề thi.')
    });
  }
}

