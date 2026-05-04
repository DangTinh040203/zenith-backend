import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';

import { Env } from '@/libs/configs/env.config';
import type { ClerkWebhook } from '@/modules/user/domain';
import type { ClerkWebhookRequest } from '@/modules/user/presentation/clerk-webhook.request';

@Injectable()
export class ClerkWebhookGuard implements CanActivate {
  private readonly logger = new Logger(ClerkWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ClerkWebhookRequest>();
    const header = (name: string): string | undefined => {
      const v = request.headers[name];
      if (Array.isArray(v)) return v[0];
      return v;
    };
    const svixHeaders = {
      'svix-id': header('svix-id'),
      'svix-timestamp': header('svix-timestamp'),
      'svix-signature': header('svix-signature'),
    };

    if (
      !svixHeaders['svix-id'] ||
      !svixHeaders['svix-timestamp'] ||
      !svixHeaders['svix-signature']
    ) {
      this.logger.error('Missing svix headers');
      throw new ForbiddenException('Missing required svix headers');
    }

    const wh = new Webhook(
      this.configService.getOrThrow<string>(Env.CLERK_WEBHOOK_SECRET),
    );

    const payload = this.getVerifiedPayloadString(request);

    try {
      const evt = wh.verify(payload, svixHeaders) as ClerkWebhook;
      request.clerkEvent = evt;
      return true;
    } catch (err) {
      this.logger.error('Error verifying webhook:', err);
      throw new ForbiddenException('Webhook verification failed');
    }
  }

  private getVerifiedPayloadString(request: ClerkWebhookRequest): string {
    if (Buffer.isBuffer(request.rawBody)) {
      return request.rawBody.toString('utf8');
    }
    return JSON.stringify(request.body);
  }
}
