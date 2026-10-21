import { Response } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string = 'BAD_REQUEST',
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {})
  };
  return res.status(statusCode).json(payload);
}

export function sendError(res: Response, message: string, statusCode = 400, code = 'ERROR', details?: any): Response {
  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  };
  return res.status(statusCode).json(payload);
}

