import rateLimit from 'express-rate-limit';
import type { Response } from 'express';

import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

function sendRateLimitResponse(response: Response): void {
  const error = ApiError.tooManyRequests('Too many requests, please try again later.');
  response.status(error.statusCode).json({
    success: false,
    message: error.message,
  });
}

// When behind a proxy, app.ts must set trust proxy via TRUST_PROXY or all users share one IP.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler: (_req, response) => sendRateLimitResponse(response),
});

// Auth routes in later layers will use this stricter limiter.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: () => env.NODE_ENV === 'test',
  handler: (_req, response) => sendRateLimitResponse(response),
});
