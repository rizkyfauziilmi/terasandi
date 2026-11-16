import { Module } from '@nestjs/common';
import { UserPolicy } from './user.policy.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  providers: [UsersService, UserPolicy],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
