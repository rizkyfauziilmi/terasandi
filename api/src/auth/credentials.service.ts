import { ConflictException, Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import type { User } from '../db/schema.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async register(username: string, password: string): Promise<User> {
    if (await this.usersService.findByUsername(username)) {
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await this.passwordHasher.hash(password);

    try {
      return await this.usersService.create({ username, passwordHash });
    } catch (error) {
      // The unique index catches a concurrent sign-up for the same username.
      if (isUniqueViolation(error)) {
        throw new ConflictException('Username is already taken');
      }
      throw error;
    }
  }

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

function isUniqueViolation(error: unknown, depth = 0): boolean {
  if (depth > 3 || typeof error !== 'object' || error === null) {
    return false;
  }

  const { code, cause } = error as { code?: unknown; cause?: unknown };

  return code === '23505' || isUniqueViolation(cause, depth + 1);
}
