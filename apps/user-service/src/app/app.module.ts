import { Module } from '@nestjs/common';

import { AppController } from '@/app/app.controller';
import { AppService } from '@/app/app.service';
import { AppConfigModule } from '@/libs/configs/config.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [AppConfigModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
