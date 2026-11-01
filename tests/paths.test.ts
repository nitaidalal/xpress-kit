import { describe, expect, it } from 'vitest';

import { getTemplatesDir } from '../src/utils/paths.js';

describe('getTemplatesDir', () => {
  it('returns the templates directory path', () => {
    expect(getTemplatesDir()).toMatch(/templates$/);
  });
});
