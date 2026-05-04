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

  onModuleInit(): void {
    const host = this.configService.getOrThrow<string>(Env.USER_SERVICE_HOST);
    const port = this.configService.getOrThrow<number>(
      Env.USER_SERVICE_TCP_PORT,
    );
    this.logger.log(
      `user-service TCP client → ${host}:${port} (connects on first request)`,
    );
  }

  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  /** Proxies to user-service over Nest TCP (`users.list`). */
  listUsersFromUserService(): Promise<unknown> {
    return firstValueFrom(this.userServiceClient.send('users.list', {}));
  }
}
