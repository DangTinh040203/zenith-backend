import { join } from 'node:path';

import { ConfigModule } from '@nestjs/config';

import { validationSchema } from '@/libs/configs/env.config';

function resolveUserServiceEnvFilePaths(): string[] {
  const cwd = process.cwd().replace(/\\/g, '/');
  const runningFromAppDir = cwd.endsWith('/apps/user-service');
  const appRoot = runningFromAppDir
    ? process.cwd()
    : join(process.cwd(), 'apps', 'user-service');

  // Nest merges so earlier entries win over later; keep .env.local > .env > .env.example.
  return [
    join(appRoot, '.env.local'),
    join(appRoot, '.env'),
    join(appRoot, '.env.example'),
  ];
}

export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: resolveUserServiceEnvFilePaths(),
  validationSchema,
  validationOptions: {
    abortEarly: false,
    convert: true,
  },
});
