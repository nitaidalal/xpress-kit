import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { isProduction } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

type ErrorResponse = {
  success: false;
  message: string;
  details?: unknown;
  stack?: string;
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const statusCode = getStatusCode(error);
  const message = getMessage(error, statusCode);
  const details = getDetails(error);
  const response: ErrorResponse = {
    success: false,
    message,
    ...(details === undefined ? {} : { details }),
    ...(!isProduction && error instanceof Error && error.stack ? { stack: error.stack } : {}),
  };

  if (statusCode >= 500) {
    logger.error({ err: error }, message);
  } else {
    logger.warn(message);
  }

  res.status(statusCode).json(response);
};

function getStatusCode(error: unknown): number {
  if (error instanceof ApiError) {
    return error.statusCode;
  }

  if (error instanceof ZodError) {
    return 400;
  }

  if (isErrorWithType(error)) {
    if (error.type === 'entity.too.large') return 413;
    if (error.type === 'entity.parse.failed') return 400;
  }

  return 500;
}

function getMessage(error: unknown, statusCode: number): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof ZodError) {
    return 'Validation failed';
  }

  if (statusCode === 413) {
    return 'Request entity too large';
  }

  if (statusCode === 400 && isErrorWithType(error) && error.type === 'entity.parse.failed') {
    return 'Invalid JSON';
  }

  return 'Internal server error';
}

function getDetails(error: unknown): unknown {
  if (error instanceof ApiError) {
    return error.details;
  }

  if (error instanceof ZodError) {
    return error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    }));
  }

  return undefined;
}

function isErrorWithType(error: unknown): error is Error & { type: string } {
  return error instanceof Error && 'type' in error && typeof error.type === 'string';
}
