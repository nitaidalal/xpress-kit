import 'dotenv/config';

import { z } from 'zod';

// This is the ONLY file allowed to read process.env.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  // @slot:ENV_SCHEMA
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Environment validation failed:');
  for (const issue of result.error.issues) {
    const variable = issue.path.join('.') || 'environment';
    console.error(`- ${variable}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = Object.freeze(result.data);
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';