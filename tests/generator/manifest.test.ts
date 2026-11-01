import { mkdtemp, outputFile, remove } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { mergeManifests, readManifest } from '../../src/generator/manifest.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => remove(directory)));
});

describe('readManifest', () => {
  it('reads a valid manifest', async () => {
    const layerDir = await createLayer('base');
    await outputFile(join(layerDir, 'layer.json'), JSON.stringify({
      id: 'base',
      dependencies: ['express', '@types/node'],
    }));

    await expect(readManifest(layerDir)).resolves.toMatchObject({
      id: 'base',
      dependencies: ['express', '@types/node'],
    });
  });

  it('rejects versioned dependencies with the invalid field', async () => {
    const layerDir = await createLayer('base');
    await outputFile(join(layerDir, 'layer.json'), JSON.stringify({
      id: 'base',
      dependencies: ['express@4'],
    }));

    await expect(readManifest(layerDir)).rejects.toThrow("invalid field 'dependencies.0'");
  });

  it('allows a missing layer.json', async () => {
    const layerDir = await createLayer('without-manifest');

    await expect(readManifest(layerDir)).resolves.toEqual({ id: 'without-manifest' });
  });
});

describe('mergeManifests', () => {
  it('dedupes and sorts packages, lets later values win, and keeps inject order', () => {
    expect(mergeManifests([
      {
        id: 'base',
        dependencies: ['zod', 'express'],
        devDependencies: ['vitest'],
        scripts: { start: 'base', shared: 'base' },
        env: ['PORT=3000', 'APP_SECRET=old'],
        inject: { 'src/app.ts': { ROUTES: 'base route' } },
      },
      {
        id: 'auth',
        dependencies: ['express', 'jsonwebtoken'],
        devDependencies: ['vitest', 'tsx'],
        scripts: { shared: 'auth' },
        env: ['APP_SECRET=new', 'NODE_ENV=development'],
        inject: { 'src/app.ts': { ROUTES: 'auth route' } },
      },
    ])).toEqual({
      dependencies: ['express', 'jsonwebtoken', 'zod'],
      devDependencies: ['tsx', 'vitest'],
      scripts: { start: 'base', shared: 'auth' },
      env: ['PORT=3000', 'APP_SECRET=new', 'NODE_ENV=development'],
      injects: [
        { layer: 'base', file: 'src/app.ts', slots: { ROUTES: 'base route' } },
        { layer: 'auth', file: 'src/app.ts', slots: { ROUTES: 'auth route' } },
      ],
    });
  });
});

async function createLayer(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'create-yourname-manifest-'));
  temporaryDirectories.push(root);
  const layerDir = join(root, name);
  await outputFile(join(layerDir, '.keep'), '');
  return layerDir;
}