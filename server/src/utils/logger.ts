type LogLevel = 'info' | 'warn' | 'error';

function sanitize(data: any): any {
  if (!data) return data;
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map(sanitize);
  if (typeof data === 'object') {
    const copy = { ...data };
    const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'correct_answers', 'service_role'];
    for (const key of Object.keys(copy)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        copy[key] = '[REDACTED]';
      } else if (typeof copy[key] === 'object') {
        copy[key] = sanitize(copy[key]);
      }
    }
    return copy;
  }
  return data;
}

export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? sanitize(meta) : '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? sanitize(meta) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error ? sanitize(error) : '');
  }
};

