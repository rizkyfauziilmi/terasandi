import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { publicUserColumns, users } from '../db/schema.js';
import type { User } from '../db/schema.js';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db
      .select(publicUserColumns)
      .from(users)
      .where(eq(users.id, id));

    return user;
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db
      .select(publicUserColumns)
      .from(users)
      .where(eq(users.username, username));

    return user;
  }

  /** For password sign-in only: the one place a password hash leaves the database. */
  async findCredentials(
    username: string,
  ): Promise<{ user: User; passwordHash: string } | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (!row) {
      return undefined;
    }

    const { passwordHash, ...user } = row;
    return { user, passwordHash };
  }

  async create(input: {
    username: string;
    passwordHash: string;
  }): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(input)
      .returning(publicUserColumns);

    return user;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }
}
