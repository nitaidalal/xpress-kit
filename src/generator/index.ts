import { randomBytes } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import * as p from '@clack/prompts';
import { copy, ensureDir, pathExists, remove } from 'fs-extra';

import { resolveLayers } from '../layers.js';
import type { LayerManifest, ProjectOptions } from '../types.js';
import { getTemplatesDir } from '../utils/paths.js';
import { initGit, installDependencies } from './install.js';

type GenerateConfig = {
  templatesDir?: string;
  cwd?: string;
};

type MergedManifest = {
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  env: string[];
  inject: Map<string, Map<string, string[]>>;
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

      const manifestPath = join(layerDir, 'layer.json');
      if (await pathExists(manifestPath)) {
        manifests.push(await readManifest(manifestPath));
      }

      const filesDir = join(layerDir, 'files');
      if (await pathExists(filesDir)) {
        await copy(filesDir, targetDir);
      }
    }

    const merged = mergeManifests(manifests);
    await applyInjections(targetDir, merged.inject);
    await removeSlotMarkers(targetDir);
    await writeEnvironmentFiles(targetDir, merged.env);
    await writePackageJson(targetDir, options.name, merged);
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

async function readManifest(path: string): Promise<LayerManifest> {
  const contents = await readFile(path, 'utf8');
  return JSON.parse(contents) as LayerManifest;
}

function mergeManifests(manifests: LayerManifest[]): MergedManifest {
  const merged: MergedManifest = {
    dependencies: [],
    devDependencies: [],
    scripts: {},
    env: [],
    inject: new Map(),
  };

  for (const manifest of manifests) {
    merged.dependencies.push(...(manifest.dependencies ?? []));
    merged.devDependencies.push(...(manifest.devDependencies ?? []));
    Object.assign(merged.scripts, manifest.scripts ?? {});
    merged.env.push(...(manifest.env ?? []));

    for (const [file, slots] of Object.entries(manifest.inject ?? {})) {
      const fileSlots = merged.inject.get(file) ?? new Map<string, string[]>();
      merged.inject.set(file, fileSlots);
      for (const [slot, content] of Object.entries(slots)) {
        const values = fileSlots.get(slot) ?? [];
        values.push(content);
        fileSlots.set(slot, values);
      }
    }
  }

  merged.dependencies = [...new Set(merged.dependencies)];
  merged.devDependencies = [...new Set(merged.devDependencies)];
  merged.env = [...new Set(merged.env)];
  return merged;
}

async function applyInjections(
  targetDir: string,
  inject: Map<string, Map<string, string[]>>,
): Promise<void> {
  for (const [file, slots] of inject) {
    const filePath = join(targetDir, file);
    if (!(await pathExists(filePath))) {
      throw new Error(`Injection target '${file}' not found.`);
    }

    let contents = await readFile(filePath, 'utf8');
    for (const [slot, values] of slots) {
      const marker = `// @slot:${slot}`;
      if (!contents.includes(marker)) {
        throw new Error(`Injection slot '${slot}' not found in '${file}'.`);
      }
      contents = contents.replace(marker, values.join('\n'));
    }
    await writeFile(filePath, contents);
  }
}

async function removeSlotMarkers(targetDir: string): Promise<void> {
  for (const filePath of await listFiles(targetDir)) {
    const contents = await readFile(filePath);
    if (contents.includes(0)) {
      continue;
    }

    const text = contents.toString('utf8');
    const withoutMarkers = text.replace(/^\s*\/\/ @slot:[^\r\n]+\r?\n?/gm, '');
    if (withoutMarkers !== text) {
      await writeFile(filePath, withoutMarkers);
    }
  }
}

async function writeEnvironmentFiles(targetDir: string, env: string[]): Promise<void> {
  if (env.length === 0) {
    return;
  }

  const keys = env.map((entry) => entry.split('=', 1)[0]?.trim()).filter(Boolean);
  const values = keys.map((key) => `${key}=${randomBytes(32).toString('hex')}`);
  await writeFile(join(targetDir, '.env'), `${values.join('\n')}\n`);
  await writeFile(join(targetDir, '.env.example'), `${keys.map((key) => `${key}=`).join('\n')}\n`);
}

async function writePackageJson(
  targetDir: string,
  name: string,
  manifest: MergedManifest,
): Promise<void> {
  const packagePath = join(targetDir, 'package.json');
  let packageJson: Record<string, unknown> = {};

  if (await pathExists(packagePath)) {
    const existing = JSON.parse(await readFile(packagePath, 'utf8')) as unknown;
    if (isRecord(existing)) {
      packageJson = existing;
    }
  }

  const scripts = isRecord(packageJson.scripts) ? packageJson.scripts : {};
  const dependencies = isRecord(packageJson.dependencies) ? packageJson.dependencies : {};
  const devDependencies = isRecord(packageJson.devDependencies)
    ? packageJson.devDependencies
    : {};

  packageJson.name = name;
  packageJson.private = true;
  packageJson.scripts = { ...scripts, ...manifest.scripts };
  packageJson.dependencies = {
    ...dependencies,
    ...Object.fromEntries(manifest.dependencies.map((dependency) => [dependency, 'latest'])),
  };
  packageJson.devDependencies = {
    ...devDependencies,
    ...Object.fromEntries(manifest.devDependencies.map((dependency) => [dependency, 'latest'])),
  };

  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function replaceProjectName(targetDir: string, name: string): Promise<void> {
  const readmePath = join(targetDir, 'README.md');
  if (!(await pathExists(readmePath))) {
    return;
  }

  const contents = await readFile(readmePath, 'utf8');
  await writeFile(readmePath, contents.replaceAll('{{name}}', name));
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else {
      files.push(path);
    }
  }

  return files;
}

async function clearDirectory(directory: string): Promise<void> {
  const entries = await readdir(directory);
  await Promise.all(entries.map((entry) => remove(join(directory, entry))));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}