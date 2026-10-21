import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { Question } from '../../../core/models';

@Component({
  selector: 'app-bank-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ModalComponent],
  template: `
    <div class="bank-detail-page">
      <div class="mb-4">
        <a routerLink="/question-banks" class="text-sm text-primary-600 font-semibold">&larr; Quay lại danh sách ngân hàng</a>
      </div>

      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold">Danh sách câu hỏi</h1>
          <p class="text-sm text-muted">Quản lý các câu hỏi trong ngân hàng này.</p>
        </div>

        <button (click)="openAddModal()" class="btn btn-primary">
          + Thêm câu hỏi mới
        </button>
      </div>

      <!-- Questions List -->
      <div class="questions-list flex flex-col gap-4">
        <div *ngFor="let q of questions(); let i = index" class="card question-card">
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
              <span class="badge badge-primary">Câu {{ i + 1 }}</span>
              <span class="badge" [ngClass]="{
                'badge-success': q.difficulty === 'easy',
                'badge-warning': q.difficulty === 'medium',
                'badge-danger': q.difficulty === 'hard'
              }">
                {{ q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'medium' ? 'Vừa' : 'Khó' }}
              </span>
              <span class="text-xs font-semibold text-muted">
                {{ q.question_type === 'single_choice' ? '1 đáp án' : q.question_type === 'multiple_choice' ? 'Nhiều đáp án' : 'Đúng/Sai' }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-700">{{ q.default_points }} điểm</span>
              <button (click)="onDeleteQuestion(q.id)" class="text-xs text-red-600 hover:underline">Xóa</button>
            </div>
          </div>

          <div class="question-content font-semibold text-slate-900 my-2">
            {{ q.content }}
          </div>

          <!-- Options Preview -->
          <div class="options-grid">
            <div *ngFor="let opt of q.options"
                 class="option-pill"
                 [class.correct]="isCorrectOption(q, opt.id)">
              <span class="font-bold">{{ opt.id | uppercase }}.</span> {{ opt.text }}
              <span *ngIf="isCorrectOption(q, opt.id)" class="text-xs text-green-700 ml-1 font-bold">✓ (Đáp án đúng)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Add Question -->
      <app-modal [isOpen]="isModalOpen" title="Thêm câu hỏi mới" maxWidth="42rem" (closed)="isModalOpen = false">
        <form [formGroup]="questionForm" (ngSubmit)="onSaveQuestion()">
          <div class="form-group">
            <label>Nội dung câu hỏi</label>
            <textarea formControlName="content" class="form-control" rows="3" placeholder="Nhập câu hỏi..."></textarea>
          </div>

          <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="form-group">
              <label>Loại câu hỏi</label>
              <select formControlName="question_type" class="form-control" (change)="onTypeChange()">
                <option value="single_choice">Một đáp án đúng</option>
                <option value="multiple_choice">Nhiều đáp án đúng</option>
                <option value="true_false">Đúng / Sai</option>
              </select>
            </div>

            <div class="form-group">
              <label>Mức độ khó</label>
              <select formControlName="difficulty" class="form-control">
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>

            <div class="form-group">
              <label>Điểm mặc định</label>
              <input type="number" step="0.25" formControlName="default_points" class="form-control" />
            </div>
          </div>

          <!-- Options -->
          <div class="form-group">
            <div class="flex justify-between items-center mb-2">
              <label class="mb-0">Các phương án lựa chọn (Tích chọn đáp án đúng):</label>
              <button type="button" *ngIf="questionForm.get('question_type')?.value !== 'true_false'" (click)="addOption()" class="btn btn-secondary btn-sm">
                + Thêm lựa chọn
              </button>
            </div>

            <div formArrayName="options" class="flex flex-col gap-2">
              <div *ngFor="let opt of optionsArray.controls; let idx = index" [formGroupName]="idx" class="flex items-center gap-2">
                <input type="checkbox"
                       [checked]="selectedCorrectIds.has(opt.get('id')?.value)"
                       (change)="toggleCorrect(opt.get('id')?.value)"
                       class="w-4 h-4 cursor-pointer" />
                <input type="text" formControlName="text" class="form-control" placeholder="Nội dung phương án..." />
                <button *ngIf="optionsArray.length > 2" type="button" (click)="removeOption(idx)" class="btn btn-danger btn-sm">✕</button>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <button type="button" class="btn btn-secondary" (click)="isModalOpen = false">Hủy</button>
            <button type="submit" [disabled]="questionForm.invalid || selectedCorrectIds.size === 0" class="btn btn-primary">Lưu câu hỏi</button>
          </div>
        </form>
      </app-modal>
    </div>
  `,
  styles: [`
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .option-pill {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      background: white;
      &.correct {
        border-color: var(--success-500);
        background: var(--success-50);
      }
    }
    .grid { display: grid; }
    .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .gap-3 { gap: 0.75rem; }
    .flex-col { flex-direction: column; }
    .justify-end { justify-content: flex-end; }
  `]
})
export class BankDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  bankId = '';
  questions = signal<Question[]>([]);
  isModalOpen = false;
  selectedCorrectIds = new Set<string>();

  questionForm = this.fb.group({
    content: ['', [Validators.required, Validators.minLength(3)]],
    question_type: ['single_choice', Validators.required],
    difficulty: ['medium', Validators.required],
    default_points: [2.5, [Validators.required, Validators.min(0.1)]],
    options: this.fb.array([])
  });

  get optionsArray(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }

  ngOnInit(): void {
    this.bankId = this.route.snapshot.paramMap.get('id') || '';
    if (this.bankId) {
      this.loadQuestions();
    }
  }

  loadQuestions(): void {
    this.api.get<Question[]>(`/question-banks/${this.bankId}/questions`).subscribe({
      next: data => this.questions.set(data || []),
      error: () => {
        // Fallback demo questions
        this.questions.set([
          {
            id: '33333333-3333-3333-3333-333333333301',
            bank_id: this.bankId,
            question_type: 'single_choice',
            content: 'Mô hình nào sau đây cho phép nhà phát triển chạy code backend mà không cần quản lý máy chủ vật lý hay container liên tục?',
            options: [
              { id: 'opt_a', text: 'IaaS (Infrastructure as a Service)' },
              { id: 'opt_b', text: 'Serverless Functions / FaaS' },
              { id: 'opt_c', text: 'Dedicated Bare-metal Server' },
              { id: 'opt_d', text: 'Local VirtualBox' }
            ],
            correct_answers: ['opt_b'],
            difficulty: 'easy',
            default_points: 2.5
          },
          {
            id: '33333333-3333-3333-3333-333333333302',
            bank_id: this.bankId,
            question_type: 'multiple_choice',
            content: 'Những thành phần nào sau đây thuộc giải pháp cơ sở dữ liệu và bảo mật do Supabase cung cấp? (Chọn tất cả đáp án đúng)',
            options: [
              { id: 'opt_a', text: 'PostgreSQL Database Engine' },
              { id: 'opt_b', text: 'Row Level Security (RLS)' },
              { id: 'opt_c', text: 'Hadoop HDFS cluster' },
              { id: 'opt_d', text: 'Built-in JWT Authentication' }
            ],
            correct_answers: ['opt_a', 'opt_b', 'opt_d'],
            difficulty: 'medium',
            default_points: 2.5
          }
        ]);
      }
    });
  }

  isCorrectOption(q: Question, optionId: string): boolean {
    return q.correct_answers ? q.correct_answers.includes(optionId) : false;
  }

  openAddModal(): void {
    this.questionForm.reset({
      content: '',
      question_type: 'single_choice',
      difficulty: 'medium',
      default_points: 2.5
    });
    this.optionsArray.clear();
    this.selectedCorrectIds.clear();

    // Default 4 options
    ['opt_a', 'opt_b', 'opt_c', 'opt_d'].forEach(id => {
      this.optionsArray.push(this.fb.group({
        id: [id],
        text: ['', Validators.required]
      }));
    });

    this.isModalOpen = true;
  }

  onTypeChange(): void {
    const type = this.questionForm.get('question_type')?.value;
    this.selectedCorrectIds.clear();

    if (type === 'true_false') {
      this.optionsArray.clear();
      this.optionsArray.push(this.fb.group({ id: ['opt_t'], text: ['Đúng'] }));
      this.optionsArray.push(this.fb.group({ id: ['opt_f'], text: ['Sai'] }));
    }
  }

  addOption(): void {
    const nextChar = String.fromCharCode(97 + this.optionsArray.length); // a, b, c, d, e...
    this.optionsArray.push(this.fb.group({
      id: [`opt_${nextChar}`],
      text: ['', Validators.required]
    }));
  }

  removeOption(index: number): void {
    const optId = this.optionsArray.at(index).get('id')?.value;
    this.selectedCorrectIds.delete(optId);
    this.optionsArray.removeAt(index);
  }

  toggleCorrect(id: string): void {
    const type = this.questionForm.get('question_type')?.value;
    if (type === 'single_choice' || type === 'true_false') {
      this.selectedCorrectIds.clear();
      this.selectedCorrectIds.add(id);
    } else {
      if (this.selectedCorrectIds.has(id)) {
        this.selectedCorrectIds.delete(id);
      } else {
        this.selectedCorrectIds.add(id);
      }
    }
  }

  onSaveQuestion(): void {
    if (this.questionForm.invalid || this.selectedCorrectIds.size === 0) return;

    const val = this.questionForm.value;
    const payload = {
      content: val.content,
      question_type: val.question_type,
      difficulty: val.difficulty,
      default_points: val.default_points,
      options: val.options,
      correct_answers: Array.from(this.selectedCorrectIds)
    };

    this.api.post(`/question-banks/${this.bankId}/questions`, payload).subscribe({
      next: () => {
        this.toast.success('Thêm câu hỏi thành công!');
        this.isModalOpen = false;
        this.loadQuestions();
      },
      error: () => this.toast.error('Lỗi khi lưu câu hỏi.')
    });
  }

  onDeleteQuestion(questionId: string): void {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return;

    this.api.delete(`/questions/${questionId}`).subscribe({
      next: () => {
        this.toast.success('Đã xóa câu hỏi.');
        this.loadQuestions();
      },
      error: () => this.toast.error('Lỗi khi xóa câu hỏi.')
    });
  }
}

