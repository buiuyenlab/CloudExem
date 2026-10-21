import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin, getSupabaseUserClient } from '../config/supabase';
import { sendError } from '../utils/response';

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: 'admin' | 'teacher' | 'student';
  status: 'pending' | 'active' | 'suspended';
  token: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Chưa đăng nhập hoặc thiếu Bearer Token.', 401, 'UNAUTHORIZED');
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'Token không hợp lệ.', 401, 'INVALID_TOKEN');
      return;
    }

    // Verify token with Supabase Auth
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      sendError(res, 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.', 401, 'SESSION_EXPIRED');
      return;
    }

    // Fetch user profile from database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      sendError(res, 'Hồ sơ người dùng không tồn tại.', 404, 'PROFILE_NOT_FOUND');
      return;
    }

    // Check account status
    if (profile.status === 'suspended') {
      sendError(res, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.', 403, 'ACCOUNT_SUSPENDED');
      return;
    }

    req.user = {
      id: profile.id,
      email: user.email || '',
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      role: profile.role,
      status: profile.status,
      token
    };

    next();
  } catch (err: any) {
    sendError(res, 'Lỗi hệ thống khi xác thực: ' + (err.message || 'Unknown'), 500, 'AUTH_ERROR');
  }
}

