import { mkdtemp, readFile, remove } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { writePackageJson } from '../../src/generator/packageJson.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => remove(directory)));
});

describe('writePackageJson', () => {
  it('writes metadata and alphabetically sorted scripts without dependencies', async () => {
    const targetDir = await mkdtemp(join(tmpdir(), 'create-yourname-package-'));
    temporaryDirectories.push(targetDir);

    await writePackageJson(targetDir, {
      name: 'my-api',
      scripts: { test: 'vitest', build: 'tsup', dev: 'tsx src/index.ts' },
    });

    await expect(readFile(join(targetDir, 'package.json'), 'utf8')).resolves.toBe(`${JSON.stringify({
      name: 'my-api',
      version: '0.1.0',
      private: true,
      type: 'module',
      engines: { node: '>=20' },
      scripts: { build: 'tsup', dev: 'tsx src/index.ts', test: 'vitest' },
    }, null, 2)}\n`);
  });
});