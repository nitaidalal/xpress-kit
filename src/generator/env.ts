import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function writeEnvFiles(targetDir: string, envLines: string[]): Promise<void> {
  if (envLines.length === 0) {
    return;
  }

  const exampleLines: string[] = [];
  const envFileLines: string[] = [];

  for (const line of envLines) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      exampleLines.push(line);
      envFileLines.push(line);
      continue;
    }

    const equalsIndex = line.indexOf('=');
    const key = (equalsIndex === -1 ? line : line.slice(0, equalsIndex)).trim();
    const value = equalsIndex === -1 ? '' : line.slice(equalsIndex + 1);
    const isSecret = key.endsWith('_SECRET');
    const generatedValue = isSecret && value === ''
      ? randomBytes(48).toString('hex')
      : value;

    exampleLines.push(`${key}=${isSecret && value === '' ? '' : value}`);
    envFileLines.push(`${key}=${generatedValue}`);
  }

  await writeFile(join(targetDir, '.env.example'), `${exampleLines.join('\n')}\n`);
  await writeFile(join(targetDir, '.env'), `${envFileLines.join('\n')}\n`);
}