import { join } from 'node:path';

import { ConfigModule } from '@nestjs/config';

import { validationSchema } from '@/libs/configs/env.config';

function resolveBffEnvFilePath(): string {
  const cwd = process.cwd().replace(/\\/g, '/');
  const runningFromBffDir = cwd.endsWith('/apps/bff');

  return runningFromBffDir
    ? join(process.cwd(), '.env')
    : join(process.cwd(), 'apps', 'bff', '.env');
}

export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: resolveBffEnvFilePath(),
  validationSchema,
  validationOptions: {
    abortEarly: false,
    convert: true,
  },
});
