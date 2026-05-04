import { Inject, Injectable } from '@nestjs/common';

import {
  type CreateUserFromClerkInput,
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/modules/user/application/interfaces';
import type { UserProfile } from '@/modules/user/domain';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async list(): Promise<UserProfile[]> {
    return this.userRepository.findAllProfilesOrderedByCreatedDesc();
  }

  async createFromClerkWebhook(input: CreateUserFromClerkInput): Promise<void> {
    return this.userRepository.createFromClerkWebhook(input);
  }
}
