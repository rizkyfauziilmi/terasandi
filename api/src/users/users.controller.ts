import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import type { User } from '../db/schema.js';

@Controller('users')
export class UsersController {
  @Get('me')
  me(@CurrentUser() user: User): User {
    return user;
  }
}
