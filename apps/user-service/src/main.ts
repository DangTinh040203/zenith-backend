import {
  BadRequestException,
  type INestApplication,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';
import morgan from 'morgan';

import { AppModule } from '@/app/app.module';
import { Env } from '@/libs/configs';
import { formatError } from '@/libs/utils/formatError.util';

class BootstrapApplication {
  private app!: INestApplication;
  private configService!: ConfigService;

  async run() {
    this.app = await NestFactory.create(AppModule);

    this.configService = this.app.get(ConfigService);
    const port = this.configService.getOrThrow<number>(Env.PORT);
    const tcpPort = this.configService.getOrThrow<number>(Env.TCP_PORT);
    const apiPrefix = this.configService.get<string>(Env.API_PREFIX, 'api');
    const apiVersion = this.configService.get<string>(Env.API_VERSION, '1');

    this.app.setGlobalPrefix(`${apiPrefix}/v${apiVersion}`);

    this.app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: tcpPort },
    });

    this.setupMiddleware();

    await this.app.startAllMicroservices();
    await this.app.listen(port);

    Logger.log(
      `User service TCP (BFF) on 0.0.0.0:${tcpPort}`,
      BootstrapApplication.name,
    );
    Logger.log(
      `User service HTTP (health only) on http://localhost:${port}/${apiPrefix}/v${apiVersion}`,
      BootstrapApplication.name,
    );
  }

  private setupMiddleware() {
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (validationErrors) => {
          return new BadRequestException(formatError(validationErrors));
        },
      }),
    );

    this.app.use(helmet());

    const isProduction =
      this.configService.get<string>(Env.NODE_ENV) === 'production';
    this.app.use(morgan(isProduction ? 'combined' : 'dev'));
  }
}

void new BootstrapApplication().run();
