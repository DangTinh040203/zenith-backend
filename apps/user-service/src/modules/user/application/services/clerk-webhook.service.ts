import { Injectable, Logger } from '@nestjs/common';

import { UserCreatedStrategy } from '@/modules/user/application/strategies';
import { ClerkUserWebhook, type ClerkWebhook } from '@/modules/user/domain';

@Injectable()
export class ClerkWebhookService {
  private readonly logger = new Logger(ClerkWebhookService.name);

  constructor(private readonly userCreatedStrategy: UserCreatedStrategy) {}

  async processWebhook(evt: ClerkWebhook | undefined): Promise<void> {
    if (!evt) {
      this.logger.error('Missing verified Clerk event');
      return;
    }

    if (evt.type === ClerkUserWebhook.USER_CREATED) {
      await this.userCreatedStrategy.handle(evt);
      return;
    }

    this.logger.debug(`No handler for event type: ${evt.type}`);
  }
}
