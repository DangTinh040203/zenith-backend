import { Module } from '@nestjs/common';

import { AppController } from '@/app/app.controller';
import { AppService } from '@/app/app.service';
import { DatabaseModule } from '@/database/database.module';
import { AppConfigModule } from '@/libs/configs/config.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
