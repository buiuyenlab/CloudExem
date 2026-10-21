-- ==============================================================================
-- CLOUDEXAM SEED DATA FOR LOCAL DEVELOPMENT / DEMO
-- ==============================================================================

-- Demo users UUIDs (Simulated Auth Users)
-- Admin: 00000000-0000-0000-0000-000000000001
-- Teacher: 00000000-0000-0000-0000-000000000002
-- Student 1: 00000000-0000-0000-0000-000000000003
-- Student 2: 00000000-0000-0000-0000-000000000004

-- 1. Profiles
INSERT INTO profiles (id, full_name, avatar_url, role, status) VALUES
('00000000-0000-0000-0000-000000000001', 'Quản Trị Viên Hệ Thống', 'https://api.dicebear.com/7.x/bottts/svg?seed=admin', 'admin', 'active'),
('00000000-0000-0000-0000-000000000002', 'ThS. Nguyễn Văn Thầy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher', 'teacher', 'active'),
('00000000-0000-0000-0000-000000000003', 'Trần Văn Sinh Viên', 'https://api.dicebear.com/7.x/avataaars/svg?seed=student1', 'student', 'active'),
('00000000-0000-0000-0000-000000000004', 'Lê Thị Thu Thảo', 'https://api.dicebear.com/7.x/avataaars/svg?seed=student2', 'student', 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. Classes
INSERT INTO classes (id, name, description, join_code, teacher_id, status) VALUES
('11111111-1111-1111-1111-111111111111', 'Điện Toán Đám Mây - Cloud Computing 2026', 'Lớp học nguyên lý đám mây, AWS, GCP, Vercel và Serverless', 'CLOUD26', '00000000-0000-0000-0000-000000000002', 'active'),
('11111111-1111-1111-1111-111111111112', 'Lập Trình Web Nâng Cao - Angular & Express', 'Thực hành phát triển ứng dụng Full-stack hiện đại', 'WEBANG', '00000000-0000-0000-0000-000000000002', 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. Class Members
INSERT INTO class_members (class_id, student_id) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003'),
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- 4. Question Bank
INSERT INTO question_banks (id, teacher_id, name, description) VALUES
('22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000002', 'Ngân Hàng Kiến Trúc Đám Mây & Serverless', 'Bộ câu hỏi trắc nghiệm kiến thức cốt lõi về Cloud, Vercel, Supabase')
ON CONFLICT (id) DO NOTHING;

-- 5. Questions
INSERT INTO questions (id, bank_id, question_type, content, options, correct_answers, difficulty, default_points) VALUES
(
    '33333333-3333-3333-3333-333333333301',
    '22222222-2222-2222-2222-222222222221',
    'single_choice',
    'Mô hình nào sau đây cho phép nhà phát triển chạy code backend mà không cần quản lý máy chủ vật lý hay container liên tục?',
    '[
        {"id": "opt_a", "text": "IaaS (Infrastructure as a Service)"},
        {"id": "opt_b", "text": "Serverless Functions / FaaS"},
        {"id": "opt_c", "text": "Dedicated Bare-metal Server"},
        {"id": "opt_d", "text": "Local VirtualBox"}
    ]'::jsonb,
    '["opt_b"]'::jsonb,
    'easy',
    2.50
),
(
    '33333333-3333-3333-3333-333333333302',
    '22222222-2222-2222-2222-222222222221',
    'multiple_choice',
    'Những thành phần nào sau đây thuộc giải pháp cơ sở dữ liệu và bảo mật do Supabase cung cấp? (Chọn tất cả các đáp án đúng)',
    '[
        {"id": "opt_a", "text": "PostgreSQL Database Engine"},
        {"id": "opt_b", "text": "Row Level Security (RLS)"},
        {"id": "opt_c", "text": "Hadoop HDFS cluster"},
        {"id": "opt_d", "text": "Built-in JWT Authentication"}
    ]'::jsonb,
    '["opt_a", "opt_b", "opt_d"]'::jsonb,
    'medium',
    2.50
),
(
    '33333333-3333-3333-3333-333333333303',
    '22222222-2222-2222-2222-222222222221',
    'true_false',
    'Trong kiến trúc Vercel Serverless Function, các biến lưu trong bộ nhớ RAM của một request sẽ được duy trì vĩnh viễn cho tất cả các user truy cập sau đó. Đúng hay Sai?',
    '[
        {"id": "opt_t", "text": "Đúng"},
        {"id": "opt_f", "text": "Sai"}
    ]'::jsonb,
    '["opt_f"]'::jsonb,
    'easy',
    2.50
),
(
    '33333333-3333-3333-3333-333333333304',
    '22222222-2222-2222-2222-222222222221',
    'single_choice',
    'Cơ chế bảo mật nào trên PostgreSQL đảm bảo người dùng chỉ được xem dòng dữ liệu thuộc quyền sở hữu của họ ngay cả khi truy vấn SELECT * FROM table?',
    '[
        {"id": "opt_a", "text": "Foreign Key Constraints"},
        {"id": "opt_b", "text": "Row Level Security (RLS)"},
        {"id": "opt_c", "text": "Database Indexing B-Tree"},
        {"id": "opt_d", "text": "Table Partitioning"}
    ]'::jsonb,
    '["opt_b"]'::jsonb,
    'medium',
    2.50
)
ON CONFLICT (id) DO NOTHING;

-- 6. Exam
INSERT INTO exams (
    id, class_id, teacher_id, title, description,
    duration_minutes, start_at, end_at, max_attempts, pass_score,
    shuffle_questions, shuffle_options, status,
    results_release_at, answers_release_at
) VALUES (
    '44444444-4444-4444-4444-444444444441',
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000002',
    'Kiểm Tra Giữa Kỳ - Kiến Trúc Cloud & Serverless',
    'Bài thi giữa kỳ kiểm tra kiến thức về Serverless, Supabase PostgreSQL, RLS và Vercel Deployment.',
    30,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '14 days',
    2,
    5.00,
    true,
    true,
    'published',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days'
) ON CONFLICT (id) DO NOTHING;

-- 7. Exam Questions
INSERT INTO exam_questions (exam_id, question_id, points, position) VALUES
('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333301', 2.50, 1),
('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333302', 2.50, 2),
('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333303', 2.50, 3),
('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333304', 2.50, 4)
ON CONFLICT DO NOTHING;

