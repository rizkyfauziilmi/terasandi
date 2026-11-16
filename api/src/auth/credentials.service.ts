import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import type { User } from '../db/schema.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  /** The user, or `null` when the username or the password is wrong. */
  async verify(username: string, password: string): Promise<User | null> {
    const found = await this.usersService.findCredentials(username);

    // With no account, verify() checks a dummy hash, so response time does not
    // reveal which usernames are registered.
    const valid = await this.passwordHasher.verify(
      password,
      found?.passwordHash,
    );

    if (!valid || !found?.passwordHash) {
      return null;
    }

    // The cost settings changed since this hash was stored: upgrade it now,
    // while we have the plaintext.
    if (this.passwordHasher.needsRehash(found.passwordHash)) {
      await this.usersService.updatePasswordHash(
        found.user.id,
        await this.passwordHasher.hash(password),
      );
    }

    return found.user;
  }
}
