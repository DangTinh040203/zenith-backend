import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import baseConfig from '../../eslint.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
];
