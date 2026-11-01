export class ApiError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;
  readonly isOperational: boolean;

  constructor(statusCode: number, message: string, details?: unknown, isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }

  static unauthorized(message: string, details?: unknown): ApiError {
    return new ApiError(401, message, details);
  }

  static forbidden(message: string, details?: unknown): ApiError {
    return new ApiError(403, message, details);
  }

  static notFound(message: string, details?: unknown): ApiError {
    return new ApiError(404, message, details);
  }

  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError(409, message, details);
  }

  static tooManyRequests(message: string, details?: unknown): ApiError {
    return new ApiError(429, message, details);
  }
}
