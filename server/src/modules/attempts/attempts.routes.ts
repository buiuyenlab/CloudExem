import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validateRequest } from '../../middleware/validate';
import { getSupabaseAdmin } from '../../config/supabase';
import { sendSuccess, sendError } from '../../utils/response';
import { gradeExamAttempt } from './attempts.service';

const router = Router();

// Helper to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// POST /api/v1/exams/:id/attempts (Start or Resume Attempt)
router.post('/exams/:id/attempts', authenticate, requireRole('student'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const examId = req.params.id;
  const studentId = req.user!.id;
  const now = new Date();

  // 1. Check exam validity
  const { data: exam, error: examErr } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .single();

  if (examErr || !exam) {
    return sendError(res, 'Kỳ thi không tồn tại.', 404);
  }

  if (exam.status !== 'published') {
    return sendError(res, 'Kỳ thi chưa được mở hoặc đã kết thúc.', 403);
  }

  const startAt = new Date(exam.start_at);
  const endAt = new Date(exam.end_at);

  if (now < startAt) {
    return sendError(res, 'Kỳ thi chưa đến thời gian mở.', 400);
  }

  if (now > endAt) {
    return sendError(res, 'Kỳ thi đã kết thúc thời gian làm bài.', 400);
  }

  // 2. Check student membership in class
  const { data: member } = await supabase
    .from('class_members')
    .select('id')
    .eq('class_id', exam.class_id)
    .eq('student_id', studentId)
    .maybeSingle();

  if (!member) {
    return sendError(res, 'Bạn không thuộc danh sách sinh viên của lớp học này.', 403);
  }

  // 3. Check for existing active attempt to resume
  const { data: existingActive } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .eq('status', 'in_progress')
    .order('attempt_number', { ascending: false })
    .maybeSingle();

  if (existingActive) {
    const deadline = new Date(existingActive.deadline_at);
    // If within deadline + 15s grace, resume it
    if (now.getTime() <= deadline.getTime() + 15000) {
      return sendSuccess(res, { attempt: existingActive, resumed: true }, 'Tiếp tục bài thi đang làm');
    } else {
      // Mark as timed out
      await supabase.from('exam_attempts').update({ status: 'timed_out' }).eq('id', existingActive.id);
    }
  }

  // 4. Check total attempts
  const { count: attemptCount } = await supabase
    .from('exam_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('exam_id', examId)
    .eq('student_id', studentId);

  if ((attemptCount || 0) >= exam.max_attempts) {
    return sendError(res, `Bạn đã hết số lần làm bài cho phép (${exam.max_attempts} lần).`, 403);
  }

  // 5. Calculate deadline (server enforced)
  const durationMs = exam.duration_minutes * 60 * 1000;
  const calculatedDeadline = new Date(Math.min(now.getTime() + durationMs, endAt.getTime()));

  // 6. Create attempt
  const { data: newAttempt, error: insertErr } = await supabase
    .from('exam_attempts')
    .insert({
      exam_id: examId,
      student_id: studentId,
      attempt_number: (attemptCount || 0) + 1,
      started_at: now.toISOString(),
      deadline_at: calculatedDeadline.toISOString(),
      status: 'in_progress',
      grading_status: 'pending'
    })
    .select()
    .single();

  if (insertErr) {
    return sendError(res, 'Không thể khởi tạo lượt làm bài: ' + insertErr.message, 500);
  }

  return sendSuccess(res, { attempt: newAttempt, resumed: false }, 'Bắt đầu làm bài thi', 201);
});

// GET /api/v1/attempts/:id (Get Exam Room Questions and Saved Answers)
router.get('/attempts/:id', authenticate, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const attemptId = req.params.id;
  const user = req.user!;
  const now = new Date();

  const { data: attempt, error } = await supabase
    .from('exam_attempts')
    .select('*, exams(*)')
    .eq('id', attemptId)
    .single();

  if (error || !attempt) return sendError(res, 'Không tìm thấy lượt làm bài.', 404);

  // Authorization check
  if (user.role === 'student' && attempt.student_id !== user.id) {
    return sendError(res, 'Bạn không có quyền truy cập lượt thi này.', 403);
  }

  // If in_progress and passed deadline + 20s, auto-submit and grade
  const deadline = new Date(attempt.deadline_at);
  if (attempt.status === 'in_progress' && now.getTime() > deadline.getTime() + 20000) {
    const graded = await gradeExamAttempt(attemptId);
    attempt.status = graded.status;
    attempt.score = graded.score;
  }

  // Fetch questions for this exam
  const { data: examQuestions } = await supabase
    .from('exam_questions')
    .select('points, position, questions(id, question_type, content, image_url, options, difficulty)')
    .eq('exam_id', attempt.exam_id)
    .order('position', { ascending: true });

  // Sanitize questions: Ensure correct_answers is NEVER present
  let questions = (examQuestions || []).map(eq => {
    const q = eq.questions as any;
    let options = q.options || [];
    if (attempt.exams?.shuffle_options) {
      options = shuffleArray(options);
    }
    return {
      id: q.id,
      question_type: q.question_type,
      content: q.content,
      image_url: q.image_url,
      options,
      points: eq.points,
      difficulty: q.difficulty
    };
  });

  if (attempt.exams?.shuffle_questions) {
    questions = shuffleArray(questions);
  }

  // Fetch student's saved answers
  const { data: savedAnswers } = await supabase
    .from('attempt_answers')
    .select('question_id, answer_data')
    .eq('attempt_id', attemptId);

  const answersMap: Record<string, string[]> = {};
  (savedAnswers || []).forEach(a => {
    answersMap[a.question_id] = a.answer_data;
  });

  const remainingSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));

  return sendSuccess(res, {
    attempt: {
      id: attempt.id,
      exam_id: attempt.exam_id,
      attempt_number: attempt.attempt_number,
      started_at: attempt.started_at,
      deadline_at: attempt.deadline_at,
      status: attempt.status,
      score: attempt.status === 'submitted' ? attempt.score : undefined,
      remaining_seconds: remainingSeconds,
      exam_title: attempt.exams?.title
    },
    questions,
    saved_answers: answersMap
  });
});

// PUT /api/v1/attempts/:id/answers/:questionId (Autosave Single Answer)
const saveAnswerSchema = z.object({
  answer_data: z.array(z.string()).default([])
});

router.put(
  '/attempts/:id/answers/:questionId',
  authenticate,
  requireRole('student'),
  validateRequest({ body: saveAnswerSchema }),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { id: attemptId, questionId } = req.params;
    const now = new Date();

    // 1. Fetch attempt
    const { data: attempt } = await supabase
      .from('exam_attempts')
      .select('id, student_id, status, deadline_at')
      .eq('id', attemptId)
      .single();

    if (!attempt) return sendError(res, 'Không tìm thấy bài làm.', 404);
    if (attempt.student_id !== req.user!.id) return sendError(res, 'Không có quyền.', 403);

    if (attempt.status !== 'in_progress') {
      return sendError(res, 'Bài thi đã kết thúc hoặc đã nộp.', 400);
    }

    // 2. Deadline verification with 15-second network grace period
    const deadline = new Date(attempt.deadline_at);
    if (now.getTime() > deadline.getTime() + 15000) {
      return sendError(res, 'Đã hết thời gian làm bài, không thể lưu đáp án.', 400, 'EXAM_TIMED_OUT');
    }

    // 3. Upsert into attempt_answers
    const { error } = await supabase
      .from('attempt_answers')
      .upsert({
        attempt_id: attemptId,
        question_id: questionId,
        answer_data: req.body.answer_data,
        updated_at: now.toISOString()
      }, { onConflict: 'attempt_id,question_id' });

    if (error) return sendError(res, 'Lỗi lưu đáp án: ' + error.message, 500);
    return sendSuccess(res, { saved: true, saved_at: now.toISOString() });
  }
);

// POST /api/v1/attempts/:id/submit (Submit & Auto-Grade Exam)
router.post('/attempts/:id/submit', authenticate, requireRole('student'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const attemptId = req.params.id;

  const { data: attempt } = await supabase
    .from('exam_attempts')
    .select('student_id, status')
    .eq('id', attemptId)
    .single();

  if (!attempt) return sendError(res, 'Lượt làm bài không tồn tại.', 404);
  if (attempt.student_id !== req.user!.id) return sendError(res, 'Không có quyền.', 403);

  // If already submitted (idempotent submission), return success
  if (attempt.status === 'submitted') {
    return sendSuccess(res, attempt, 'Bài thi đã được nộp trước đó.');
  }

  // Grade the attempt atomically
  try {
    const result = await gradeExamAttempt(attemptId);
    return sendSuccess(res, result, 'Nộp bài thi và chấm điểm thành công');
  } catch (err: any) {
    return sendError(res, 'Lỗi khi nộp bài: ' + err.message, 500);
  }
});

// GET /api/v1/attempts/:id/result (View Results Based on Policy)
router.get('/attempts/:id/result', authenticate, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const attemptId = req.params.id;
  const user = req.user!;
  const now = new Date();

  const { data: attempt, error } = await supabase
    .from('exam_attempts')
    .select('*, exams(*), profiles:student_id(full_name, id)')
    .eq('id', attemptId)
    .single();

  if (error || !attempt) return sendError(res, 'Không tìm thấy kết quả.', 404);

  // Authorization check
  const isOwner = attempt.student_id === user.id;
  const isTeacherOrAdmin = user.role === 'admin' || (user.role === 'teacher' && attempt.exams?.teacher_id === user.id);

  if (!isOwner && !isTeacherOrAdmin) {
    return sendError(res, 'Bạn không có quyền xem kết quả bài thi này.', 403);
  }

  const exam = attempt.exams;
  const canSeeScore = isTeacherOrAdmin || !exam.results_release_at || now >= new Date(exam.results_release_at);
  const canSeeAnswers = isTeacherOrAdmin || !exam.answers_release_at || now >= new Date(exam.answers_release_at);

  if (!canSeeScore) {
    return sendSuccess(res, {
      id: attempt.id,
      exam_title: exam.title,
      status: attempt.status,
      submitted_at: attempt.submitted_at,
      score_released: false,
      message: `Điểm số sẽ được công bố vào lúc ${new Date(exam.results_release_at).toLocaleString('vi-VN')}`
    });
  }

  // Fetch question review if answers are released
  let questionsReview = null;
  if (canSeeAnswers) {
    const { data: answers } = await supabase
      .from('attempt_answers')
      .select('*, questions(content, image_url, options, correct_answers, question_type)')
      .eq('attempt_id', attemptId);

    questionsReview = answers;
  }

  return sendSuccess(res, {
    id: attempt.id,
    exam_id: attempt.exam_id,
    exam_title: exam.title,
    student_name: attempt.profiles?.full_name,
    score: attempt.score,
    total_points: attempt.total_points,
    pass_score: exam.pass_score,
    is_passed: Number(attempt.score) >= Number(exam.pass_score),
    status: attempt.status,
    submitted_at: attempt.submitted_at,
    duration_used_seconds: attempt.submitted_at
      ? Math.floor((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000)
      : null,
    answers_released: canSeeAnswers,
    review: questionsReview
  });
});

export default router;

