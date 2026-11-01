import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProjectOptions } from '../../src/types.js';

vi.mock('../../src/generator/install.js', () => ({
  initGit: vi.fn(),
  installDependencies: vi.fn(),
}));

import { generateProject } from '../../src/generator/index.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('generateProject', () => {
  it('copies files, applies slots, writes environment and package files, and replaces the name', async () => {
    const { cwd, templatesDir } = await createTemplates();
    const result = await generateProject(options(), { cwd, templatesDir });
    const targetDir = result.targetDir;

    expect(await readFile(join(targetDir, 'src', 'app.ts'), 'utf8')).toContain('export const route = true;');
    expect(await readFile(join(targetDir, 'src', 'app.ts'), 'utf8')).not.toContain('@slot:ROUTES');
    expect(await readFile(join(targetDir, 'README.md'), 'utf8')).toBe('# my-api\n');
    expect(await readFile(join(targetDir, '.env'), 'utf8')).toMatch(/^APP_SECRET=[a-f0-9]{64}\n$/);
    expect(await readFile(join(targetDir, '.env.example'), 'utf8')).toBe('APP_SECRET=\n');

    const packageJson = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts).toEqual({ dev: 'tsx src/index.ts', test: 'vitest' });
  });

  it('removes a newly created target when a layer is missing', async () => {
    const { cwd, templatesDir } = await createTemplates(['base', 'readme']);

    await expect(generateProject(options(), { cwd, templatesDir })).rejects.toThrow(
      "Template layer 'db-mongo' not found",
    );
    await expect(readdir(join(cwd, 'my-api'))).rejects.toThrow();
  });

  it('preserves an existing non-empty target directory', async () => {
    const { cwd, templatesDir } = await createTemplates();
    const targetDir = join(cwd, 'my-api');
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, 'keep.txt'), 'keep me');

    await expect(generateProject(options(), { cwd, templatesDir })).rejects.toThrow(
      'already exists and is not empty',
    );
    expect(await readFile(join(targetDir, 'keep.txt'), 'utf8')).toBe('keep me');
  });

  it('keeps an existing empty target empty when generation fails', async () => {
    const { cwd, templatesDir } = await createTemplates(['base', 'readme']);
    const targetDir = join(cwd, 'my-api');
    await mkdir(targetDir, { recursive: true });

    await expect(generateProject(options(), { cwd, templatesDir })).rejects.toThrow(
      "Template layer 'db-mongo' not found",
    );
    expect(await readdir(targetDir)).toEqual([]);
  });

  it('removes a created target when an injection slot is missing', async () => {
    const { cwd, templatesDir } = await createTemplates();
    await writeManifest(templatesDir, 'db-mongo', {
      id: 'db-mongo',
      inject: { 'src/app.ts': { MISSING: 'never added' } },
    });

    await expect(generateProject(options(), { cwd, templatesDir })).rejects.toThrow(
      "Injection slot 'MISSING' not found in 'src/app.ts'.",
    );
    await expect(readdir(join(cwd, 'my-api'))).rejects.toThrow();
  });

  it('allows a later layer to override an earlier file', async () => {
    const { cwd, templatesDir } = await createTemplates();
    await writeFile(join(templatesDir, 'base', 'files', 'shared.txt'), 'base');
    await mkdir(join(templatesDir, 'db-mongo', 'files'), { recursive: true });
    await writeFile(join(templatesDir, 'db-mongo', 'files', 'shared.txt'), 'db');

    const { targetDir } = await generateProject(options(), { cwd, templatesDir });
    expect(await readFile(join(targetDir, 'shared.txt'), 'utf8')).toBe('db');
  });
});

function options(): ProjectOptions {
  return {
    name: 'my-api',
    language: 'ts',
    auth: 'none',
    docker: false,
    testing: false,
    install: false,
  };
}

async function createTemplates(
  layers: string[] = ['base', 'db-mongo', 'readme'],
): Promise<{ cwd: string; templatesDir: string }> {
  const root = await mkdtemp(join(tmpdir(), 'create-yourname-test-'));
  temporaryDirectories.push(root);
  const templatesDir = join(root, 'templates');
  const cwd = join(root, 'projects');
  await mkdir(cwd, { recursive: true });

  for (const layer of layers) {
    await mkdir(join(templatesDir, layer, 'files'), { recursive: true });
  }

  await writeFile(
    join(templatesDir, 'base', 'files', 'src', 'app.ts'),
    '// app\n// @slot:ROUTES\n',
  ).catch(async () => {
    await mkdir(join(templatesDir, 'base', 'files', 'src'), { recursive: true });
    await writeFile(join(templatesDir, 'base', 'files', 'src', 'app.ts'), '// app\n// @slot:ROUTES\n');
  });
  await writeFile(join(templatesDir, 'base', 'layer.json'), JSON.stringify({
    id: 'base',
    scripts: { dev: 'tsx src/index.ts' },
  }));

  if (layers.includes('db-mongo')) {
    await writeManifest(templatesDir, 'db-mongo', {
      id: 'db-mongo',
      env: ['APP_SECRET'],
      inject: { 'src/app.ts': { ROUTES: 'export const route = true;' } },
    });
  }

  if (layers.includes('readme')) {
    await writeFile(join(templatesDir, 'readme', 'files', 'README.md'), '# {{name}}\n');
    await writeManifest(templatesDir, 'readme', {
      id: 'readme',
      scripts: { test: 'vitest' },
    });
  }

  return { cwd, templatesDir };
}

async function writeManifest(
  templatesDir: string,
  layer: string,
  manifest: Record<string, unknown>,
): Promise<void> {
  await writeFile(join(templatesDir, layer, 'layer.json'), JSON.stringify(manifest));
}