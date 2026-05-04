import { Controller, Logger, Post, Req, UseGuards } from '@nestjs/common';

import { ClerkWebhookService } from '@/modules/user/application/services';
import type { ClerkWebhookRequest } from '@/modules/user/presentation/clerk-webhook.request';
import { ClerkWebhookGuard } from '@/modules/user/presentation/guards/clerk-webhook.guard';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly clerkWebhookService: ClerkWebhookService) {}

  @UseGuards(ClerkWebhookGuard)
  @Post('clerk')
  async handleClerkWebhook(
    @Req() req: ClerkWebhookRequest,
  ): Promise<{ received: true }> {
    this.logger.log(`Clerk webhook received: ${req.clerkEvent?.type}`);
    await this.clerkWebhookService.processWebhook(req.clerkEvent);
    return { received: true };
  }
}
