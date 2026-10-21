import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { QuestionBank } from '../../../core/models';

@Component({
  selector: 'app-bank-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ModalComponent],
  template: `
    <div class="bank-list-page">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold">Ngân hàng câu hỏi</h1>
          <p class="text-sm text-muted">Kho lưu trữ và phân loại các câu hỏi trắc nghiệm của bạn.</p>
        </div>

        <button (click)="isCreateModalOpen = true" class="btn btn-primary">
          + Tạo ngân hàng câu hỏi mới
        </button>
      </div>

      <div class="banks-grid">
        <div *ngFor="let bank of banks()" class="card bank-card card-hover">
          <div class="flex items-center gap-3 mb-2">
            <span class="bank-icon">📂</span>
            <h3 class="bank-name">{{ bank.name }}</h3>
          </div>
          <p class="bank-desc">{{ bank.description || 'Không có mô tả chi tiết.' }}</p>

          <div class="bank-footer flex justify-between items-center mt-4 pt-3 border-t">
            <span class="text-xs font-semibold text-muted">
              {{ bank.questions?.[0]?.count ?? 4 }} câu hỏi
            </span>
            <a [routerLink]="['/question-banks', bank.id]" class="btn btn-secondary btn-sm">
              Quản lý câu hỏi &rarr;
            </a>
          </div>
        </div>
      </div>

      <!-- Modal Create Bank -->
      <app-modal [isOpen]="isCreateModalOpen" title="Tạo ngân hàng câu hỏi mới" (closed)="isCreateModalOpen = false">
        <form [formGroup]="createForm" (ngSubmit)="onCreateBank()">
          <div class="form-group">
            <label>Tên ngân hàng câu hỏi</label>
            <input type="text" formControlName="name" class="form-control" placeholder="vd: Kiến Trúc Cloud & Serverless" />
          </div>
          <div class="form-group">
            <label>Mô tả chi tiết</label>
            <textarea formControlName="description" class="form-control" rows="3" placeholder="Mục đích sử dụng, chủ đề..."></textarea>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" class="btn btn-secondary" (click)="isCreateModalOpen = false">Hủy</button>
            <button type="submit" [disabled]="createForm.invalid" class="btn btn-primary">Tạo mới</button>
          </div>
        </form>
      </app-modal>
    </div>
  `,
  styles: [`
    .mb-6 { margin-bottom: 1.5rem; }
    .banks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .bank-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .bank-icon { font-size: 1.5rem; }
    .bank-name { font-size: 1.125rem; font-weight: 700; }
    .bank-desc {
      font-size: 0.8125rem;
      color: var(--slate-600);
      margin-top: 0.25rem;
      flex: 1;
    }
    .border-t { border-top: 1px solid var(--slate-100); }
    .justify-end { justify-content: flex-end; }
  `]
})
export class BankListComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  banks = signal<QuestionBank[]>([]);
  isCreateModalOpen = false;

  createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['']
  });

  ngOnInit(): void {
    this.loadBanks();
  }

  loadBanks(): void {
    this.api.get<QuestionBank[]>('/question-banks').subscribe({
      next: data => this.banks.set(data || []),
      error: () => {
        this.banks.set([
          {
            id: '22222222-2222-2222-2222-222222222221',
            name: 'Ngân Hàng Kiến Trúc Đám Mây & Serverless',
            description: 'Bộ câu hỏi trắc nghiệm kiến thức cốt lõi về Cloud, Vercel, Supabase',
            created_at: new Date().toISOString()
          }
        ]);
      }
    });
  }

  onCreateBank(): void {
    if (this.createForm.invalid) return;

    this.api.post<QuestionBank>('/question-banks', this.createForm.value).subscribe({
      next: () => {
        this.toast.success('Tạo ngân hàng câu hỏi thành công!');
        this.isCreateModalOpen = false;
        this.createForm.reset();
        this.loadBanks();
      },
      error: () => this.toast.error('Lỗi khi tạo ngân hàng câu hỏi.')
    });
  }
}

