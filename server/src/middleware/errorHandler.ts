import { Request, Response, NextFunction } from 'express';
import { AppError, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  logger.error(`Unhandled error at ${req.method} ${req.originalUrl}`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // Fallback 500 error
  sendError(
    res,
    process.env.NODE_ENV === 'production' 
      ? 'Đã xảy ra lỗi nội bộ máy chủ.' 
      : (err.message || 'Lỗi không xác định.'),
    500,
    'INTERNAL_SERVER_ERROR'
  );
}

