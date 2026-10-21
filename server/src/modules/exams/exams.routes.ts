import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validateRequest } from '../../middleware/validate';
import { getSupabaseAdmin } from '../../config/supabase';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

// GET /api/v1/exams
router.get('/', authenticate, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const user = req.user!;

  if (user.role === 'admin') {
    const { data, error } = await supabase
      .from('exams')
      .select('*, classes(name), profiles:teacher_id(full_name), exam_questions(count)')
      .order('created_at', { ascending: false });

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data);
  }

  if (user.role === 'teacher') {
    const { data, error } = await supabase
      .from('exams')
      .select('*, classes(name), exam_questions(count)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data);
  }

  // Student: Find published exams in classes student is enrolled in
  const { data: memberClasses } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('student_id', user.id);

  const classIds = (memberClasses || []).map(m => m.class_id);
  if (classIds.length === 0) return sendSuccess(res, []);

  const { data, error } = await supabase
    .from('exams')
    .select('*, classes(name), profiles:teacher_id(full_name), exam_questions(count)')
    .in('class_id', classIds)
    .eq('status', 'published')
    .order('start_at', { ascending: true });

  if (error) return sendError(res, error.message, 500);
  return sendSuccess(res, data);
});

// POST /api/v1/exams
const createExamSchema = z.object({
  class_id: z.string().uuid('Mã lớp học không hợp lệ'),
  title: z.string().min(3, 'Tiêu đề kỳ thi quá ngắn'),
  description: z.string().optional(),
  duration_minutes: z.number().int().min(1, 'Thời gian làm bài tối thiểu 1 phút'),
  start_at: z.string().datetime('Thời gian bắt đầu không hợp lệ'),
  end_at: z.string().datetime('Thời gian kết thúc không hợp lệ'),
  max_attempts: z.number().int().min(1).default(1),
  pass_score: z.number().min(0).default(5.0),
  shuffle_questions: z.boolean().default(false),
  shuffle_options: z.boolean().default(false),
  results_release_at: z.string().datetime().nullable().optional(),
  answers_release_at: z.string().datetime().nullable().optional()
});

router.post(
  '/',
  authenticate,
  requireRole('teacher', 'admin'),
  validateRequest({ body: createExamSchema }),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const body = req.body;

    if (new Date(body.end_at) <= new Date(body.start_at)) {
      return sendError(res, 'Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.', 400);
    }

    // Verify teacher owns the class
    if (req.user!.role === 'teacher') {
      const { data: cls } = await supabase.from('classes').select('teacher_id').eq('id', body.class_id).single();
      if (!cls || cls.teacher_id !== req.user!.id) {
        return sendError(res, 'Bạn không phải giáo viên phụ trách lớp học này.', 403);
      }
    }

    const { data, error } = await supabase
      .from('exams')
      .insert({
        ...body,
        teacher_id: req.user!.id,
        status: 'draft'
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, 'Tạo đề thi mới thành công', 201);
  }
);

// GET /api/v1/exams/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const examId = req.params.id;
  const user = req.user!;

  const { data: exam, error } = await supabase
    .from('exams')
    .select('*, classes(name), profiles:teacher_id(full_name)')
    .eq('id', examId)
    .single();

  if (error || !exam) return sendError(res, 'Không tìm thấy kỳ thi.', 404);

  // Check student access
  if (user.role === 'student') {
    if (exam.status !== 'published') {
      return sendError(res, 'Kỳ thi chưa được xuất bản.', 403);
    }
    const { data: membership } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', exam.class_id)
      .eq('student_id', user.id)
      .maybeSingle();

    if (!membership) return sendError(res, 'Bạn không thuộc lớp học này.', 403);

    // Get previous attempts count for this student
    const { count: attemptCount } = await supabase
      .from('exam_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', examId)
      .eq('student_id', user.id);

    return sendSuccess(res, {
      ...exam,
      student_attempts_count: attemptCount || 0
    });
  }

  // Teacher or Admin: include assigned questions WITH correct answers
  const { data: examQuestions } = await supabase
    .from('exam_questions')
    .select('points, position, questions(*)')
    .eq('exam_id', examId)
    .order('position', { ascending: true });

  return sendSuccess(res, {
    ...exam,
    questions: examQuestions
  });
});

// POST /api/v1/exams/:id/questions (Assign questions to exam)
const assignQuestionsSchema = z.object({
  questions: z.array(z.object({
    question_id: z.string().uuid(),
    points: z.number().min(0.1),
    position: z.number().int().default(0)
  })).min(1, 'Cần ít nhất một câu hỏi')
});

router.post(
  '/:id/questions',
  authenticate,
  requireRole('teacher', 'admin'),
  validateRequest({ body: assignQuestionsSchema }),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const examId = req.params.id;

    const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).single();
    if (!exam) return sendError(res, 'Kỳ thi không tồn tại.', 404);
    if (req.user!.role === 'teacher' && exam.teacher_id !== req.user!.id) {
      return sendError(res, 'Không có quyền chỉnh sửa đề thi này.', 403);
    }

    // Insert questions
    const records = req.body.questions.map((q: any) => ({
      exam_id: examId,
      question_id: q.question_id,
      points: q.points,
      position: q.position
    }));

    const { data, error } = await supabase
      .from('exam_questions')
      .upsert(records, { onConflict: 'exam_id,question_id' })
      .select();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, 'Đã cập nhật câu hỏi cho đề thi');
  }
);

// DELETE /api/v1/exams/:id/questions/:questionId
router.delete(
  '/:id/questions/:questionId',
  authenticate,
  requireRole('teacher', 'admin'),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { id: examId, questionId } = req.params;

    const { error } = await supabase
      .from('exam_questions')
      .delete()
      .eq('exam_id', examId)
      .eq('question_id', questionId);

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, null, 'Đã xóa câu hỏi khỏi đề thi');
  }
);

// POST /api/v1/exams/:id/publish
router.post('/:id/publish', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const examId = req.params.id;

  // Check question count
  const { count } = await supabase
    .from('exam_questions')
    .select('*', { count: 'exact', head: true })
    .eq('exam_id', examId);

  if (!count || count === 0) {
    return sendError(res, 'Không thể xuất bản đề thi chưa có câu hỏi nào.', 400);
  }

  const { data, error } = await supabase
    .from('exams')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', examId)
    .select()
    .single();

  if (error) return sendError(res, error.message, 500);
  return sendSuccess(res, data, 'Đã xuất bản đề thi thành công');
});

// POST /api/v1/exams/:id/close
router.post('/:id/close', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const examId = req.params.id;

  const { data, error } = await supabase
    .from('exams')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', examId)
    .select()
    .single();

  if (error) return sendError(res, error.message, 500);
  return sendSuccess(res, data, 'Đã đóng kỳ thi thành công');
});

export default router;

