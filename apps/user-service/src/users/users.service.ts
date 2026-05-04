import { Injectable } from '@nestjs/common';

export type UserProfileDto = {
  id: string;
  externalId: string;
  displayName: string | null;
};

@Injectable()
export class UsersService {
  /**
   * Placeholder until Postgres + Clerk sync land; replace with real queries.
   */
  listStub(): UserProfileDto[] {
    return [];
  }
}
