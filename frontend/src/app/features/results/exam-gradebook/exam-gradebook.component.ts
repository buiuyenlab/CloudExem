import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-exam-gradebook',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="gradebook-page">
      <div class="mb-4">
        <a routerLink="/exams" class="text-sm text-primary-600 font-semibold">&larr; Quay lại danh sách đề thi</a>
      </div>

      <div class="card mb-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold">Bảng điểm: {{ examInfo()?.title || 'Kỳ thi' }}</h1>
            <p class="text-sm text-muted">Lớp: {{ examInfo()?.class_name }} • Điểm đạt: {{ examInfo()?.pass_score }} / 10</p>
          </div>

          <button (click)="exportCsv()" class="btn btn-primary">
            📥 Xuất Bảng Điểm (CSV Excel)
          </button>
        </div>
      </div>

      <!-- Results Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Thí sinh</th>
                <th>Lần thi</th>
                <th>Điểm số</th>
                <th>Kết quả</th>
                <th>Trạng thái</th>
                <th>Thời gian nộp</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of results(); let i = index">
                <td>{{ i + 1 }}</td>
                <td class="font-bold">{{ row.student_name }}</td>
                <td>Lần {{ row.attempt_number }}</td>
                <td class="font-bold text-base text-indigo-700">{{ row.score }} / {{ row.total_points }}</td>
                <td>
                  <span class="badge" [ngClass]="row.is_passed === 'Đạt' ? 'badge-success' : 'badge-danger'">
                    {{ row.is_passed }}
                  </span>
                </td>
                <td>{{ row.status }}</td>
                <td class="text-xs text-muted">{{ row.submitted_at }}</td>
              </tr>
              <tr *ngIf="results().length === 0">
                <td colspan="7" class="text-center p-6 text-muted">Chưa có bài thi nào được nộp.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
  `]
})
export class ExamGradebookComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  examId = '';
  examInfo = signal<any>(null);
  results = signal<any[]>([]);

  ngOnInit(): void {
    this.examId = this.route.snapshot.paramMap.get('id') || '';
    if (this.examId) {
      this.loadGradebook();
    }
  }

  loadGradebook(): void {
    this.api.get<any>(`/exams/${this.examId}/results`).subscribe({
      next: data => {
        this.examInfo.set(data.exam);
        this.results.set(data.results || []);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Không thể tải bảng điểm kỳ thi.');
      }
    });
  }

  exportCsv(): void {
    this.api.downloadBlob(`/exams/${this.examId}/results`, { export: 'csv' }).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BangDiem_${this.examInfo()?.title || 'Exam'}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success('Đã tải xuống file CSV bảng điểm!');
      },
      error: (err) => {
        this.toast.error('Không thể xuất file CSV từ máy chủ.');
      }
    });
  }
}

