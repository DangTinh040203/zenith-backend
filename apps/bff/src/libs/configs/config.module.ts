import { join } from 'node:path';

import { ConfigModule } from '@nestjs/config';

import { validationSchema } from '@/libs/configs/env.config';

function resolveBffEnvFilePaths(): string[] {
  const cwd = process.cwd().replace(/\\/g, '/');
  const runningFromBffDir = cwd.endsWith('/apps/bff');
  const appRoot = runningFromBffDir
    ? process.cwd()
    : join(process.cwd(), 'apps', 'bff');

  // Nest merges so earlier entries win over later; keep .env.local > .env > .env.example.
  return [
    join(appRoot, '.env.local'),
    join(appRoot, '.env'),
    join(appRoot, '.env.example'),
  ];
}

export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: resolveBffEnvFilePaths(),
  validationSchema,
  validationOptions: {
    abortEarly: false,
    convert: true,
  },
});
