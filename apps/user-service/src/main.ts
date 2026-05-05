import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { type NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from '@/app/app.module';
import { Env } from '@/libs/configs';

class BootstrapApplication {
  private app!: NestExpressApplication;
  private configService!: ConfigService;

  async run() {
    this.app = await NestFactory.create<NestExpressApplication>(AppModule);

    this.configService = this.app.get(ConfigService);
    const tcpPort = this.configService.getOrThrow<number>(Env.TCP_PORT);
    const httpPort = this.configService.getOrThrow<number>(Env.HTTP_PORT);

    this.app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: tcpPort },
    });

    await this.app.startAllMicroservices();
    await this.app.listen(httpPort, '0.0.0.0');

    Logger.log(
      `User service TCP listening on 0.0.0.0:${tcpPort}`,
      BootstrapApplication.name,
    );
    Logger.log(
      `User service HTTP listening on http://0.0.0.0:${httpPort}`,
      BootstrapApplication.name,
    );
  }
}

void new BootstrapApplication().run();
