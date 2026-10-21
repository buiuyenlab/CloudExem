# ☁️ CLOUDEXAM – HỆ THỐNG THI TRỰC TUYẾN TRÊN NỀN TẢNG CLOUD

**CloudExam** là hệ thống quản lý và tổ chức thi trắc nghiệm trực tuyến nhiều người dùng, xây dựng theo kiến trúc hiện đại, an toàn và tối ưu cho việc triển khai trên **Vercel** (Serverless REST API + Angular SPA) và **Supabase** (PostgreSQL Database + Row Level Security + Supabase Auth).

---

## 🏛️ 1. Kiến Trúc Hệ Thống

```
Angular 18 Frontend  ──(HTTPS REST API)──>  Vercel Serverless Function (Express + TS)  ──>  Supabase (PostgreSQL + RLS)
                                                     │
                                                     └──(Auth Verification)──>  Supabase Auth (JWT)
```

### Nguyên tắc bảo mật cốt lõi:
1. **Zero Client Trust:** Không tin tưởng bất kỳ dữ liệu điểm số, thời gian nộp bài, thời hạn thi hay role do client gửi lên.
2. **Server-Driven Timing:** Thời điểm bắt đầu (`started_at`) và hạn nộp bài (`deadline_at`) được máy chủ tính toán và lưu trong cơ sở dữ liệu. Đồng hồ máy khách chỉ dùng cho trải nghiệm hiển thị (UX).
3. **Bảo mật đáp án:** Cột `correct_answers` không bao giờ được gửi xuống client khi làm bài thi. Sinh viên chỉ được xem bài giải sau khi kỳ thi kết thúc hoặc đến mốc `answers_release_at`.
4. **Row Level Security (RLS):** Bật RLS trên 100% các bảng database. Chống privilege escalation bằng Database Triggers và RLS Check.
5. **Idempotent Submission:** Nộp bài nhiều lần (double submit / network retry) được xử lý an toàn, chỉ chấm điểm 1 lần duy nhất và trả về kết quả nhất quán.
6. **Thuật toán chấm điểm chuẩn xác:**
   - **Single Choice / True-False:** Khớp đúng 1 đáp án duy nhất.
   - **Multiple Choice:** Mặc định yêu cầu thí sinh chọn **chính xác toàn bộ đáp án đúng** và **không có lựa chọn sai thừa**.

---

## 📁 2. Cấu Trúc Thư Mục

```
CloudExem/
├── frontend/                     # Ứng dụng Angular 18 (Standalone Components, SCSS, Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/             # Auth service, API client, Guards, Interceptors, Models
│   │   │   ├── shared/           # Header, Sidebar, Modal, Toast notification, Badges
│   │   │   ├── layouts/          # MainLayout (Dashboard Portal) & AuthLayout
│   │   │   └── features/
│   │   │       ├── landing/      # Trang giới thiệu CloudExam
│   │   │       ├── auth/         # Đăng nhập, Đăng ký, Quên mật khẩu, Tài khoản bị khóa
│   │   │       ├── dashboard/    # Bảng điều khiển riêng cho Admin, Giáo viên, Sinh viên
│   │   │       ├── classes/      # Quản lý lớp, tạo mã mời (join code), sinh viên tham gia lớp
│   │   │       ├── question-banks/ # Ngân hàng câu hỏi, tạo câu hỏi 1 đáp án, nhiều đáp án, đúng/sai
│   │   │       ├── exams/        # Thiết lập đề thi, chọn câu hỏi từ ngân hàng, xuất bản/đóng đề
│   │   │       ├── exam-taking/  # Phòng thi: Đếm ngược máy chủ, tự động lưu debounce, palette câu hỏi
│   │   │       ├── results/      # Xem kết quả, xem lại bài thi theo chính sách, xuất CSV bảng điểm
│   │   │       ├── admin/        # Quản trị tài khoản, khóa/mở khóa, thăng cấp vai trò, nhật ký audit
│   │   │       └── errors/       # Trang lỗi 403 Forbidden, 404 Not Found
│   │   └── styles.scss           # Hệ thống Design System màu sắc, typography, card, badge
│   ├── angular.json
│   └── package.json
├── server/                       # REST API (Express.js + TypeScript + Zod)
│   ├── src/
│   │   ├── config/               # Supabase Client, Supabase Admin Service Role, Env validation
│   │   ├── middleware/           # authGuard (JWT), roleGuard, request validator (Zod), errorHandler
│   │   ├── modules/
│   │   │   ├── auth/             # /api/v1/me, /api/v1/me/profile
│   │   │   ├── classes/          # Quản lý lớp học & sinh viên trong lớp
│   │   │   ├── questions/        # Quản lý ngân hàng câu hỏi & câu hỏi trắc nghiệm
│   │   │   ├── exams/            # Quản lý đề thi & xuất bản đề
│   │   │   ├── attempts/         # Nghiệp vụ thi: Bắt đầu, Autosave câu trả lời, Nộp bài & Tự chấm
│   │   │   └── admin/            # Thống kê tổng quan, quản lý người dùng, Audit logs
│   │   ├── utils/                # CSV exporter UTF-8 BOM, logger, ApiResponse helper
│   │   ├── app.ts                # Khởi tạo Express app
│   │   └── server.ts             # Khởi chạy Express server cục bộ
│   └── package.json
├── api/
│   └── index.ts                  # Vercel Serverless Function entry point
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # Schema các bảng, foreign keys, indexes, enums
│   │   └── 002_rls_and_functions.sql # RLS policies, trigger chống nâng quyền, hàm RPC nguyên tử
│   ├── seed.sql                  # Dữ liệu mẫu khởi tạo (User, Class, Question Bank, Questions, Exam)
│   └── config.toml
├── tests/
│   └── attempts.service.test.ts  # Unit tests cho Scoring Engine và Business Logic
├── vercel.json                   # Cấu hình routing /api/(.*) và Angular SPA
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 3. Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local Development)

### Bước 1: Thiết lập Cơ sở dữ liệu Supabase
1. Truy cập [database.new](https://database.new) và tạo project Supabase mới.
2. Mở tab **SQL Editor** trong Supabase Dashboard.
3. Mở và chạy lần lượt 2 file migration:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_and_functions.sql`
4. Chạy file `supabase/seed.sql` để nạp dữ liệu mẫu ban đầu (nếu muốn).

### Bước 2: Thiết lập Biến Môi Trường
Sao chép `.env.example` thành `.env`:
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
CORS_ORIGIN=*
```

### Bước 3: Chạy Backend Server
```powershell
cd server
npm install
npm run dev
```
*API sẽ chạy tại: `http://localhost:5000` (Kiểm tra healthcheck tại `http://localhost:5000/api/v1/health`)*

### Bước 4: Chạy Frontend Angular
Mở một cửa sổ terminal mới:
```powershell
cd frontend
npm install
npm start
```
*Giao diện người dùng sẽ chạy tại: `http://localhost:4200`*

---

## 🔐 4. Quy Trình Khởi Tạo Tài Khoản Admin Đầu Tiên An Toàn

Nhằm bảo vệ hệ thống tuyệt đối khỏi các cuộc tấn công leo thang đặc quyền (Privilege Escalation), **CloudExam không cho phép người dùng tự chọn role Admin khi đăng ký**:
1. Đăng ký một tài khoản bình thường trên giao diện `/auth/register` (hệ thống sẽ tự động gán role `student`).
2. Mở Supabase Dashboard -> **SQL Editor** và chạy câu lệnh sau để thăng cấp tài khoản đó thành Admin:
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE id = (SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com');
   ```
3. Sau khi có tài khoản Admin đầu tiên, Admin có thể đăng nhập vào trang `/admin/users` để phân quyền cho các Giáo viên và Quản trị viên khác trực tiếp từ giao diện web.

---

## 🌐 5. Hướng Dẫn Triển Khai Lên Vercel

### Cách 1: Triển khai Monorepo dự án duy nhất (Khuyến nghị)
1. Đẩy mã nguồn lên kho chứa GitHub.
2. Truy cập [vercel.com/new](https://vercel.com/new) và chọn repository của bạn.
3. Trong phần cấu hình Vercel Project Settings:
   - **Framework Preset:** Chọn `Other` (hoặc để Vercel tự nhận diện qua `vercel.json`).
   - **Root Directory:** `./`
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Output Directory:** `frontend/dist/cloudexam/browser`
4. Cấu hình **Environment Variables** trên Vercel:
   - `SUPABASE_URL`: URL của Supabase.
   - `SUPABASE_ANON_KEY`: Khóa công khai của Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: Khóa bí mật (chỉ sử dụng trên Vercel Functions).
5. Nhấn **Deploy**.

---

## 🧪 6. Kiểm Thử Hệ Thống (Testing)

Dự án đã tích hợp sẵn bộ kiểm thử đơn vị (Unit Tests) cho **Scoring Engine** (xử lý chấm điểm câu 1 đáp án, nhiều đáp án, đúng/sai) và **Middleware Authorization**:

```powershell
cd server
npm test
```

Kết quả:
```text
✓ src/modules/attempts/attempts.service.spec.ts (11 tests)
✓ src/middleware/middleware.spec.ts (4 tests)

Test Files  2 passed (2)
Tests       15 passed (15)
```

