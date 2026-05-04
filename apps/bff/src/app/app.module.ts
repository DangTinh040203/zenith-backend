import { Module } from '@nestjs/common';

import { AppController } from '@/app/app.controller';
import { AppService } from '@/app/app.service';
import { AppConfigModule } from '@/libs/configs/config.module';

@Module({
  imports: [AppConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
