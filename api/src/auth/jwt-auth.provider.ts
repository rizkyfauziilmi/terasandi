import {
  AuthenticationRegistry,
  JwtBearerProvider,
} from '@nestjs/authentication';
import type { JwtClaims } from '@nestjs/authentication';
import { Injectable } from '@nestjs/common';
import type { User } from '../db/schema.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class JwtAuth extends JwtBearerProvider<User> {
  constructor(
    private readonly usersService: UsersService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  async validate({ sub }: JwtClaims): Promise<User | null> {
    return sub ? ((await this.usersService.findById(sub)) ?? null) : null;
  }
}
