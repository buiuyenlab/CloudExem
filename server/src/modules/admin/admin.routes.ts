import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validateRequest } from '../../middleware/validate';
import { getSupabaseAdmin } from '../../config/supabase';
import { sendSuccess, sendError } from '../../utils/response';
import { exportToCsv } from '../../utils/csv';

const router = Router();

// ==========================================
// REPORTS & GRADEBOOKS
// ==========================================

// GET /api/v1/exams/:id/results (Teacher/Admin gradebook & CSV export)
router.get('/exams/:id/results', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const examId = req.params.id;
  const isExport = req.query.export === 'csv';

  const { data: exam } = await supabase.from('exams').select('*, classes(name)').eq('id', examId).single();
  if (!exam) return sendError(res, 'Kỳ thi không tồn tại.', 404);

  if (req.user!.role === 'teacher' && exam.teacher_id !== req.user!.id) {
    return sendError(res, 'Bạn không phụ trách kỳ thi này.', 403);
  }

  const { data: attempts, error } = await supabase
    .from('exam_attempts')
    .select('id, attempt_number, started_at, submitted_at, status, score, total_points, profiles:student_id(id, full_name, email:id)')
    .eq('exam_id', examId)
    .order('score', { ascending: false });

  if (error) return sendError(res, error.message, 500);

  const formatted = (attempts || []).map(a => {
    const student = a.profiles as any;
    return {
      student_id: student?.id,
      student_name: student?.full_name || 'Không xác định',
      attempt_number: a.attempt_number,
      score: a.score,
      total_points: a.total_points,
      status: a.status === 'submitted' ? 'Đã nộp bài' : a.status === 'in_progress' ? 'Đang làm' : 'Hết giờ',
      submitted_at: a.submitted_at ? new Date(a.submitted_at).toLocaleString('vi-VN') : 'Chưa nộp',
      is_passed: Number(a.score) >= Number(exam.pass_score) ? 'Đạt' : 'Chưa đạt'
    };
  });

  if (isExport) {
    const headers = [
      { key: 'student_name', label: 'Họ và Tên' },
      { key: 'attempt_number', label: 'Lần thi' },
      { key: 'score', label: 'Điểm số' },
      { key: 'total_points', label: 'Tổng điểm' },
      { key: 'is_passed', label: 'Kết quả' },
      { key: 'status', label: 'Trạng thái' },
      { key: 'submitted_at', label: 'Thời gian nộp' }
    ];
    const csvContent = exportToCsv(headers, formatted);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="BangDiem_${exam.title.replace(/\s+/g, '_')}.csv"`);
    return res.status(200).send(csvContent);
  }

  return sendSuccess(res, {
    exam: {
      id: exam.id,
      title: exam.title,
      class_name: exam.classes?.name,
      pass_score: exam.pass_score
    },
    results: formatted
  });
});

// GET /api/v1/classes/:id/results (Class overview results)
router.get('/classes/:id/results', authenticate, requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const classId = req.params.id;

  const { data: cls } = await supabase.from('classes').select('*').eq('id', classId).single();
  if (!cls) return sendError(res, 'Lớp học không tồn tại.', 404);

  if (req.user!.role === 'teacher' && cls.teacher_id !== req.user!.id) {
    return sendError(res, 'Không có quyền truy cập lớp học này.', 403);
  }

  // Get all exams in this class
  const { data: exams } = await supabase
    .from('exams')
    .select('id, title, pass_score, status')
    .eq('class_id', classId);

  // Get class members
  const { data: members } = await supabase
    .from('class_members')
    .select('student_id, profiles:student_id(id, full_name)')
    .eq('class_id', classId);

  return sendSuccess(res, { class: cls, exams, members });
});

// ==========================================
// ADMIN MANAGEMENT
// ==========================================

// GET /api/v1/admin/overview
router.get('/admin/overview', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const [
    { count: totalUsers },
    { count: totalTeachers },
    { count: totalStudents },
    { count: totalClasses },
    { count: totalExams },
    { count: totalAttempts }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('classes').select('*', { count: 'exact', head: true }),
    supabase.from('exams').select('*', { count: 'exact', head: true }),
    supabase.from('exam_attempts').select('*', { count: 'exact', head: true })
  ]);

  // Recent 5 attempts
  const { data: recentAttempts } = await supabase
    .from('exam_attempts')
    .select('id, started_at, score, status, profiles:student_id(full_name), exams(title)')
    .order('created_at', { ascending: false })
    .limit(5);

  return sendSuccess(res, {
    metrics: {
      total_users: totalUsers || 0,
      total_teachers: totalTeachers || 0,
      total_students: totalStudents || 0,
      total_classes: totalClasses || 0,
      total_exams: totalExams || 0,
      total_attempts: totalAttempts || 0
    },
    recent_attempts: recentAttempts || []
  });
});

// GET /api/v1/admin/users
router.get('/admin/users', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const role = req.query.role as string;
  const status = req.query.status as string;
  const search = req.query.search as string;

  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

  if (role) query = query.eq('role', role);
  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('full_name', `%${search}%`);

  const { data, error } = await query;
  if (error) return sendError(res, error.message, 500);

  return sendSuccess(res, data);
});

// PATCH /api/v1/admin/users/:id/status
const updateStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'pending'])
});

router.patch(
  '/admin/users/:id/status',
  authenticate,
  requireRole('admin'),
  validateRequest({ body: updateStatusSchema }),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const targetUserId = req.params.id;

    if (targetUserId === req.user!.id) {
      return sendError(res, 'Bạn không thể tự khóa tài khoản của chính mình.', 400);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ status: req.body.status, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: req.user!.id,
      action: 'UPDATE_USER_STATUS',
      resource_type: 'USER',
      resource_id: targetUserId,
      metadata: { new_status: req.body.status }
    });

    return sendSuccess(res, data, 'Cập nhật trạng thái người dùng thành công');
  }
);

// PATCH /api/v1/admin/users/:id/role
const updateRoleSchema = z.object({
  role: z.enum(['admin', 'teacher', 'student'])
});

router.patch(
  '/admin/users/:id/role',
  authenticate,
  requireRole('admin'),
  validateRequest({ body: updateRoleSchema }),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const targetUserId = req.params.id;

    if (targetUserId === req.user!.id) {
      return sendError(res, 'Bạn không thể tự thay đổi vai trò của chính mình.', 400);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: req.body.role, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: req.user!.id,
      action: 'UPDATE_USER_ROLE',
      resource_type: 'USER',
      resource_id: targetUserId,
      metadata: { new_role: req.body.role }
    });

    return sendSuccess(res, data, 'Cập nhật vai trò người dùng thành công');
  }
);

// GET /api/v1/admin/audit-logs
router.get('/admin/audit-logs', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, profiles:actor_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return sendError(res, error.message, 500);
  return sendSuccess(res, data);
});

export default router;

