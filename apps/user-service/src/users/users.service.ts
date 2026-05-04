import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '@/database/entities/user.entity';

export type UserProfileDto = {
  id: string;
  externalId: string | null;
  displayName: string | null;
  avatar: string | null;
  email: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async list(): Promise<UserProfileDto[]> {
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
}
