import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: ['dist/**', 'templates/**', 'node_modules/**'],
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir,
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
