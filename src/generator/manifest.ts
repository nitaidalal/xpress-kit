import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { z } from 'zod';

import type { LayerManifest } from '../types.js';

const packageName = z.string().regex(
  /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/,
  'must be a package name without a version',
);

export const layerManifestSchema = z.object({
  id: z.string().min(1),
  dependencies: z.array(packageName).optional(),
  devDependencies: z.array(packageName).optional(),
  scripts: z.record(z.string(), z.string()).optional(),
  env: z.array(z.string()).optional(),
  inject: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  requires: z.array(z.string()).optional(),
});

export type ManifestInject = {
  layer: string;
  file: string;
  slots: Record<string, string>;
};

export type MergedManifests = {
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  env: string[];
  injects: ManifestInject[];
};

export async function readManifest(layerDir: string): Promise<LayerManifest> {
  const layer = basename(layerDir);
  const manifestPath = join(layerDir, 'layer.json');

  try {
    const contents = await readFile(manifestPath, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(contents) as unknown;
    } catch (error) {
      throw new Error(`Layer '${layer}' has invalid layer.json: invalid JSON`, { cause: error });
    }

    const result = layerManifestSchema.safeParse(parsed);
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue?.path.length ? issue.path.join('.') : 'manifest';
      throw new Error(`Layer '${layer}' has invalid field '${field}': ${issue?.message ?? 'invalid value'}`);
    }

    return result.data;
  } catch (error) {
    if (isMissingFileError(error)) {
      return { id: layer };
    }
    throw error;
  }
}

export function mergeManifests(manifests: LayerManifest[]): MergedManifests {
  const dependencies = new Set<string>();
  const devDependencies = new Set<string>();
  const scripts: Record<string, string> = {};
  const envByKey = new Map<string, string>();
  const injects: ManifestInject[] = [];

  for (const manifest of manifests) {
    for (const dependency of manifest.dependencies ?? []) dependencies.add(dependency);
    for (const dependency of manifest.devDependencies ?? []) devDependencies.add(dependency);
    Object.assign(scripts, manifest.scripts ?? {});

    for (const line of manifest.env ?? []) {
      const key = line.split('=', 1)[0]?.trim();
      if (key && !key.startsWith('#')) envByKey.set(key, line);
    }

    for (const [file, slots] of Object.entries(manifest.inject ?? {})) {
      injects.push({ layer: manifest.id, file, slots });
    }
  }

  return {
    dependencies: [...dependencies].sort(),
    devDependencies: [...devDependencies].sort(),
    scripts,
    env: [...envByKey.values()],
    injects,
  };
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}