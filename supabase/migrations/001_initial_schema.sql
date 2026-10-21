-- ==============================================================================
-- CLOUDEXAM DATABASE SCHEMA - MIGRATION 001
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enums
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE class_status AS ENUM ('active', 'archived');
CREATE TYPE question_type_enum AS ENUM ('single_choice', 'multiple_choice', 'true_false');
CREATE TYPE difficulty_enum AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE exam_status_enum AS ENUM ('draft', 'published', 'closed', 'archived');
CREATE TYPE attempt_status_enum AS ENUM ('in_progress', 'submitted', 'timed_out');
CREATE TYPE grading_status_enum AS ENUM ('pending', 'graded');

-- 3. PROFILES Table (Extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'student',
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CLASSES Table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    join_code VARCHAR(10) UNIQUE NOT NULL,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status class_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CLASS_MEMBERS Table
CREATE TABLE class_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_class_student UNIQUE (class_id, student_id)
);

-- 6. QUESTION_BANKS Table
CREATE TABLE question_banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. QUESTIONS Table
-- Note: options structure: [{"id": "opt_1", "text": "Option 1"}, {"id": "opt_2", "text": "Option 2"}]
-- Note: correct_answers structure: ["opt_1"] or ["opt_1", "opt_3"]
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
    question_type question_type_enum NOT NULL DEFAULT 'single_choice',
    content TEXT NOT NULL,
    image_url TEXT,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    difficulty difficulty_enum NOT NULL DEFAULT 'medium',
    default_points NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (default_points >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. EXAMS Table
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    max_attempts INT NOT NULL DEFAULT 1 CHECK (max_attempts > 0),
    pass_score NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (pass_score >= 0),
    shuffle_questions BOOLEAN NOT NULL DEFAULT false,
    shuffle_options BOOLEAN NOT NULL DEFAULT false,
    status exam_status_enum NOT NULL DEFAULT 'draft',
    results_release_at TIMESTAMPTZ,
    answers_release_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_exam_dates CHECK (end_at > start_at)
);

-- 9. EXAM_QUESTIONS Table
CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    points NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (points >= 0),
    position INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_exam_question UNIQUE (exam_id, question_id)
);

-- 10. EXAM_ATTEMPTS Table
CREATE TABLE exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    status attempt_status_enum NOT NULL DEFAULT 'in_progress',
    score NUMERIC(5, 2) DEFAULT 0.00,
    total_points NUMERIC(5, 2) DEFAULT 0.00,
    grading_status grading_status_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attempt_number UNIQUE (exam_id, student_id, attempt_number)
);

-- 11. ATTEMPT_ANSWERS Table
-- answer_data structure: ["opt_1"] or ["opt_1", "opt_3"]
CREATE TABLE attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_correct BOOLEAN DEFAULT NULL,
    awarded_points NUMERIC(5, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)
);

-- 12. AUDIT_LOGS Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_profiles_role_status ON profiles(role, status);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_join_code ON classes(join_code);
CREATE INDEX idx_class_members_class ON class_members(class_id);
CREATE INDEX idx_class_members_student ON class_members(student_id);
CREATE INDEX idx_question_banks_teacher ON question_banks(teacher_id);
CREATE INDEX idx_questions_bank ON questions(bank_id);
CREATE INDEX idx_exams_class ON exams(class_id);
CREATE INDEX idx_exams_teacher ON exams(teacher_id);
CREATE INDEX idx_exams_status_dates ON exams(status, start_at, end_at);
CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX idx_exam_attempts_exam_student ON exam_attempts(exam_id, student_id);
CREATE INDEX idx_exam_attempts_deadline ON exam_attempts(status, deadline_at);
CREATE INDEX idx_attempt_answers_attempt ON attempt_answers(attempt_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

