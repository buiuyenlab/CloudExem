import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validateRequest } from '../../middleware/validate';
import { getSupabaseAdmin } from '../../config/supabase';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

// Generate random uppercase alphanumeric code (e.g., CLOUD8)
function generateJoinCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET /api/v1/classes
router.get('/', authenticate, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const user = req.user!;

  if (user.role === 'admin') {
    const { data, error } = await supabase
      .from('classes')
      .select('*, profiles:teacher_id(full_name, email:id), class_members(count)')
      .order('created_at', { ascending: false });

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data);
  }

  if (user.role === 'teacher') {
    const { data, error } = await supabase
      .from('classes')
      .select('*, class_members(count)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data);
  }

  // Student: list joined classes
  const { data, error } = await supabase
    .from('class_members')
    .select('joined_at, classes(*, profiles:teacher_id(full_name))')
    .eq('student_id', user.id)
    .order('joined_at', { ascending: false });

  if (error) return sendError(res, error.message, 500);
  const classes = (data || []).map(item => ({
    ...item.classes,
    joined_at: item.joined_at
  }));
  return sendSuccess(res, classes);
});

// POST /api/v1/classes
const createClassSchema = z.object({
  name: z.string().min(3, 'Tên lớp phải có ít nhất 3 ký tự'),
  description: z.string().optional()
});

router.post(
  '/',
  authenticate,
  requireRole('teacher', 'admin'),
  validateRequest({ body: createClassSchema }),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const joinCode = generateJoinCode();

    const { data, error } = await supabase
      .from('classes')
      .insert({
        name: req.body.name,
        description: req.body.description || '',
        join_code: joinCode,
        teacher_id: req.user!.id,
        status: 'active'
      })
      .select()
      .single();

    if (error) return sendError(res, 'Không thể tạo lớp học: ' + error.message, 500);
    return sendSuccess(res, data, 'Tạo lớp học thành công', 201);
  }
);

// POST /api/v1/classes/join (or /api/v1/classes/:id/join)
const joinClassSchema = z.object({
  join_code: z.string().min(4, 'Mã lớp không hợp lệ')
});

router.post(
  '/join',
  authenticate,
  requireRole('student'),
  validateRequest({ body: joinClassSchema }),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const code = req.body.join_code.trim().toUpperCase();

    // 1. Find class by code
    const { data: cls, error: clsError } = await supabase
      .from('classes')
      .select('*')
      .eq('join_code', code)
      .eq('status', 'active')
      .single();

    if (clsError || !cls) {
      return sendError(res, 'Mã lớp không chính xác hoặc lớp đã bị lưu trữ.', 404);
    }

    // 2. Check existing membership
    const { data: existing } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', cls.id)
      .eq('student_id', req.user!.id)
      .maybeSingle();

    if (existing) {
      return sendError(res, 'Bạn đã tham gia lớp học này rồi.', 400);
    }

    // 3. Insert membership
    const { data: member, error: joinError } = await supabase
      .from('class_members')
      .insert({
        class_id: cls.id,
        student_id: req.user!.id
      })
      .select()
      .single();

    if (joinError) return sendError(res, 'Không thể tham gia lớp: ' + joinError.message, 500);
    return sendSuccess(res, { class: cls, member }, 'Tham gia lớp học thành công');
  }
);

// GET /api/v1/classes/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const classId = req.params.id;

  const { data: cls, error } = await supabase
    .from('classes')
    .select('*, profiles:teacher_id(full_name, email:id)')
    .eq('id', classId)
    .single();

  if (error || !cls) return sendError(res, 'Không tìm thấy lớp học.', 404);

  // Authorization check: Must be admin, class teacher, or joined student
  if (req.user!.role === 'student') {
    const { data: member } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', classId)
      .eq('student_id', req.user!.id)
      .maybeSingle();

    if (!member) return sendError(res, 'Bạn không có quyền truy cập lớp học này.', 403);
  } else if (req.user!.role === 'teacher' && cls.teacher_id !== req.user!.id) {
    return sendError(res, 'Bạn không phải là giáo viên của lớp này.', 403);
  }

  return sendSuccess(res, cls);
});

// PATCH /api/v1/classes/:id
const updateClassSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'archived']).optional()
});

router.patch(
  '/:id',
  authenticate,
  requireRole('teacher', 'admin'),
  validateRequest({ body: updateClassSchema }),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const classId = req.params.id;

    // Check teacher ownership
    if (req.user!.role === 'teacher') {
      const { data: cls } = await supabase.from('classes').select('teacher_id').eq('id', classId).single();
      if (!cls || cls.teacher_id !== req.user!.id) {
        return sendError(res, 'Bạn không có quyền chỉnh sửa lớp học này.', 403);
      }
    }

    const { data, error } = await supabase
      .from('classes')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', classId)
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, 'Cập nhật thông tin lớp thành công');
  }
);

// GET /api/v1/classes/:id/members
router.get('/:id/members', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const classId = req.params.id;

  const { data, error } = await supabase
    .from('class_members')
    .select('id, joined_at, profiles:student_id(id, full_name, avatar_url, status)')
    .eq('class_id', classId)
    .order('joined_at', { ascending: false });

  if (error) return sendError(res, error.message, 500);
  return sendSuccess(res, data);
});

export default router;

