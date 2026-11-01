import { mkdtemp, outputFile, pathExists, readFile, remove } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { copyLayerFiles } from '../../src/generator/copy.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => remove(directory)));
});

describe('copyLayerFiles', () => {
  it('copies files, skips gitkeep files, and restores published dotfiles', async () => {
    const root = await mkdtemp(join(tmpdir(), 'create-yourname-copy-'));
    temporaryDirectories.push(root);
    const layerDir = join(root, 'layer');
    const targetDir = join(root, 'target');
    await outputFile(join(layerDir, 'files', '_gitignore'), 'node_modules\n');
    await outputFile(join(layerDir, 'files', 'nested', '_npmrc'), 'save-exact=true\n');
    await outputFile(join(layerDir, 'files', '.gitkeep'), '');
    await outputFile(join(layerDir, 'files', 'app.txt'), 'hello\n');

    await copyLayerFiles(layerDir, targetDir);

    expect(await readFile(join(targetDir, '.gitignore'), 'utf8')).toBe('node_modules\n');
    expect(await readFile(join(targetDir, 'nested', '.npmrc'), 'utf8')).toBe('save-exact=true\n');
    expect(await readFile(join(targetDir, 'app.txt'), 'utf8')).toBe('hello\n');
    expect(await pathExists(join(targetDir, '.gitkeep'))).toBe(false);
  });

  it('does nothing when a layer has no files directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'create-yourname-copy-empty-'));
    temporaryDirectories.push(root);

    await expect(copyLayerFiles(join(root, 'layer'), join(root, 'target'))).resolves.toBeUndefined();
  });
});