import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { UserService } from '@/modules/user/application/services/user.service';

@Controller()
export class UserTcpController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern('users.list')
  list() {
    return this.userService.list();
  }
}
