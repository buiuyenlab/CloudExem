import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

// Layouts
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';

// Features
import { LandingComponent } from './features/landing/landing.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { SuspendedComponent } from './features/auth/suspended/suspended.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ClassListComponent } from './features/classes/class-list/class-list.component';
import { ClassDetailComponent } from './features/classes/class-detail/class-detail.component';
import { BankListComponent } from './features/question-banks/bank-list/bank-list.component';
import { BankDetailComponent } from './features/question-banks/bank-detail/bank-detail.component';
import { ExamListComponent } from './features/exams/exam-list/exam-list.component';
import { ExamFormComponent } from './features/exams/exam-form/exam-form.component';
import { ExamTakingComponent } from './features/exam-taking/exam-taking.component';
import { ResultViewComponent } from './features/results/result-view/result-view.component';
import { ExamGradebookComponent } from './features/results/exam-gradebook/exam-gradebook.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';
import { NotFoundComponent } from './features/errors/not-found/not-found.component';
import { ForbiddenComponent } from './features/errors/forbidden/forbidden.component';

export const routes: Routes = [
  // Public Landing Page
  { path: '', component: LandingComponent },

  // Auth Routes
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
      { path: 'suspended', component: SuspendedComponent }
    ]
  },

  // Distraction-free Exam Taking (Full Screen)
  {
    path: 'exam-taking/:id',
    component: ExamTakingComponent,
    canActivate: [authGuard]
  },

  // Authenticated Portal Pages
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },

      // Classes
      { path: 'classes', component: ClassListComponent },
      { path: 'classes/:id', component: ClassDetailComponent },

      // Question Banks (Teacher & Admin)
      {
        path: 'question-banks',
        component: BankListComponent,
        canActivate: [roleGuard],
        data: { roles: ['teacher', 'admin'] }
      },
      {
        path: 'question-banks/:id',
        component: BankDetailComponent,
        canActivate: [roleGuard],
        data: { roles: ['teacher', 'admin'] }
      },

      // Exams
      { path: 'exams', component: ExamListComponent },
      {
        path: 'exams/new',
        component: ExamFormComponent,
        canActivate: [roleGuard],
        data: { roles: ['teacher', 'admin'] }
      },

      // Results
      { path: 'results/attempts/:id', component: ResultViewComponent },
      {
        path: 'results/exams/:id',
        component: ExamGradebookComponent,
        canActivate: [roleGuard],
        data: { roles: ['teacher', 'admin'] }
      },

      // Admin Management
      {
        path: 'admin/users',
        component: AdminDashboardComponent,
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'admin/audit-logs',
        component: AdminDashboardComponent,
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      },

      // Errors
      { path: 'error/403', component: ForbiddenComponent }
    ]
  },

  // 404 Catch-All
  { path: '**', component: NotFoundComponent }
];

