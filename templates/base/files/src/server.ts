import type { Server } from 'node:http';

import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

// @slot:SERVER_IMPORTS

let server: Server | undefined;
let isShuttingDown = false;

async function start(): Promise<void> {
  // @slot:STARTUP
  server = await new Promise<Server>((resolve, reject) => {
    const httpServer = app.listen(env.PORT, () => resolve(httpServer));
    httpServer.once('error', reject);
  });
  logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'Server started');
}

async function shutdown(signal: string, exitCode: number): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  logger.info({ signal }, 'Shutdown signal received');

  const forceExitTimer = setTimeout(() => process.exit(1), 10_000);
  forceExitTimer.unref();

  if (server === undefined) {
    clearTimeout(forceExitTimer);
    process.exit(exitCode);
    return;
  }

  server.close(() => {
    // @slot:SHUTDOWN
    clearTimeout(forceExitTimer);
    process.exit(exitCode);
  });
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM', 0);
});

process.on('SIGINT', () => {
  void shutdown('SIGINT', 0);
});

process.on('unhandledRejection', (error) => {
  logger.fatal({ err: error }, 'Unhandled promise rejection');
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  void shutdown('uncaughtException', 1);
});

void start().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Server failed to start');
  process.exit(1);
});
