import { readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';

import { pathExists } from 'fs-extra';

import type { ManifestInject } from './manifest.js';

const TEXT_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.env', '.txt']);

export async function applyInjects(targetDir: string, injects: ManifestInject[]): Promise<void> {
  for (const inject of injects) {
    const filePath = resolve(targetDir, inject.file);
    if (isOutsideDirectory(targetDir, filePath)) {
      throw new Error(`Injection file '${inject.file}' from layer '${inject.layer}' is outside the target directory.`);
    }
    if (!(await pathExists(filePath))) {
      throw new Error(`Injection file '${inject.file}' from layer '${inject.layer}' not found.`);
    }

    let contents = await readFile(filePath, 'utf8');
    for (const [slot, code] of Object.entries(inject.slots)) {
      const markerPattern = new RegExp(`^([\\t ]*)(?:(//)|#) @slot:${escapeRegExp(slot)}[\\t ]*$`, 'm');
      const match = markerPattern.exec(contents);
      if (!match) {
        throw new Error(`Injection slot '${slot}' in file '${inject.file}' from layer '${inject.layer}' not found.`);
      }

      const indentation = match[1] ?? '';
      const indentedCode = code
        .split('\n')
        .map((line) => line.length === 0 ? line : `${indentation}${line}`)
        .join('\n');
      contents = contents.replace(match[0], () => `${indentedCode}\n${match[0]}`);
    }
    await writeFile(filePath, contents);
  }
}

export async function removeSlotMarkers(targetDir: string): Promise<void> {
  for (const filePath of await listTextFiles(targetDir)) {
    const contents = await readFile(filePath);
    if (contents.includes(0)) {
      continue;
    }

    const text = contents.toString('utf8');
    const withoutMarkers = text.replace(/^([\t ]*)(?:(?:\/\/)|#) @slot:[^\r\n]+\r?\n?/gm, '');
    if (withoutMarkers !== text) {
      await writeFile(filePath, withoutMarkers);
    }
  }
}

async function listTextFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') {
      continue;
    }

    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTextFiles(filePath)));
      continue;
    }

    if (
      TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())
      || entry.name === 'Dockerfile'
      || entry.name === '.env'
    ) {
      files.push(filePath);
    }
  }
  return files;
}

function isOutsideDirectory(targetDir: string, filePath: string): boolean {
  const pathDifference = relative(resolve(targetDir), filePath);
  return isAbsolute(pathDifference) || pathDifference === '..' || pathDifference.startsWith(`..${join('', '/')}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}