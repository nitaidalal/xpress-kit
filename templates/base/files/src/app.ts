import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { generalLimiter } from './middlewares/rateLimiter.js';
import { notFound } from './middlewares/notFound.js';
import apiRouter from './routes/index.js';
import { logger } from './utils/logger.js';

// @slot:APP_IMPORTS

export const app = express();
const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (request) => request.url === '/health',
    },
  }),
);
app.use(helmet());
app.use(
  cors({
    origin: corsOrigins.length === 1 ? (corsOrigins[0] ?? '') : corsOrigins,
    credentials: true,
  }),
);
app.use(compression());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use(generalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// @slot:MIDDLEWARE

app.use('/api/v1', apiRouter);
app.use(notFound);
app.use(errorHandler);
