import { ConfigModule } from '@nestjs/config';

import { validationSchema } from '@/libs/configs/env.config';
import { resolveUserServiceEnvFilePaths } from '@/libs/configs/env-file-paths';

export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: resolveUserServiceEnvFilePaths(),
  validationSchema,
  validationOptions: {
    abortEarly: false,
    convert: true,
  },
});
