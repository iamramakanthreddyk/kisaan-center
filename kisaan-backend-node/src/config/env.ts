import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded BEFORE we validate. This file may be imported
// by other modules prior to server.ts calling dotenv.config().
// Resolve to project root (src/../.env)
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Define required environment variables with defaults where reasonable
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET should be at least 10 characters'),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace','silent']).default('info'),
  PAGINATION_DEFAULT_LIMIT: z.coerce.number().int().positive().max(200).default(25),
});

export type AppEnv = z.infer<typeof EnvSchema>;

let cachedEnv: AppEnv | null = null;

export function loadEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = EnvSchema.safeParse(process.env);
  if (parsed.success) {
    cachedEnv = parsed.data;
    return cachedEnv;
  }
  const message = 'Environment validation failed';
  if (process.env.NODE_ENV === 'test') {
    console.error(message, parsed.error.flatten());
    // Provide minimal fallback values for tests if missing
    cachedEnv = {
      NODE_ENV: 'test',
      PORT: 4000,
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_PORT: Number(process.env.DB_PORT) || 5432,
      DB_NAME: process.env.DB_NAME || 'testdb',
      DB_USER: process.env.DB_USER || 'test',
      DB_PASSWORD: process.env.DB_PASSWORD || 'test',
      JWT_SECRET: process.env.JWT_SECRET || 'test_jwt_secret_12345',
      LOG_LEVEL: 'info',
      PAGINATION_DEFAULT_LIMIT: 25,
    };
    return cachedEnv;
  }
  throw new Error(message + ': ' + JSON.stringify(parsed.error.flatten()));
}

export const env = loadEnv();
