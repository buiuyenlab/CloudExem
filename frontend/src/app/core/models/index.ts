export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
}

export interface ClassItem {
  id: string;
  name: string;
  description?: string;
  join_code: string;
  teacher_id: string;
  status: 'active' | 'archived';
  created_at: string;
  class_members?: { count: number }[];
  profiles?: { full_name: string };
  joined_at?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  bank_id: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  content: string;
  image_url?: string | null;
  options: QuestionOption[];
  correct_answers?: string[]; // Only available for teacher/admin
  difficulty: 'easy' | 'medium' | 'hard';
  default_points: number;
  points?: number;
}

export interface QuestionBank {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  questions?: { count: number }[];
}

export interface Exam {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  start_at: string;
  end_at: string;
  max_attempts: number;
  pass_score: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  status: 'draft' | 'published' | 'closed' | 'archived';
  results_release_at?: string | null;
  answers_release_at?: string | null;
  created_at: string;
  classes?: { name: string };
  profiles?: { full_name: string };
  exam_questions?: { count: number }[];
  student_attempts_count?: number;
  questions?: any[];
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  attempt_number: number;
  started_at: string;
  deadline_at: string;
  submitted_at?: string;
  status: 'in_progress' | 'submitted' | 'timed_out';
  score?: number;
  total_points?: number;
  remaining_seconds?: number;
  exam_title?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

