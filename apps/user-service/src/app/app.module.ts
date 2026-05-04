import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/database/database.module';
import { AppConfigModule } from '@/libs/configs/config.module';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, UserModule],
})
export class AppModule {}
