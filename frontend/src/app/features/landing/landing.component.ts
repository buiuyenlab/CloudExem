import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="landing-page">
      <!-- Navbar -->
      <nav class="landing-nav">
        <div class="nav-brand">
          <span class="brand-icon">☁️</span>
          <span class="brand-title">CloudExam</span>
        </div>
        <div class="nav-actions">
          <a *ngIf="!authService.isAuthenticated()" routerLink="/auth/login" class="btn btn-secondary">Đăng nhập</a>
          <a *ngIf="!authService.isAuthenticated()" routerLink="/auth/register" class="btn btn-primary">Đăng ký ngay</a>
          <a *ngIf="authService.isAuthenticated()" routerLink="/dashboard" class="btn btn-primary">Vào Dashboard &rarr;</a>
        </div>
      </nav>

      <!-- Hero Section -->
      <header class="hero-section">
        <div class="hero-badge">⚡ Kiến Trúc Điện Toán Đám Mây Hiện Đại</div>
        <h1 class="hero-headline">Hệ Thống Quản Lý & Thi Trắc Nghiệm Trực Tuyến</h1>
        <p class="hero-subtitle">
          Tổ chức kỳ thi an toàn, tự động chấm điểm tức thì, quản lý lớp học và ngân hàng câu hỏi chuyên nghiệp trên nền tảng Supabase và Vercel Serverless.
        </p>

        <div class="hero-cta">
          <a routerLink="/auth/login" class="btn btn-primary" style="padding: 0.875rem 1.75rem; font-size: 1rem;">
            Đăng nhập hệ thống &rarr;
          </a>
          <a routerLink="/auth/register" class="btn btn-secondary" style="padding: 0.875rem 1.75rem; font-size: 1rem;">
            Đăng ký tài khoản mới
          </a>
        </div>
      </header>

      <!-- Feature Grid -->
      <section class="features-section">
        <div class="feature-card card">
          <span class="feature-icon">⏱️</span>
          <h3>Kiểm Soát Thời Gian Từ Máy Chủ</h3>
          <p>Thời gian làm bài và hạn nộp bài được tính toán và xác minh tuyệt đối ở máy chủ, ngăn chặn gian lận thời gian từ client.</p>
        </div>

        <div class="feature-card card">
          <span class="feature-icon">🛡️</span>
          <h3>Bảo Mật Cấp Cơ Sở Dữ Liệu</h3>
          <p>Bảo vệ toàn vẹn dữ liệu với Supabase Row Level Security (RLS). Đáp án đúng chỉ được xử lý ở backend, không bị lộ xuống frontend.</p>
        </div>

        <div class="feature-card card">
          <span class="feature-icon">📊</span>
          <h3>Tự Động Chấm Điểm & Thống Kê</h3>
          <p>Hỗ trợ đa dạng loại câu hỏi (một đáp án, nhiều đáp án, đúng/sai), xuất bảng điểm CSV và phân tích phổ điểm trực quan.</p>
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <p>© 2026 CloudExam – Hệ thống thi trực tuyến trên nền tảng Cloud Computing.</p>
      </footer>
    </div>
  `,
  styles: [`
    .landing-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: radial-gradient(circle at top, #eef2ff 0%, #f8fafc 60%);
    }
    .landing-nav {
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--primary-700);
    }
    .nav-actions {
      display: flex;
      gap: 0.75rem;
    }
    .hero-section {
      max-width: 800px;
      margin: 4rem auto 2rem;
      text-align: center;
      padding: 0 1.5rem;
    }
    .hero-badge {
      display: inline-block;
      padding: 0.375rem 0.875rem;
      border-radius: 9999px;
      background: var(--primary-100);
      color: var(--primary-700);
      font-size: 0.75rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
    }
    .hero-headline {
      font-size: 2.75rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 1.25rem;
      color: var(--slate-900);
    }
    .hero-subtitle {
      font-size: 1.125rem;
      color: var(--slate-600);
      margin-bottom: 2.5rem;
      line-height: 1.6;
    }
    .hero-cta {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .features-section {
      max-width: 1100px;
      margin: 4rem auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      padding: 0 1.5rem;
    }
    .feature-card {
      h3 {
        margin: 1rem 0 0.5rem;
        font-size: 1.125rem;
      }
      p {
        color: var(--slate-600);
        font-size: 0.875rem;
        line-height: 1.6;
      }
    }
    .feature-icon {
      font-size: 2rem;
    }
    .landing-footer {
      margin-top: auto;
      text-align: center;
      padding: 2rem;
      font-size: 0.875rem;
      color: var(--slate-500);
      border-top: 1px solid var(--slate-200);
    }
  `]
})
export class LandingComponent {
  authService = inject(AuthService);
}

