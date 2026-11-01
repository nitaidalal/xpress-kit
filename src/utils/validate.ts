const RESERVED_NAMES = new Set(['node_modules', 'npm']);

export function validateProjectName(name: string): string | undefined {
  if (name.length === 0) {
    return 'Project name is required.';
  }

  if (name.length > 214) {
    return 'Project name must be 214 characters or fewer.';
  }

  if (name !== name.toLowerCase()) {
    return 'Project name must use lowercase characters only.';
  }

  if (!/^[a-z0-9_-]+$/.test(name)) {
    return 'Project name may contain only lowercase letters, digits, hyphens, and underscores.';
  }

  if (/^[._-]/.test(name)) {
    return 'Project name cannot start with a dot, underscore, or hyphen.';
  }

  if (RESERVED_NAMES.has(name)) {
    return `"${name}" is a reserved project name.`;
  }

  return undefined;
}