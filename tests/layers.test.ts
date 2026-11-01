import { describe, expect, it } from 'vitest';

import { assertLayerRequirements, resolveLayers } from '../src/layers.js';
import { DEFAULT_OPTIONS, type AuthType, type ProjectOptions } from '../src/types.js';

describe('resolveLayers', () => {
  it.each([
    ['jwt', true, true, ['base', 'db-mongo', 'auth-jwt', 'testing', 'docker', 'readme']],
    ['jwt', true, false, ['base', 'db-mongo', 'auth-jwt', 'testing', 'readme']],
    ['jwt', false, true, ['base', 'db-mongo', 'auth-jwt', 'docker', 'readme']],
    ['jwt', false, false, ['base', 'db-mongo', 'auth-jwt', 'readme']],
    ['none', true, true, ['base', 'db-mongo', 'testing', 'docker', 'readme']],
    ['none', true, false, ['base', 'db-mongo', 'testing', 'readme']],
    ['none', false, true, ['base', 'db-mongo', 'docker', 'readme']],
    ['none', false, false, ['base', 'db-mongo', 'readme']],
  ])(
    'resolves %s auth, testing=%s, docker=%s',
    (auth, testing, docker, expected) => {
      const options: ProjectOptions = {
        name: 'my-api',
        ...DEFAULT_OPTIONS,
        auth: auth as AuthType,
        testing,
        docker,
      };

      expect(resolveLayers(options)).toEqual(expected);
      expect(resolveLayers(options)[0]).toBe('base');
      expect(resolveLayers(options).at(-1)).toBe('readme');
    },
  );
});

describe('assertLayerRequirements', () => {
  it('reports the missing requirement', () => {
    expect(() => assertLayerRequirements(['base', 'auth-jwt'])).toThrow(
      'Layer "auth-jwt" requires layer "db-mongo".',
    );
  });
});