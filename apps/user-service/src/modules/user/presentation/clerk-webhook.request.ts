import type { Request } from 'express';

import type { ClerkWebhook } from '@/modules/user/domain';

export type ClerkWebhookRequest = Request & {
  rawBody?: Buffer;
  clerkEvent?: ClerkWebhook;
};
