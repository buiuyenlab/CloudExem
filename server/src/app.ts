import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess, sendError } from './utils/response';

// Import route modules
import authRoutes from './modules/auth/auth.routes';
import classesRoutes from './modules/classes/classes.routes';
import questionsRoutes from './modules/questions/questions.routes';
import examsRoutes from './modules/exams/exams.routes';
import attemptsRoutes from './modules/attempts/attempts.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get(['/api/health', '/api/v1/health'], (req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    version: '1.0.0'
  }, 'CloudExam API đang hoạt động bình thường');
});

// API v1 Routes
app.use('/api/v1', authRoutes);
app.use('/api/v1/classes', classesRoutes);
app.use('/api/v1', questionsRoutes);
app.use('/api/v1/exams', examsRoutes);
app.use('/api/v1', attemptsRoutes);
app.use('/api/v1', adminRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  sendError(res, `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
});

// Centralized Error Handler
app.use(errorHandler);

export default app;

