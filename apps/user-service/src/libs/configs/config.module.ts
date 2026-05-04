import { join } from 'node:path';

import { ConfigModule } from '@nestjs/config';

import { validationSchema } from '@/libs/configs/env.config';

function resolveUserServiceEnvFilePath(): string {
  const cwd = process.cwd().replace(/\\/g, '/');
  const runningFromAppDir = cwd.endsWith('/apps/user-service');

  return runningFromAppDir
    ? join(process.cwd(), '.env')
    : join(process.cwd(), 'apps', 'user-service', '.env');
}

export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: resolveUserServiceEnvFilePath(),
  validationSchema,
  validationOptions: {
    abortEarly: false,
    convert: true,
  },
});
