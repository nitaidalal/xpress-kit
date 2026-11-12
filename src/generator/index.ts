import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import * as p from '@clack/prompts';
import { ensureDir, pathExists, remove } from 'fs-extra';

import { resolveLayers } from '../layers.js';
import type { LayerManifest, ProjectOptions } from '../types.js';
import { getTemplatesDir } from '../utils/paths.js';
import { copyLayerFiles } from './copy.js';
import { writeEnvFiles } from './env.js';
import { initGit, installDependencies } from './install.js';
import { mergeManifests, readManifest } from './manifest.js';
import { writePackageJson } from './packageJson.js';
import { applyInjects, removeSlotMarkers } from './slots.js';

type GenerateConfig = {
  templatesDir?: string;
  cwd?: string;
};

export async function generateProject(
  options: ProjectOptions,
  config: GenerateConfig = {},
): Promise<{ targetDir: string }> {
  const cwd = config.cwd ?? process.cwd();
  const templatesDir = config.templatesDir ?? getTemplatesDir();
  const targetDir = resolve(cwd, options.name);
  const targetExists = await pathExists(targetDir);

  if (targetExists && (await readdir(targetDir)).length > 0) {
    throw new Error(`Target directory "${targetDir}" already exists and is not empty.`);
  }

  if (!targetExists) {
    await ensureDir(targetDir);
  }

  try {
    const layers = resolveLayers(options);
    const manifests: LayerManifest[] = [];

    for (const layer of layers) {
      const layerDir = join(templatesDir, layer);
      if (!(await pathExists(layerDir))) {
        throw new Error(`Template layer '${layer}' not found`);
      }

      manifests.push(await readManifest(layerDir));
      await copyLayerFiles(layerDir, targetDir);
    }

    const merged = mergeManifests(manifests);
    await applyInjects(targetDir, merged.injects);
    await removeSlotMarkers(targetDir);
    await writeEnvFiles(targetDir, merged.env);
    await writePackageJson(targetDir, {
      name: options.name,
      scripts: merged.scripts,
    });
    await replaceProjectName(targetDir, options.name);

    if (options.install) {
      const spinner = p.spinner();
      spinner.start('Installing dependencies');
      try {
        await installDependencies(targetDir, {
          dependencies: merged.dependencies,
          devDependencies: merged.devDependencies,
        });
        spinner.stop('Dependencies installed');
      } catch (error) {
        spinner.stop('Dependency installation failed');
        throw error;
      }
      await initGit(targetDir);
    }

    return { targetDir };
  } catch (error) {
    if (targetExists) {
      await clearDirectory(targetDir);
    } else {
      await remove(targetDir);
    }
    throw error;
  }
}

async function replaceProjectName(targetDir: string, name: string): Promise<void> {
  const readmePath = join(targetDir, 'README.md');
  if (!(await pathExists(readmePath))) {
    return;
  }

  const contents = await readFile(readmePath, 'utf8');
  await writeFile(readmePath, contents.replaceAll('{{name}}', name));
}

async function clearDirectory(directory: string): Promise<void> {
  const entries = await readdir(directory);
  await Promise.all(entries.map((entry) => remove(join(directory, entry))));
}
