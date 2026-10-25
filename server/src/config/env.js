import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().min(1, 'GEMINI_MODEL is required'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default(nodeEnv),
});

const testDefaults = {
  PORT: '5000',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/ai-mystery-room-test',
  GEMINI_API_KEY: 'test-key',
  GEMINI_MODEL: 'gemini-2.5-flash',
  CLIENT_URL: 'http://localhost:5173',
  NODE_ENV: 'test',
};

const resolvedEnv = nodeEnv === 'test' ? { ...testDefaults, ...process.env } : process.env;
export const env = envSchema.parse(resolvedEnv);

export const isProduction = env.NODE_ENV === 'production';