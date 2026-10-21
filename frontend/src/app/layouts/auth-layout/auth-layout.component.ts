import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastComponent } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ToastComponent],
  template: `
    <div class="auth-wrapper">
      <div class="auth-container">
        <div class="auth-brand">
          <span class="brand-icon">☁️</span>
          <h1 class="brand-name">CloudExam</h1>
          <p class="brand-tagline">Nền tảng thi trắc nghiệm trực tuyến chuẩn điện toán đám mây</p>
        </div>
        <router-outlet></router-outlet>
      </div>
      <app-toast></app-toast>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
      padding: 1.5rem;
    }
    .auth-container {
      width: 100%;
      max-width: 28rem;
    }
    .auth-brand {
      text-align: center;
      margin-bottom: 2rem;
    }
    .brand-icon {
      font-size: 2.5rem;
      display: block;
      margin-bottom: 0.5rem;
    }
    .brand-name {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--primary-700);
      letter-spacing: -0.025em;
    }
    .brand-tagline {
      font-size: 0.875rem;
      color: var(--slate-500);
      margin-top: 0.25rem;
    }
  `]
})
export class AuthLayoutComponent {}

