import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UserProfile } from '@zenith-backend/user-contracts';
import { createClient, type RedisClientType } from 'redis';

import { Env } from '@/libs/configs/env.config';
import type { IUserCache } from '@/modules/user/application/interfaces';

@Injectable()
export class RedisUserCacheService
  implements IUserCache, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisUserCacheService.name);
  private readonly client: RedisClientType;
  private readonly ttlSeconds: number;

  constructor(private readonly configService: ConfigService) {
    this.client = createClient({
      url: this.configService.getOrThrow<string>(Env.REDIS_URL),
    });
    this.ttlSeconds = this.configService.getOrThrow<number>(
      Env.USER_CACHE_TTL_SECONDS,
    );
  }

  async onModuleInit(): Promise<void> {
    this.client.on('error', (err) => {
      this.logger.error('Redis client error', err);
    });

    await this.client.connect();
    this.logger.log('Redis user cache connected');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async cacheProfile(profile: UserProfile): Promise<void> {
    const value = JSON.stringify(profile);
    const commands = [
      this.client.set(this.profileIdKey(profile.id), value, {
        EX: this.ttlSeconds,
      }),
    ];

    if (profile.externalId) {
      commands.push(
        this.client.set(this.profileClerkKey(profile.externalId), value, {
          EX: this.ttlSeconds,
        }),
      );
    }

    await Promise.all(commands);
  }

  private profileIdKey(id: string): string {
    return `user:profile:id:${id}`;
  }

  private profileClerkKey(clerkUserId: string): string {
    return `user:profile:clerk:${clerkUserId}`;
  }
}
