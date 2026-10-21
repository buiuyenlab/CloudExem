import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { getSupabaseAdmin } from '../../config/supabase';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

// GET /api/v1/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  sendSuccess(res, req.user, 'Thông tin người dùng hiện tại');
});

// GET /api/v1/me/profile
router.get('/me/profile', authenticate, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user!.id)
    .single();

  if (error || !profile) {
    sendError(res, 'Không tìm thấy thông tin hồ sơ.', 404);
    return;
  }

  sendSuccess(res, { ...profile, email: req.user!.email });
});

// PATCH /api/v1/me/profile
const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
  avatar_url: z.string().url('URL ảnh không hợp lệ').nullable().optional()
});

router.patch(
  '/me/profile',
  authenticate,
  validateRequest({ body: updateProfileSchema }),
  async (req: Request, res: Response) => {
    const { full_name, avatar_url } = req.body;
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user!.id)
      .select()
      .single();

    if (error) {
      sendError(res, 'Không thể cập nhật hồ sơ: ' + error.message, 500);
      return;
    }

    sendSuccess(res, data, 'Cập nhật thông tin thành công');
  }
);

export default router;

