import { readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';

import { copy, pathExists, remove } from 'fs-extra';

export async function copyLayerFiles(layerDir: string, targetDir: string): Promise<void> {
  const filesDir = join(layerDir, 'files');
  if (!(await pathExists(filesDir))) {
    return;
  }

  await copy(filesDir, targetDir, {
    filter: (source) => !source.endsWith(`${join('', '.gitkeep')}`),
  });
  await renamePublishedDotfiles(targetDir);
}

async function renamePublishedDotfiles(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);
    if (entry.isDirectory()) {
      await renamePublishedDotfiles(source);
      continue;
    }

    const destinationName = entry.name === '_gitignore'
      ? '.gitignore'
      : entry.name === '_npmrc'
        ? '.npmrc'
        : undefined;
    if (destinationName === undefined) {
      continue;
    }

    // npm strips dotfiles when publishing, so templates store them with an underscore.
    const destination = join(directory, destinationName);
    await remove(destination);
    await rename(source, destination);
  }
}