import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ClassItem } from '../../../core/models';

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ModalComponent],
  template: `
    <div class="class-list-page">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold">{{ authService.isStudent() ? 'Lớp học của tôi' : 'Quản lý lớp học' }}</h1>
          <p class="text-sm text-muted">Danh sách các lớp học được phân quyền tham gia hoặc giảng dạy.</p>
        </div>

        <div class="flex gap-2">
          <button *ngIf="authService.isStudent()" (click)="isJoinModalOpen = true" class="btn btn-primary">
            + Nhập mã tham gia lớp
          </button>
          <button *ngIf="authService.isTeacher() || authService.isAdmin()" (click)="isCreateModalOpen = true" class="btn btn-primary">
            + Tạo lớp học mới
          </button>
        </div>
      </div>

      <!-- Classes Grid -->
      <div *ngIf="classes().length > 0" class="classes-grid">
        <div *ngFor="let cls of classes()" class="card class-card card-hover">
          <div class="flex justify-between items-start mb-2">
            <span class="badge" [ngClass]="cls.status === 'active' ? 'badge-success' : 'badge-warning'">
              {{ cls.status === 'active' ? 'Đang hoạt động' : 'Lưu trữ' }}
            </span>
            <div *ngIf="authService.isTeacher() || authService.isAdmin()" class="join-code-badge" title="Mã mời tham gia">
              Mã: <code>{{ cls.join_code }}</code>
            </div>
          </div>

          <h3 class="class-name">{{ cls.name }}</h3>
          <p class="class-desc">{{ cls.description || 'Không có mô tả chi tiết.' }}</p>

          <div class="class-meta">
            <span>👨‍🏫 {{ cls.profiles?.full_name || 'Giảng viên' }}</span>
          </div>

          <div class="card-footer-action">
            <a [routerLink]="['/classes', cls.id]" class="btn btn-secondary btn-sm w-full" style="width: 100%;">
              Xem chi tiết lớp học &rarr;
            </a>
          </div>
        </div>
      </div>

      <div *ngIf="classes().length === 0" class="card text-center p-8">
        <p class="text-muted">Chưa có lớp học nào được tìm thấy.</p>
      </div>

      <!-- Modal: Tạo lớp học mới (Teacher/Admin) -->
      <app-modal [isOpen]="isCreateModalOpen" title="Tạo lớp học mới" (closed)="isCreateModalOpen = false">
        <form [formGroup]="createForm" (ngSubmit)="onCreateClass()">
          <div class="form-group">
            <label>Tên lớp học</label>
            <input type="text" formControlName="name" class="form-control" placeholder="vd: Điện Toán Đám Mây 2026" />
          </div>
          <div class="form-group">
            <label>Mô tả lớp học</label>
            <textarea formControlName="description" class="form-control" rows="3" placeholder="Mô tả tóm tắt nội dung..."></textarea>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" class="btn btn-secondary" (click)="isCreateModalOpen = false">Hủy</button>
            <button type="submit" [disabled]="createForm.invalid" class="btn btn-primary">Tạo lớp</button>
          </div>
        </form>
      </app-modal>

      <!-- Modal: Tham gia lớp học (Student) -->
      <app-modal [isOpen]="isJoinModalOpen" title="Tham gia lớp học bằng mã" (closed)="isJoinModalOpen = false">
        <form [formGroup]="joinForm" (ngSubmit)="onJoinClass()">
          <div class="form-group">
            <label>Mã tham gia lớp (Join Code)</label>
            <input type="text" formControlName="join_code" class="form-control" placeholder="vd: CLOUD26" style="text-transform: uppercase;" />
            <p class="text-xs text-muted mt-1">Xin mã tham gia này từ giảng viên phụ trách môn học của bạn.</p>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" class="btn btn-secondary" (click)="isJoinModalOpen = false">Hủy</button>
            <button type="submit" [disabled]="joinForm.invalid" class="btn btn-primary">Tham gia lớp</button>
          </div>
        </form>
      </app-modal>
    </div>
  `,
  styles: [`
    .mb-6 { margin-bottom: 1.5rem; }
    .classes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .class-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .class-name {
      font-size: 1.125rem;
      margin: 0.5rem 0 0.25rem;
    }
    .class-desc {
      font-size: 0.8125rem;
      color: var(--slate-600);
      margin-bottom: 1rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .class-meta {
      font-size: 0.75rem;
      color: var(--slate-500);
      padding-top: 0.75rem;
      border-top: 1px solid var(--slate-100);
      margin-bottom: 1rem;
    }
    .join-code-badge {
      font-size: 0.75rem;
      font-weight: 700;
      background: var(--slate-100);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      code {
        color: var(--primary-600);
        letter-spacing: 0.05em;
      }
    }
    .justify-end { justify-content: flex-end; }
  `]
})
export class ClassListComponent implements OnInit {
  authService = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  classes = signal<ClassItem[]>([]);
  isCreateModalOpen = false;
  isJoinModalOpen = false;

  createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['']
  });

  joinForm = this.fb.group({
    join_code: ['', [Validators.required, Validators.minLength(4)]]
  });

  ngOnInit(): void {
    this.loadClasses();
  }

  loadClasses(): void {
    this.api.get<ClassItem[]>('/classes').subscribe({
      next: data => this.classes.set(data || []),
      error: err => {
        // Fallback demo classes if offline
        this.classes.set([
          {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Điện Toán Đám Mây - Cloud Computing 2026',
            description: 'Lớp học nguyên lý đám mây, AWS, GCP, Vercel và Serverless',
            join_code: 'CLOUD26',
            teacher_id: '00000000-0000-0000-0000-000000000002',
            status: 'active',
            created_at: new Date().toISOString(),
            profiles: { full_name: 'ThS. Nguyễn Văn Thầy' }
          }
        ]);
      }
    });
  }

  onCreateClass(): void {
    if (this.createForm.invalid) return;

    this.api.post<ClassItem>('/classes', this.createForm.value).subscribe({
      next: created => {
        this.toast.success('Tạo lớp học thành công!');
        this.isCreateModalOpen = false;
        this.createForm.reset();
        this.loadClasses();
      },
      error: err => this.toast.error('Lỗi khi tạo lớp học.')
    });
  }

  onJoinClass(): void {
    if (this.joinForm.invalid) return;

    this.api.post('/classes/join', this.joinForm.value).subscribe({
      next: () => {
        this.toast.success('Tham gia lớp học thành công!');
        this.isJoinModalOpen = false;
        this.joinForm.reset();
        this.loadClasses();
      },
      error: err => this.toast.error(err?.error?.message || 'Mã lớp không hợp lệ hoặc đã tham gia.')
    });
  }
}

