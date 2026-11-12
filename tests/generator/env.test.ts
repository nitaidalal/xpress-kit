import { mkdtemp, readFile, remove } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { writeEnvFiles } from '../../src/generator/env.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => remove(directory)));
});

describe('writeEnvFiles', () => {
  it('generates secret values in .env while leaving them empty in the example', async () => {
    const targetDir = await mkdtemp(join(tmpdir(), 'create-yourname-env-'));
    temporaryDirectories.push(targetDir);

    await writeEnvFiles(targetDir, ['# settings', '', 'PORT=3000', 'JWT_ACCESS_SECRET=']);

    expect(await readFile(join(targetDir, '.env.example'), 'utf8')).toBe('# settings\n\nPORT=3000\nJWT_ACCESS_SECRET=\n');
    expect(await readFile(join(targetDir, '.env'), 'utf8')).toMatch(/^# settings\n\nPORT=3000\nJWT_ACCESS_SECRET=[a-f0-9]{96}\n$/);
  });

  it('writes neither file for empty environment input', async () => {
    const targetDir = await mkdtemp(join(tmpdir(), 'create-yourname-env-empty-'));
    temporaryDirectories.push(targetDir);

    await writeEnvFiles(targetDir, []);

    await expect(readFile(join(targetDir, '.env'))).rejects.toThrow();
    await expect(readFile(join(targetDir, '.env.example'))).rejects.toThrow();
  });
});