import { Inject, Injectable } from '@nestjs/common';
import type { CreateUserFromClerkInput } from '@zenith-backend/user-contracts';

import {
  type IUserCache,
  type IUserRepository,
  USER_CACHE_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '@/modules/user/application/interfaces';
import type { UserProfile } from '@/modules/user/domain';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(USER_CACHE_TOKEN)
    private readonly userCache: IUserCache,
  ) {}

  async list(): Promise<UserProfile[]> {
    return this.userRepository.findAllProfilesOrderedByCreatedDesc();
  }

  async createFromClerkWebhook(
    input: CreateUserFromClerkInput,
  ): Promise<UserProfile> {
    const profile = await this.userRepository.createFromClerkWebhook(input);
    await this.userCache.cacheProfile(profile);
    return profile;
  }
}
