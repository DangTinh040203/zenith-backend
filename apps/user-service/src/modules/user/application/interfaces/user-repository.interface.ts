import type {
  CreateUserFromClerkInput,
  UserProfile,
} from '@zenith-backend/user-contracts';

export const USER_REPOSITORY_TOKEN = Symbol('USER_REPOSITORY_TOKEN');

export interface IUserRepository {
  findAllProfilesOrderedByCreatedDesc(): Promise<UserProfile[]>;
  createFromClerkWebhook(input: CreateUserFromClerkInput): Promise<UserProfile>;
}
