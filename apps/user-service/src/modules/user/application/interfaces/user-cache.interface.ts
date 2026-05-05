import type { UserProfile } from '@zenith-backend/user-contracts';

export const USER_CACHE_TOKEN = Symbol('USER_CACHE_TOKEN');

export interface IUserCache {
  cacheProfile(profile: UserProfile): Promise<void>;
}
