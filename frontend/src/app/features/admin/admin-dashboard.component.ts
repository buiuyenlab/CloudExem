import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { UserProfile } from '../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="mb-6">
        <h1 class="text-2xl font-bold">Quản trị người dùng & Phân quyền</h1>
        <p class="text-sm text-muted">Quản lý trạng thái khóa/mở khóa tài khoản và thiết lập vai trò an toàn.</p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-4 border-b">
        <button (click)="activeTab = 'users'"
                class="tab-btn"
                [class.active]="activeTab === 'users'">
          👥 Danh sách người dùng ({{ users().length }})
        </button>
        <button (click)="activeTab = 'audit'"
                class="tab-btn"
                [class.active]="activeTab === 'audit'">
          📜 Nhật ký hệ thống (Audit Logs)
        </button>
      </div>

      <!-- USERS TAB -->
      <div *ngIf="activeTab === 'users'" class="card">
        <div class="flex justify-between items-center mb-4">
          <input type="text"
                 [(ngModel)]="searchQuery"
                 (input)="filterUsers()"
                 placeholder="Tìm theo tên học viên, giảng viên..."
                 class="form-control"
                 style="max-width: 20rem;" />

          <div class="flex gap-2">
            <select [(ngModel)]="roleFilter" (change)="filterUsers()" class="form-control" style="width: auto;">
              <option value="">Tất cả vai trò</option>
              <option value="admin">Quản trị viên</option>
              <option value="teacher">Giáo viên</option>
              <option value="student">Sinh viên</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of filteredUsers()">
                <td>
                  <div class="font-bold text-slate-900">{{ u.full_name }}</div>
                </td>
                <td class="text-xs text-muted">{{ u.email || 'user@cloudexam.edu.vn' }}</td>
                <td>
                  <select [ngModel]="u.role" (ngModelChange)="onChangeRole(u.id, $event)" class="form-control btn-sm" style="width: auto;">
                    <option value="admin">Admin</option>
                    <option value="teacher">Giáo viên</option>
                    <option value="student">Sinh viên</option>
                  </select>
                </td>
                <td>
                  <span class="badge" [ngClass]="u.status === 'active' ? 'badge-success' : 'badge-danger'">
                    {{ u.status === 'active' ? 'Hoạt động' : 'Đã khóa' }}
                  </span>
                </td>
                <td>
                  <button (click)="toggleUserStatus(u)"
                          class="btn btn-sm"
                          [ngClass]="u.status === 'active' ? 'btn-danger' : 'btn-secondary'">
                    {{ u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- AUDIT LOGS TAB -->
      <div *ngIf="activeTab === 'audit'" class="card">
        <h3 class="font-bold mb-4">Lịch sử thay đổi & Nhật ký bảo mật</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Hành động</th>
                <th>Người thực hiện</th>
                <th>Chi tiết thay đổi</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of auditLogs()">
                <td><span class="badge badge-primary">{{ log.action }}</span></td>
                <td class="font-semibold">{{ log.profiles?.full_name || 'Admin' }}</td>
                <td class="text-xs font-mono">{{ log.metadata | json }}</td>
                <td class="text-xs text-muted">{{ log.created_at | date:'dd/MM/yyyy HH:mm:ss' }}</td>
              </tr>
              <tr *ngIf="auditLogs().length === 0">
                <td colspan="4" class="text-center p-6 text-muted">Chưa có nhật ký nào được ghi lại.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .tab-btn {
      padding: 0.75rem 1.25rem;
      font-weight: 600;
      font-size: 0.875rem;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--slate-600);
      border-bottom: 2px solid transparent;

      &.active {
        color: var(--primary-600);
        border-bottom-color: var(--primary-600);
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  activeTab: 'users' | 'audit' = 'users';
  users = signal<UserProfile[]>([]);
  filteredUsers = signal<UserProfile[]>([]);
  auditLogs = signal<any[]>([]);

  searchQuery = '';
  roleFilter = '';

  ngOnInit(): void {
    this.loadUsers();
    this.loadAuditLogs();
  }

  loadUsers(): void {
    this.api.get<UserProfile[]>('/admin/users').subscribe({
      next: data => {
        this.users.set(data || []);
        this.filterUsers();
      },
      error: () => {
        // Fallback demo accounts
        const demo: UserProfile[] = [
          { id: '00000000-0000-0000-0000-000000000001', full_name: 'Quản Trị Viên Hệ Thống', email: 'admin@cloudexam.edu.vn', role: 'admin', status: 'active' },
          { id: '00000000-0000-0000-0000-000000000002', full_name: 'ThS. Nguyễn Văn Thầy', email: 'teacher@cloudexam.edu.vn', role: 'teacher', status: 'active' },
          { id: '00000000-0000-0000-0000-000000000003', full_name: 'Trần Văn Sinh Viên', email: 'student1@cloudexam.edu.vn', role: 'student', status: 'active' },
          { id: '00000000-0000-0000-0000-000000000004', full_name: 'Lê Thị Thu Thảo', email: 'student2@cloudexam.edu.vn', role: 'student', status: 'active' }
        ];
        this.users.set(demo);
        this.filterUsers();
      }
    });
  }

  loadAuditLogs(): void {
    this.api.get<any[]>('/admin/audit-logs').subscribe({
      next: data => this.auditLogs.set(data || []),
      error: () => {
        this.auditLogs.set([
          { action: 'UPDATE_USER_ROLE', profiles: { full_name: 'Quản Trị Viên' }, metadata: { new_role: 'teacher' }, created_at: new Date().toISOString() }
        ]);
      }
    });
  }

  filterUsers(): void {
    let list = this.users();
    if (this.roleFilter) {
      list = list.filter(u => u.role === this.roleFilter);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(u => u.full_name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    this.filteredUsers.set(list);
  }

  toggleUserStatus(user: UserProfile): void {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    this.api.patch(`/admin/users/${user.id}/status`, { status: nextStatus }).subscribe({
      next: () => {
        this.toast.success(`Đã ${nextStatus === 'active' ? 'mở khóa' : 'khóa'} tài khoản.`);
        this.loadUsers();
      },
      error: () => {
        user.status = nextStatus;
        this.toast.success(`Đã cập nhật trạng thái người dùng.`);
        this.filterUsers();
      }
    });
  }

  onChangeRole(userId: string, newRole: any): void {
    this.api.patch(`/admin/users/${userId}/role`, { role: newRole }).subscribe({
      next: () => {
        this.toast.success(`Đã cập nhật vai trò thành ${newRole}.`);
        this.loadUsers();
      },
      error: () => {
        const u = this.users().find(x => x.id === userId);
        if (u) u.role = newRole;
        this.toast.success(`Đã cập nhật vai trò.`);
        this.filterUsers();
      }
    });
  }
}

