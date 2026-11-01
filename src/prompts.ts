import * as p from '@clack/prompts';

import { DEFAULT_OPTIONS, type AuthType, type Language, type ProjectOptions } from './types.js';
import { validateProjectName } from './utils/validate.js';

type PromptInput = {
  name?: string;
  yes: boolean;
};

function getPromptValue<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return value as T;
}

function validateProvidedName(name: string): string {
  const error = validateProjectName(name);

  if (error !== undefined) {
    throw new Error(`Invalid project name: ${error}`);
  }

  return name;
}

async function askProjectName(): Promise<string> {
  const value = getPromptValue(
    await p.text({
      message: 'What is the project name?',
      placeholder: 'my-api',
      validate: validateProjectName,
    }),
  );

  return validateProvidedName(value);
}

async function askLanguage(): Promise<Language> {
  return getPromptValue(
    await p.select({
      message: 'Which language should the project use?',
      options: [
        { value: 'ts' as const, label: 'TypeScript' },
        { value: 'js' as const, label: 'JavaScript' },
      ],
    }),
  );
}

async function askAuth(): Promise<AuthType> {
  return getPromptValue(
    await p.select({
      message: 'Which authentication should be included?',
      options: [
        { value: 'jwt' as const, label: 'JWT (access + refresh token rotation)' },
        { value: 'none' as const, label: 'None' },
      ],
    }),
  );
}

async function askTesting(): Promise<boolean> {
  return getPromptValue(
    await p.confirm({
      message: 'Add tests (Vitest + Supertest)?',
      initialValue: true,
    }),
  );
}

async function askDocker(): Promise<boolean> {
  return getPromptValue(
    await p.confirm({
      message: 'Add Docker support?',
      initialValue: false,
    }),
  );
}

async function askInstall(): Promise<boolean> {
  return getPromptValue(
    await p.confirm({
      message: 'Install dependencies now?',
      initialValue: true,
    }),
  );
}

export async function askQuestions(input: PromptInput): Promise<ProjectOptions> {
  const name = input.name === undefined ? undefined : validateProvidedName(input.name);

  if (input.yes) {
    return {
      name: name ?? 'my-api',
      ...DEFAULT_OPTIONS,
    };
  }

  return {
    name: name ?? (await askProjectName()),
    language: await askLanguage(),
    auth: await askAuth(),
    testing: await askTesting(),
    docker: await askDocker(),
    install: await askInstall(),
  };
}