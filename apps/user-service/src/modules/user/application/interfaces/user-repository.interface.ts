import type { UserProfile } from '@/modules/user/domain';

export const USER_REPOSITORY_TOKEN = Symbol('USER_REPOSITORY_TOKEN');

export type CreateUserFromClerkInput = {
  clerkUserId: string;
  email: string;
  displayName: string | null;
  avatar: string | null;
};

export interface IUserRepository {
  findAllProfilesOrderedByCreatedDesc(): Promise<UserProfile[]>;
  createFromClerkWebhook(input: CreateUserFromClerkInput): Promise<void>;
}
