import type { ClerkWebhook } from '@zenith-backend/user-contracts';
import type { Request } from 'express';

export interface ClerkWebhookRequest extends Request {
  rawBody?: Buffer;
  clerkEvent?: ClerkWebhook;
}
