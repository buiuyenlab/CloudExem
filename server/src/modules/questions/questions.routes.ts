import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validateRequest } from '../../middleware/validate';
import { getSupabaseAdmin } from '../../config/supabase';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

// ==========================================
// QUESTION BANKS
// ==========================================

// GET /api/v1/question-banks
router.get('/question-banks', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('question_banks')
    .select('*, questions(count)')
    .order('created_at', { ascending: false });

  if (req.user!.role === 'teacher') {
    query = query.eq('teacher_id', req.user!.id);
  }

  const { data, error } = await query;
  if (error) return sendError(res, error.message, 500);
  return sendSuccess(res, data);
});

// POST /api/v1/question-banks
const createBankSchema = z.object({
  name: z.string().min(2, 'Tên ngân hàng câu hỏi quá ngắn'),
  description: z.string().optional()
});

router.post(
  '/question-banks',
  authenticate,
  requireRole('teacher', 'admin'),
  validateRequest({ body: createBankSchema }),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('question_banks')
      .insert({
        name: req.body.name,
        description: req.body.description || '',
        teacher_id: req.user!.id
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, 'Tạo ngân hàng câu hỏi thành công', 201);
  }
);

// GET /api/v1/question-banks/:id
router.get('/question-banks/:id', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const bankId = req.params.id;

  const { data, error } = await supabase
    .from('question_banks')
    .select('*')
    .eq('id', bankId)
    .single();

  if (error || !data) return sendError(res, 'Không tìm thấy ngân hàng câu hỏi.', 404);
  if (req.user!.role === 'teacher' && data.teacher_id !== req.user!.id) {
    return sendError(res, 'Bạn không có quyền truy cập ngân hàng này.', 403);
  }

  return sendSuccess(res, data);
});

// PATCH /api/v1/question-banks/:id
router.patch(
  '/question-banks/:id',
  authenticate,
  requireRole('teacher', 'admin'),
  validateRequest({ body: createBankSchema }),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const bankId = req.params.id;

    if (req.user!.role === 'teacher') {
      const { data: bank } = await supabase.from('question_banks').select('teacher_id').eq('id', bankId).single();
      if (!bank || bank.teacher_id !== req.user!.id) return sendError(res, 'Không có quyền.', 403);
    }

    const { data, error } = await supabase
      .from('question_banks')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', bankId)
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, 'Cập nhật thành công');
  }
);

// DELETE /api/v1/question-banks/:id
router.delete('/question-banks/:id', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const bankId = req.params.id;

  if (req.user!.role === 'teacher') {
    const { data: bank } = await supabase.from('question_banks').select('teacher_id').eq('id', bankId).single();
    if (!bank || bank.teacher_id !== req.user!.id) return sendError(res, 'Không có quyền.', 403);
  }

  const { error } = await supabase.from('question_banks').delete().eq('id', bankId);
  if (error) return sendError(res, error.message, 500);
  return sendSuccess(res, null, 'Đã xóa ngân hàng câu hỏi');
});

// ==========================================
// QUESTIONS
// ==========================================

// GET /api/v1/question-banks/:id/questions
router.get(
  '/question-banks/:id/questions',
  authenticate,
  requireRole('teacher', 'admin'),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const bankId = req.params.id;

    if (req.user!.role === 'teacher') {
      const { data: bank } = await supabase.from('question_banks').select('teacher_id').eq('id', bankId).single();
      if (!bank || bank.teacher_id !== req.user!.id) return sendError(res, 'Không có quyền.', 403);
    }

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('bank_id', bankId)
      .order('created_at', { ascending: true });

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data);
  }
);

// POST /api/v1/question-banks/:id/questions
const optionItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1, 'Nội dung lựa chọn không được để trống')
});

const questionSchema = z.object({
  question_type: z.enum(['single_choice', 'multiple_choice', 'true_false']),
  content: z.string().min(3, 'Nội dung câu hỏi quá ngắn'),
  image_url: z.string().url().nullable().optional(),
  options: z.array(optionItemSchema).min(2, 'Phải có ít nhất 2 phương án lựa chọn'),
  correct_answers: z.array(z.string()).min(1, 'Phải có ít nhất một đáp án đúng'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  default_points: z.number().min(0.1, 'Điểm số phải lớn hơn 0').default(1.0)
});

router.post(
  '/question-banks/:id/questions',
  authenticate,
  requireRole('teacher', 'admin'),
  validateRequest({ body: questionSchema }),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const bankId = req.params.id;

    if (req.user!.role === 'teacher') {
      const { data: bank } = await supabase.from('question_banks').select('teacher_id').eq('id', bankId).single();
      if (!bank || bank.teacher_id !== req.user!.id) return sendError(res, 'Không có quyền.', 403);
    }

    // Validate that correct_answers match option IDs
    const optionIds = new Set(req.body.options.map((o: any) => o.id));
    for (const ans of req.body.correct_answers) {
      if (!optionIds.has(ans)) {
        return sendError(res, `Đáp án đúng "${ans}" không khớp với bất kỳ phương án nào.`, 400);
      }
    }

    if (req.body.question_type === 'single_choice' && req.body.correct_answers.length !== 1) {
      return sendError(res, 'Câu hỏi một đáp án đúng chỉ được chọn duy nhất 1 đáp án.', 400);
    }

    const { data, error } = await supabase
      .from('questions')
      .insert({
        ...req.body,
        bank_id: bankId
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, 'Thêm câu hỏi thành công', 201);
  }
);

// PATCH /api/v1/questions/:id
router.patch(
  '/questions/:id',
  authenticate,
  requireRole('teacher', 'admin'),
  validateRequest({ body: questionSchema.partial() }),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const questionId = req.params.id;

    const { data: question } = await supabase
      .from('questions')
      .select('*, question_banks(teacher_id)')
      .eq('id', questionId)
      .single();

    if (!question) return sendError(res, 'Không tìm thấy câu hỏi.', 404);
    if (req.user!.role === 'teacher' && question.question_banks?.teacher_id !== req.user!.id) {
      return sendError(res, 'Không có quyền sửa câu hỏi này.', 403);
    }

    const { data, error } = await supabase
      .from('questions')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', questionId)
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, 'Cập nhật câu hỏi thành công');
  }
);

// DELETE /api/v1/questions/:id
router.delete(
  '/questions/:id',
  authenticate,
  requireRole('teacher', 'admin'),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const questionId = req.params.id;

    const { data: question } = await supabase
      .from('questions')
      .select('*, question_banks(teacher_id)')
      .eq('id', questionId)
      .single();

    if (!question) return sendError(res, 'Không tìm thấy câu hỏi.', 404);
    if (req.user!.role === 'teacher' && question.question_banks?.teacher_id !== req.user!.id) {
      return sendError(res, 'Không có quyền xóa câu hỏi này.', 403);
    }

    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, null, 'Đã xóa câu hỏi thành công');
  }
);

export default router;

