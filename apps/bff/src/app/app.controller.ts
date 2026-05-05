import {
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AppService } from '@/app/app.service';
import { ClerkWebhookGuard } from '@/app/clerk-webhook.guard';
import type { ClerkWebhookRequest } from '@/app/clerk-webhook.request';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('users')
  listUsers() {
    return this.appService.listUsersFromUserService();
  }

  @UseGuards(ClerkWebhookGuard)
  @Post('webhooks/clerk')
  @HttpCode(200)
  async handleClerkWebhook(
    @Req() req: ClerkWebhookRequest,
  ): Promise<{ received: true }> {
    await this.appService.processClerkWebhook(req.clerkEvent);
    return { received: true };
  }
}
