import { describe, it, expect, vi } from 'vitest';
import { requireRole } from './role';
import { validateRequest } from './validate';
import { z } from 'zod';

describe('Role Middleware', () => {
  it('should call next() if user role is permitted', () => {
    const middleware = requireRole('admin', 'teacher');
    const req: any = { user: { role: 'teacher' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 403 if user role is not permitted', () => {
    const middleware = requireRole('admin');
    const req: any = { user: { role: 'student' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('Validate Middleware', () => {
  it('should pass validation when body data is valid', async () => {
    const schema = z.object({
      title: z.string().min(3)
    });
    const middleware = validateRequest({ body: schema });
    const req: any = { body: { title: 'Exam 1' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 422 with validation errors when body data is invalid', async () => {
    const schema = z.object({
      title: z.string().min(3)
    });
    const middleware = validateRequest({ body: schema });
    const req: any = { body: { title: 'Ex' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
  });
});

