import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Role } from '@/database/entities/role.entity';
import { User } from '@/database/entities/user.entity';
import { UsersService } from '@/users/users.service';
import { UsersTcpController } from '@/users/users.tcp.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [UsersTcpController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
