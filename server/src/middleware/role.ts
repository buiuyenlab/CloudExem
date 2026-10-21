import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export function requireRole(...allowedRoles: ('admin' | 'teacher' | 'student')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Chưa được xác thực.', 401, 'UNAUTHORIZED');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 'Bạn không có quyền thực hiện hành động này.', 403, 'FORBIDDEN');
      return;
    }

    next();
  };
}

