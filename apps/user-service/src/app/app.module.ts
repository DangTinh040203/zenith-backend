import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/database/database.module';
import { AppConfigModule } from '@/libs/configs/config.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, UsersModule],
})
export class AppModule {}
