import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { USER_REPOSITORY_TOKEN } from '@/modules/user/application/interfaces';
import { ClerkWebhookService } from '@/modules/user/application/services';
import { UserService } from '@/modules/user/application/services/user.service';
import { UserCreatedStrategy } from '@/modules/user/application/strategies';
import { Role, User } from '@/modules/user/infrastructure/persistence/entities';
import { TypeormUserRepository } from '@/modules/user/infrastructure/persistence/typeorm-user.repository';
import {
  UserController,
  UserTcpController,
} from '@/modules/user/presentation/controllers';
import { ClerkWebhookGuard } from '@/modules/user/presentation/guards/clerk-webhook.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [UserTcpController, UserController],
  providers: [
    UserService,
    ClerkWebhookGuard,
    ClerkWebhookService,
    UserCreatedStrategy,
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: TypeormUserRepository,
    },
  ],
  exports: [UserService, TypeOrmModule, USER_REPOSITORY_TOKEN],
})
export class UserModule {}
