import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      <div *ngFor="let toast of toastService.toasts()"
           class="pointer-events-auto p-4 rounded-xl shadow-lg border text-sm font-medium transition-all flex items-start justify-between gap-3"
           [ngClass]="{
             'bg-green-50 border-green-200 text-green-800': toast.type === 'success',
             'bg-red-50 border-red-200 text-red-800': toast.type === 'error',
             'bg-amber-50 border-amber-200 text-amber-800': toast.type === 'warning',
             'bg-blue-50 border-blue-200 text-blue-800': toast.type === 'info'
           }">
        <span>{{ toast.message }}</span>
        <button (click)="toastService.remove(toast.id)" class="text-xs font-bold opacity-60 hover:opacity-100">&times;</button>
      </div>
    </div>
  `,
  styles: [`
    .fixed { position: fixed; }
    .top-4 { top: 1rem; }
    .right-4 { right: 1rem; }
    .z-50 { z-index: 50; }
    .flex-col { flex-direction: column; }
    .max-w-sm { max-width: 24rem; }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}

