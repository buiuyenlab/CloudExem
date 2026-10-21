import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClassItem } from '../../../core/models';

@Component({
  selector: 'app-class-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div *ngIf="classData() as cls" class="class-detail-page">
      <div class="mb-4">
        <a routerLink="/classes" class="text-sm text-primary-600 font-semibold">&larr; Quay lại danh sách lớp</a>
      </div>

      <!-- Class Header Card -->
      <div class="card mb-6">
        <div class="flex justify-between items-start">
          <div>
            <span class="badge badge-success mb-2">{{ cls.status === 'active' ? 'Đang hoạt động' : 'Lưu trữ' }}</span>
            <h1 class="text-2xl font-bold">{{ cls.name }}</h1>
            <p class="text-slate-600 text-sm mt-1">{{ cls.description || 'Chưa có mô tả chi tiết.' }}</p>
            <div class="text-xs text-muted mt-2">Giảng viên phụ trách: <strong>{{ cls.profiles?.full_name }}</strong></div>
          </div>

          <!-- Join code box for Teacher / Admin -->
          <div *ngIf="authService.isTeacher() || authService.isAdmin()" class="join-code-card">
            <div class="text-xs text-muted font-bold">MÃ THAM GIA LỚP</div>
            <div class="join-code-text">{{ cls.join_code }}</div>
            <button (click)="copyCode(cls.join_code)" class="btn btn-secondary btn-sm mt-2">Sao chép mã</button>
          </div>
        </div>
      </div>

      <!-- Members Section -->
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold">Danh sách thành viên ({{ members().length }} sinh viên)</h3>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Họ và tên</th>
                <th>Ngày tham gia</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of members(); let i = index">
                <td>{{ i + 1 }}</td>
                <td class="font-semibold">{{ m.profiles?.full_name || 'Sinh viên' }}</td>
                <td>{{ m.joined_at | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>
                  <span class="badge badge-success">Đang học</span>
                </td>
              </tr>
              <tr *ngIf="members().length === 0">
                <td colspan="4" class="text-center text-muted p-4">Chưa có sinh viên nào tham gia lớp này.</td>
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
    .join-code-card {
      background: var(--slate-50);
      border: 1px dashed var(--slate-300);
      border-radius: var(--radius-md);
      padding: 1rem;
      text-align: center;
    }
    .join-code-text {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--primary-600);
      letter-spacing: 0.1em;
      margin: 0.25rem 0;
    }
  `]
})
export class ClassDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  authService = inject(AuthService);

  classData = signal<ClassItem | null>(null);
  members = signal<any[]>([]);

  ngOnInit(): void {
    const classId = this.route.snapshot.paramMap.get('id');
    if (classId) {
      this.loadClassDetail(classId);
    }
  }

  loadClassDetail(id: string): void {
    this.api.get<ClassItem>(`/classes/${id}`).subscribe({
      next: data => {
        this.classData.set(data);
        this.loadMembers(id);
      },
      error: () => {
        // Fallback demo data
        this.classData.set({
          id,
          name: 'Điện Toán Đám Mây - Cloud Computing 2026',
          description: 'Lớp học nguyên lý đám mây, AWS, GCP, Vercel và Serverless',
          join_code: 'CLOUD26',
          teacher_id: '00000000-0000-0000-0000-000000000002',
          status: 'active',
          created_at: new Date().toISOString(),
          profiles: { full_name: 'ThS. Nguyễn Văn Thầy' }
        });
        this.members.set([
          { profiles: { full_name: 'Trần Văn Sinh Viên' }, joined_at: new Date().toISOString() },
          { profiles: { full_name: 'Lê Thị Thu Thảo' }, joined_at: new Date().toISOString() }
        ]);
      }
    });
  }

  loadMembers(classId: string): void {
    this.api.get<any[]>(`/classes/${classId}/members`).subscribe({
      next: data => this.members.set(data || []),
      error: () => {}
    });
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code);
    this.toast.success(`Đã sao chép mã mời: ${code}`);
  }
}

