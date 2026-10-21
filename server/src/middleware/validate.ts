import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

interface ValidationTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validateRequest(schemas: ValidationTargets) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query) as any;
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as any;
      }
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const formatted = err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }));
        sendError(res, 'Dữ liệu yêu cầu không hợp lệ.', 422, 'VALIDATION_ERROR', formatted);
        return;
      }
      sendError(res, 'Lỗi kiểm tra dữ liệu.', 400, 'BAD_REQUEST');
    }
  };
}

