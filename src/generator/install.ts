import { execa } from 'execa';

type InstallOptions = {
  dependencies: string[];
  devDependencies: string[];
};

export async function installDependencies(
  targetDir: string,
  options: InstallOptions,
): Promise<void> {
  if (options.dependencies.length > 0) {
    await runNpmInstall(targetDir, ['install', ...options.dependencies]);
  }

  if (options.devDependencies.length > 0) {
    await runNpmInstall(targetDir, ['install', '-D', ...options.devDependencies]);
  }
}

async function runNpmInstall(targetDir: string, args: string[]): Promise<void> {
  try {
    await execa('npm', args, {
      cwd: targetDir,
      stdout: 'ignore',
      stderr: 'pipe',
    });
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error
      ? String(error.stderr)
      : '';
    const details = stderr.trim();
    throw new Error(
      `npm install failed${details.length > 0 ? `: ${details}` : '.'}`,
      { cause: error },
    );
  }
}

export async function initGit(targetDir: string): Promise<void> {
  try {
    await execa('git', ['init'], {
      cwd: targetDir,
      stdout: 'ignore',
      stderr: 'ignore',
    });
  } catch {
    // Git is optional and may not be installed on the user's machine.
  }
}