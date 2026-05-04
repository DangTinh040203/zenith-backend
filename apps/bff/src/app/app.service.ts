import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { USER_SERVICE_TCP_CLIENT } from '@/libs/clients/user-service.client';

@Injectable()
export class AppService {
  constructor(
    @Inject(USER_SERVICE_TCP_CLIENT)
    private readonly userServiceClient: ClientProxy,
  ) {}

  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  /** Proxies to user-service over Nest TCP (`users.list`). */
  listUsersFromUserService(): Promise<unknown> {
    return firstValueFrom(this.userServiceClient.send('users.list', {}));
  }
}
