import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  type CreateUserFromClerkInput,
  type IUserRepository,
} from '@/modules/user/application/interfaces';
import type { UserProfile } from '@/modules/user/domain';
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

  async createFromClerkWebhook(input: CreateUserFromClerkInput): Promise<void> {
    const existingByExternal = await this.usersRepository.findOne({
      where: { externalId: input.clerkUserId },
    });
    if (existingByExternal) {
      return;
    }

    const existingByEmail = await this.usersRepository.findOne({
      where: { email: input.email },
    });
    if (existingByEmail) {
      throw new ConflictException(
        `User with email ${input.email} already exists`,
      );
    }

    await this.usersRepository.save(
      this.usersRepository.create({
        email: input.email,
        displayName: input.displayName,
        avatar: input.avatar,
        externalId: input.clerkUserId,
      }),
    );
  }
}
