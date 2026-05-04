import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { USER_SERVICE_TCP_CLIENT } from '@/libs/clients/user-service.client';
import { Env } from '@/libs/configs/env.config';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @Inject(USER_SERVICE_TCP_CLIENT)
    private readonly userServiceClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.getOrThrow<string>(Env.USER_SERVICE_HOST);
    const port = this.configService.getOrThrow<number>(
      Env.USER_SERVICE_TCP_PORT,
    );
    try {
      await this.userServiceClient.connect();
      this.logger.log(
        `TCP client connected to user-service at ${host}:${port}`,
      );
    } catch (err) {
      this.logger.error(
        `TCP client failed to connect to user-service at ${host}:${port}`,
        err,
      );
      throw err;
    }
  }

  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  /** Proxies to user-service over Nest TCP (`users.list`). */
  listUsersFromUserService(): Promise<unknown> {
    return firstValueFrom(this.userServiceClient.send('users.list', {}));
  }
}
