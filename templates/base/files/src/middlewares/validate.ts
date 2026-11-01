import type { RequestHandler } from 'express';
import { z } from 'zod';

import { ApiError } from '../utils/ApiError.js';

type ValidationSchemas = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    const details: Array<{ location: string; path: string; message: string }> = [];

    for (const [location, schema] of Object.entries(schemas)) {
      if (schema === undefined) {
        continue;
      }

      const result = schema.safeParse(req[location as 'body' | 'query' | 'params']);
      if (!result.success) {
        details.push(
          ...result.error.issues.map((issue) => ({
            location,
            path: issue.path.map(String).join('.'),
            message: issue.message,
          })),
        );
        continue;
      }

      if (location === 'query') {
        // Express 5 exposes req.query through a getter, so assignment is not reliable.
        Object.defineProperty(req, 'query', {
          value: result.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } else if (location === 'params') {
        req.params = result.data as typeof req.params;
      } else {
        req.body = result.data;
      }
    }

    if (details.length > 0) {
      throw ApiError.badRequest('Validation failed', details);
    }

    next();
  };
}
