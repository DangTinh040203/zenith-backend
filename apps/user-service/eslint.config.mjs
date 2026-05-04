import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import baseConfig from '../../eslint.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const restrictRelativeImports = {
  patterns: [
    {
      group: ['../*', '../**/*', './*', './**/*'],
      message:
        'Relative imports are not allowed. Use path aliases (e.g. @/…) instead.',
    },
  ],
};

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: [join(__dirname, 'tsconfig.app.json')],
        },
      },
    },
  },
  // Ensure IDE ESLint matches CLI: root `files` globs can miss paths the extension uses.
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', restrictRelativeImports],
    },
  },
];
