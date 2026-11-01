import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function getTemplatesDir(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));

  // Source utilities are two levels below the root; the bundled file in dist is one.
  return basename(currentDir) === 'dist'
    ? resolve(currentDir, '..', 'templates')
    : resolve(currentDir, '..', '..', 'templates');
}
