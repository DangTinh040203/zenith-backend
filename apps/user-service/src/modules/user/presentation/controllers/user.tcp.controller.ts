import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
  type ClerkWebhook,
  USER_SERVICE_PATTERNS,
} from '@zenith-backend/user-contracts';

import { ClerkWebhookService } from '@/modules/user/application/services';
import { UserService } from '@/modules/user/application/services/user.service';

@Controller()
export class UserTcpController {
  constructor(
    private readonly userService: UserService,
    private readonly clerkWebhookService: ClerkWebhookService,
  ) {}

  @MessagePattern(USER_SERVICE_PATTERNS.LIST_USERS)
  list() {
    return this.userService.list();
  }

  @MessagePattern(USER_SERVICE_PATTERNS.PROCESS_CLERK_WEBHOOK)
  processClerkWebhook(event: ClerkWebhook | undefined): Promise<void> {
    return this.clerkWebhookService.processWebhook(event);
  }
}
