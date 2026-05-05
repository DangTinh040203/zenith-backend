import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  USER_CACHE_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '@/modules/user/application/interfaces';
import { ClerkWebhookService } from '@/modules/user/application/services';
import { UserService } from '@/modules/user/application/services/user.service';
import { UserCreatedStrategy } from '@/modules/user/application/strategies';
import { RedisUserCacheService } from '@/modules/user/infrastructure/cache';
import { Role, User } from '@/modules/user/infrastructure/persistence/entities';
import { TypeormUserRepository } from '@/modules/user/infrastructure/persistence/typeorm-user.repository';
import { UserTcpController } from '@/modules/user/presentation/controllers';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [UserTcpController],
  providers: [
    UserService,
    ClerkWebhookService,
    UserCreatedStrategy,
    {
      provide: USER_CACHE_TOKEN,
      useClass: RedisUserCacheService,
    },
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: TypeormUserRepository,
    },
  ],
  exports: [
    UserService,
    TypeOrmModule,
    USER_REPOSITORY_TOKEN,
    USER_CACHE_TOKEN,
  ],
})
export class UserModule {}
