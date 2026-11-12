import { mkdtemp, outputFile, readFile, remove } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { applyInjects, removeSlotMarkers } from '../../src/generator/slots.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => remove(directory)));
});

describe('applyInjects', () => {
  it('supports single and multiple ordered injections with indentation', async () => {
    const targetDir = await createTarget();
    await outputFile(join(targetDir, 'src', 'app.ts'), '  // @slot:ROUTES\n');

    await applyInjects(targetDir, [
      { layer: 'base', file: 'src/app.ts', slots: { ROUTES: 'const first = true;' } },
      { layer: 'auth', file: 'src/app.ts', slots: { ROUTES: 'const second = true;' } },
    ]);

    expect(await readFile(join(targetDir, 'src', 'app.ts'), 'utf8')).toBe(
      '  const first = true;\n  const second = true;\n  // @slot:ROUTES\n',
    );
  });

  it('supports hash-style markers', async () => {
    const targetDir = await createTarget();
    await outputFile(join(targetDir, 'config.yml'), '  # @slot:CONFIG\n');

    await applyInjects(targetDir, [{ layer: 'docker', file: 'config.yml', slots: { CONFIG: 'port: 3000' } }]);

    expect(await readFile(join(targetDir, 'config.yml'), 'utf8')).toBe('  port: 3000\n  # @slot:CONFIG\n');
  });

  it('preserves dollar sequences in injected code', async () => {
    const targetDir = await createTarget();
    await outputFile(join(targetDir, 'app.ts'), '// @slot:CODE\n');

    await applyInjects(targetDir, [{
      layer: 'base',
      file: 'app.ts',
      slots: { CODE: 'const value = "$& $$";' },
    }]);

    expect(await readFile(join(targetDir, 'app.ts'), 'utf8')).toBe(
      'const value = "$& $$";\n// @slot:CODE\n',
    );
  });

  it('reports missing slots and rejects path traversal', async () => {
    const targetDir = await createTarget();
    await outputFile(join(targetDir, 'app.ts'), '// @slot:KNOWN\n');

    await expect(applyInjects(targetDir, [{ layer: 'base', file: 'app.ts', slots: { MISSING: 'code' } }])).rejects.toThrow(
      "Injection slot 'MISSING' in file 'app.ts' from layer 'base' not found.",
    );
    await expect(applyInjects(targetDir, [{ layer: 'base', file: '../outside.ts', slots: { KNOWN: 'code' } }])).rejects.toThrow(
      'outside the target directory',
    );
  });
});

describe('removeSlotMarkers', () => {
  it('removes markers from supported text files but skips binaries and node_modules', async () => {
    const targetDir = await createTarget();
    await outputFile(join(targetDir, 'Dockerfile'), 'FROM node\n# @slot:DOCKER\n');
    await outputFile(join(targetDir, '.env'), 'PORT=3000\n# @slot:ENV\n');
    await outputFile(join(targetDir, 'node_modules', 'ignored.js'), '// @slot:IGNORED\n');
    await outputFile(join(targetDir, 'image.bin'), Buffer.from([0, 1, 2, 3]));

    await removeSlotMarkers(targetDir);

    expect(await readFile(join(targetDir, 'Dockerfile'), 'utf8')).toBe('FROM node\n');
    expect(await readFile(join(targetDir, '.env'), 'utf8')).toBe('PORT=3000\n');
    expect(await readFile(join(targetDir, 'node_modules', 'ignored.js'), 'utf8')).toBe('// @slot:IGNORED\n');
    expect(await readFile(join(targetDir, 'image.bin'))).toEqual(Buffer.from([0, 1, 2, 3]));
  });
});

async function createTarget(): Promise<string> {
  const targetDir = await mkdtemp(join(tmpdir(), 'create-yourname-slots-'));
  temporaryDirectories.push(targetDir);
  return targetDir;
}