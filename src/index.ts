import { run } from './cli.js';

try {
  await run();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'An unexpected error occurred'}\n`,
  );
  process.exitCode = 1;
}
