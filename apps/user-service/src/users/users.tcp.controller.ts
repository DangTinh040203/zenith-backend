import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { UsersService } from '@/users/users.service';

@Controller()
export class UsersTcpController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern('users.list')
  list() {
    return this.usersService.list();
  }
}
