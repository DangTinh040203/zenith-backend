import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClerkWebhook } from '@zenith-backend/user-contracts';
import { Webhook } from 'svix';

import type { ClerkWebhookRequest } from '@/app/clerk-webhook.request';
import { Env } from '@/libs/configs/env.config';

@Injectable()
export class ClerkWebhookGuard implements CanActivate {
  private readonly logger = new Logger(ClerkWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ClerkWebhookRequest>();
    const svixHeaders = {
      'svix-id': this.getHeader(request, 'svix-id'),
      'svix-timestamp': this.getHeader(request, 'svix-timestamp'),
      'svix-signature': this.getHeader(request, 'svix-signature'),
    };

    if (
      !svixHeaders['svix-id'] ||
      !svixHeaders['svix-timestamp'] ||
      !svixHeaders['svix-signature']
    ) {
      this.logger.error('Missing svix headers');
      throw new ForbiddenException('Missing required svix headers');
    }

    const webhook = new Webhook(
      this.configService.getOrThrow<string>(Env.CLERK_WEBHOOK_SECRET),
    );
    const payload = this.getVerifiedPayloadString(request);

    try {
      request.clerkEvent = webhook.verify(payload, svixHeaders) as ClerkWebhook;
      return true;
    } catch (err) {
      this.logger.error('Error verifying Clerk webhook', err);
      throw new ForbiddenException('Webhook verification failed');
    }
  }

  private getHeader(
    request: ClerkWebhookRequest,
    name: string,
  ): string | undefined {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }

  private getVerifiedPayloadString(request: ClerkWebhookRequest): string {
    if (Buffer.isBuffer(request.rawBody)) {
      return request.rawBody.toString('utf8');
    }

    return JSON.stringify(request.body);
  }
}
