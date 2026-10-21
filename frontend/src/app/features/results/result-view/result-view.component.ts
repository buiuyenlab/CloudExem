import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-result-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="result-view-page">
      <div class="mb-4">
        <a routerLink="/dashboard" class="text-sm text-primary-600 font-semibold">&larr; Quay lại trang chính</a>
      </div>

      <!-- Loading state -->
      <div *ngIf="isLoading()" class="card text-center p-8">
        <div class="loading-spinner mx-auto mb-3"></div>
        <p class="text-muted text-sm">Đang tải kết quả...</p>
      </div>

      <!-- Error state -->
      <div *ngIf="!isLoading() && !result()" class="card text-center p-8">
        <div class="text-4xl mb-3">⚠️</div>
        <h3 class="font-bold text-slate-700">Không thể tải kết quả</h3>
        <p class="text-sm text-muted mt-1">Vui lòng thử lại hoặc liên hệ giảng viên.</p>
        <button (click)="loadResult()" class="btn btn-primary btn-sm mt-4">Thử lại</button>
      </div>

      <!-- Result Banner Card -->
      <div *ngIf="!isLoading() && result()" class="card result-banner mb-6">
        <div class="banner-content">
          <div class="score-circle" [class.passed]="result()?.is_passed">
            <span class="score-number">{{ result()?.score | number:'1.1-1' }}</span>
            <span class="score-total">/ {{ result()?.total_points | number:'1.1-1' }}</span>
          </div>

          <div class="banner-info">
            <span class="badge" [ngClass]="result()?.is_passed ? 'badge-success' : 'badge-danger'">
              {{ result()?.is_passed ? 'ĐẠT KỲ THI' : 'CHƯA ĐẠT' }}
            </span>
            <h1 class="text-2xl font-bold mt-2">{{ result()?.exam_title || 'Kỳ thi' }}</h1>
            <p class="text-sm text-slate-500 mt-1">
              Thí sinh: <strong>{{ result()?.student_name || '—' }}</strong> •
              Điểm đạt yêu cầu: {{ result()?.pass_score }} điểm
            </p>
            <div class="result-meta mt-2">
              <span class="text-xs text-muted">Số câu đúng: {{ result()?.correct_count ?? '—' }} / {{ result()?.total_questions ?? '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Review Section (only when answers are released) -->
      <div *ngIf="result()?.answers_released" class="review-section">
        <h3 class="font-bold text-lg mb-4">Chi tiết bài làm và đáp án chuẩn</h3>

        <div class="flex flex-col gap-4">
          <div *ngFor="let item of result()?.review; let i = index" class="card review-card">
            <div class="flex justify-between items-center mb-2">
              <span class="badge badge-primary">Câu {{ i + 1 }}</span>
              <span class="badge" [ngClass]="item.is_correct ? 'badge-success' : 'badge-danger'">
                {{ item.is_correct ? '+ ' + item.awarded_points + ' điểm' : '0 điểm' }}
              </span>
            </div>

            <div class="font-semibold text-slate-900 mb-3">{{ item.questions?.content }}</div>

            <!-- Options with student choice and correct indicator -->
            <div class="flex flex-col gap-1.5">
              <div *ngFor="let opt of item.questions?.options"
                   class="review-option-pill"
                   [class.student-choice]="item.answer_data?.includes(opt.id)"
                   [class.correct-answer]="item.questions?.correct_answers?.includes(opt.id)">
                <span><strong>{{ opt.id | uppercase }}.</strong> {{ opt.text }}</span>

                <div class="text-xs font-bold">
                  <span *ngIf="item.questions?.correct_answers?.includes(opt.id)" class="text-green-700">✓ Đáp án chuẩn</span>
                  <span *ngIf="item.answer_data?.includes(opt.id)" class="text-indigo-700 ml-2">(Bạn đã chọn)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="result() && !result()?.answers_released" class="card text-center p-6 text-muted">
        <p>🔒 Chi tiết đáp án và bài giải sẽ được công bố sau khi kỳ thi kết thúc theo quy định.</p>
      </div>
    </div>
  `,
  styles: [`
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .loading-spinner {
      width: 2rem; height: 2rem;
      border: 3px solid var(--slate-200);
      border-top-color: var(--primary-600);
      border-radius: 9999px;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .result-banner {
      background: linear-gradient(135deg, white 0%, var(--primary-50) 100%);
      padding: 2.5rem 2rem;
    }
    .banner-content {
      display: flex;
      align-items: center;
      gap: 2rem;
    }
    .score-circle {
      width: 6.5rem;
      height: 6.5rem;
      border-radius: 9999px;
      background: white;
      border: 4px solid var(--danger-500);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-md);
      flex-shrink: 0;

      &.passed {
        border-color: var(--success-500);
      }
    }
    .score-number {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--slate-900);
      line-height: 1;
    }
    .score-total {
      font-size: 0.75rem;
      color: var(--slate-500);
      font-weight: 600;
    }
    .review-option-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0.875rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--slate-200);
      background: white;
      font-size: 0.8125rem;

      &.student-choice {
        background: var(--primary-50);
        border-color: var(--primary-500);
      }
      &.correct-answer {
        background: var(--success-50);
        border-color: var(--success-500);
      }
    }
    .result-meta { color: var(--slate-500); }
  `]
})
export class ResultViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  result = signal<any>(null);
  isLoading = signal<boolean>(true);
  private attemptId = '';

  ngOnInit(): void {
    this.attemptId = this.route.snapshot.paramMap.get('id') || '';
    if (this.attemptId) {
      this.loadResult();
    } else {
      this.isLoading.set(false);
      this.toast.error('ID bài thi không hợp lệ.');
      this.router.navigate(['/exams']);
    }
  }

  loadResult(): void {
    this.isLoading.set(true);
    this.api.get<any>(`/attempts/${this.attemptId}/result`).subscribe({
      next: data => {
        this.result.set(data);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        const msg = err?.error?.message || 'Không thể tải kết quả bài thi.';
        this.toast.error(msg);
      }
    });
  }
}

