import { describe, expect, it } from 'vitest';

import { askQuestions } from '../src/prompts.js';
import { DEFAULT_OPTIONS } from '../src/types.js';

describe('askQuestions with --yes', () => {
  it('uses defaults for a valid provided name', async () => {
    await expect(askQuestions({ name: 'my-api', yes: true })).resolves.toEqual({
      name: 'my-api',
      ...DEFAULT_OPTIONS,
    });
  });

  it('rejects an invalid provided name', async () => {
    await expect(askQuestions({ name: 'My API', yes: true })).rejects.toThrow(
      'Invalid project name:',
    );
  });

  it('falls back to my-api when no name is provided', async () => {
    await expect(askQuestions({ yes: true })).resolves.toEqual({
      name: 'my-api',
      ...DEFAULT_OPTIONS,
    });
  });
});