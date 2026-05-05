import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  CreateUserFromClerkInput,
  UserProfile,
} from '@zenith-backend/user-contracts';
import { Repository } from 'typeorm';

import { type IUserRepository } from '@/modules/user/application/interfaces';
import { User } from '@/modules/user/infrastructure/persistence/entities/user.entity';

@Injectable()
export class TypeormUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAllProfilesOrderedByCreatedDesc(): Promise<UserProfile[]> {
    const rows = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });

    return rows.map((u) => ({
      id: u.id,
      externalId: u.externalId,
      displayName: u.displayName,
      avatar: u.avatar,
      email: u.email,
    }));
  }

  async createFromClerkWebhook(
    input: CreateUserFromClerkInput,
  ): Promise<UserProfile> {
    const existingByExternal = await this.usersRepository.findOne({
      where: { externalId: input.clerkUserId },
    });
    if (existingByExternal) {
      return this.toProfile(existingByExternal);
    }

    const existingByEmail = await this.usersRepository.findOne({
      where: { email: input.email },
    });
    if (existingByEmail) {
      throw new ConflictException(
        `User with email ${input.email} already exists`,
      );
    }

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        email: input.email,
        displayName: input.displayName,
        avatar: input.avatar,
        externalId: input.clerkUserId,
      }),
    );

    return this.toProfile(user);
  }

  private toProfile(user: User): UserProfile {
    return {
      id: user.id,
      externalId: user.externalId,
      displayName: user.displayName,
      avatar: user.avatar,
      email: user.email,
    };
  }
}
