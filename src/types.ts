export type Language = 'ts' | 'js';

export type AuthType = 'jwt' | 'none';

export type ProjectOptions = {
  name: string;
  language: Language;
  auth: AuthType;
  docker: boolean;
  testing: boolean;
  install: boolean;
};

export type LayerManifest = {
  id: string;
  dependencies?: string[];
  devDependencies?: string[];
  scripts?: Record<string, string>;
  env?: string[];
  inject?: Record<string, Record<string, string>>;
  requires?: string[];
};

export const DEFAULT_OPTIONS: Omit<ProjectOptions, 'name'> = {
  language: 'ts',
  auth: 'jwt',
  docker: false,
  testing: true,
  install: true,
};