import {
  AuthenticationRegistry,
  JwtBearerProvider,
} from '@nestjs/authentication';
import type { JwtClaims } from '@nestjs/authentication';
import { Injectable, Logger } from '@nestjs/common';
import type { User } from '../db/schema.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class JwtAuth extends JwtBearerProvider<User> {
  private readonly logger = new Logger(JwtAuth.name);

  constructor(
    private readonly usersService: UsersService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  async validate({ sub }: JwtClaims): Promise<User | null> {
    if (!sub) {
      return null;
    }

    const user = await this.usersService.findById(sub);

    if (!user) {
      // The token is valid but its subject was deleted: worth a look, not an error.
      this.logger.debug('JWT subject has no user', { sub });
      return null;
    }

    return user;
  }
}
