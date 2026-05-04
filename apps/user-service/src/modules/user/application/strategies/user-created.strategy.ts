import { Injectable, Logger } from '@nestjs/common';

import { UserService } from '@/modules/user/application/services/user.service';
import { type ClerkWebhook } from '@/modules/user/domain';

@Injectable()
export class UserCreatedStrategy {
  private readonly logger = new Logger(UserCreatedStrategy.name);

  constructor(private readonly userService: UserService) {}

  async handle(event: ClerkWebhook): Promise<void> {
    const { data } = event;

    const primaryEmail = data.email_addresses.find(
      (email) => email.id === data.primary_email_address_id,
    );

    if (!primaryEmail) {
      this.logger.warn(`No primary email found for user ${data.id}`);
      return;
    }

    const displayName =
      [data.first_name, data.last_name].filter(Boolean).join(' ').trim() ||
      null;

    await this.userService.createFromClerkWebhook({
      clerkUserId: data.id,
      email: primaryEmail.email_address,
      displayName,
      avatar: data.image_url ?? null,
    });

    this.logger.log(
      `User synced from Clerk: ${primaryEmail.email_address} (${data.id})`,
    );
  }
}
