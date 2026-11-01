import pc from 'picocolors';

export function info(message: string): void {
  process.stdout.write(`${pc.blue(message)}\n`);
}

export function success(message: string): void {
  process.stdout.write(`${pc.green(message)}\n`);
}

export function warn(message: string): void {
  process.stdout.write(`${pc.yellow(message)}\n`);
}

export function error(message: string): void {
  process.stderr.write(`${pc.red(message)}\n`);
}
