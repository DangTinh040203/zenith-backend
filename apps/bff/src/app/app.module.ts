import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { AppController } from '@/app/app.controller';
import { AppService } from '@/app/app.service';
import { ClerkWebhookGuard } from '@/app/clerk-webhook.guard';
import { USER_SERVICE_TCP_CLIENT } from '@/libs/clients/user-service.client';
import { AppConfigModule } from '@/libs/configs/config.module';
import { Env } from '@/libs/configs/env.config';

@Module({
  imports: [
    AppConfigModule,
    ClientsModule.registerAsync([
      {
        name: USER_SERVICE_TCP_CLIENT,
        imports: [AppConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.getOrThrow<string>(Env.USER_SERVICE_HOST),
            port: config.getOrThrow<number>(Env.USER_SERVICE_TCP_PORT),
          },
        }),
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService, ClerkWebhookGuard],
})
export class AppModule {}
