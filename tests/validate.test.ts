import { describe, expect, it } from 'vitest';

import { validateProjectName } from '../src/utils/validate.js';

describe('validateProjectName', () => {
  it.each(['my-api', 'api_2', 'a1'])('accepts %s', (name) => {
    expect(validateProjectName(name)).toBeUndefined();
  });

  it.each([
    '',
    'My-api',
    'my api',
    '.my-api',
    '-my-api',
    'a'.repeat(215),
    'node_modules',
    'npm',
  ])('rejects %s', (name) => {
    expect(validateProjectName(name)).toEqual(expect.any(String));
  });
});