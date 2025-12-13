import pino from 'pino';
import { v4 as uuid } from 'uuid';

// Base logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'password', 'token'],
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard' }
  } : undefined
});

export function createRequestLogger(reqId?: string) {
  return logger.child({ reqId: reqId || uuid() });
}
