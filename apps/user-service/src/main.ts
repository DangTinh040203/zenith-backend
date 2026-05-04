import { type INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from '@/app/app.module';
import { Env } from '@/libs/configs';

class BootstrapApplication {
  private app!: INestApplication;
  private configService!: ConfigService;

  async run() {
    this.app = await NestFactory.create(AppModule);

    this.configService = this.app.get(ConfigService);
    const tcpPort = this.configService.getOrThrow<number>(Env.TCP_PORT);

    this.app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: tcpPort },
    });

    await this.app.startAllMicroservices();

    Logger.log(
      `User service (TCP only) listening on 0.0.0.0:${tcpPort}`,
      BootstrapApplication.name,
    );
  }
}

void new BootstrapApplication().run();
