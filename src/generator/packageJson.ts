import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

type PackageJsonOptions = {
  name: string;
  scripts: Record<string, string>;
};

export async function writePackageJson(
  targetDir: string,
  options: PackageJsonOptions,
): Promise<void> {
  const scripts = Object.fromEntries(
    Object.entries(options.scripts).sort(([first], [second]) => first.localeCompare(second)),
  );

  // Dependencies are intentionally omitted; npm adds the latest versions during installation.
  const packageJson = {
    name: options.name,
    version: '0.1.0',
    private: true,
    type: 'module',
    engines: { node: '>=20' },
    scripts,
  };

  await writeFile(join(targetDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
}