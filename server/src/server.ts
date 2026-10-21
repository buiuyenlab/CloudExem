import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const port = Number(env.PORT) || 5000;

app.listen(port, () => {
  logger.info(`CloudExam Server running at http://localhost:${port}`);
  logger.info(`Health check available at http://localhost:${port}/api/v1/health`);
});

