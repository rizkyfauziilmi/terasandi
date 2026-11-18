import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { ListUsersQueryDto, Role, UserPage } from '@terasandi/contracts';
import { and, asc, count, eq, ilike, isNull, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  publicUserColumns,
  refreshTokenFamilies,
  users,
} from '../db/schema.js';
import type { User } from '../db/schema.js';

/**
 * Serializes the checks that must see every user row: onboarding, role
 * changes and account deletion. Without it, two concurrent requests each pass
 * an "is there another admin?" check and together leave the install without
 * one.
 */
const onboardingLock = sql`select pg_advisory_xact_lock(hashtext('users:onboarding'))`;
const rolesLock = sql`select pg_advisory_xact_lock(hashtext('users:roles'))`;

/** Wraps a search term in `%…%`, escaping the characters `ILIKE` treats specially. */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db
      .select(publicUserColumns)
      .from(users)
      .where(eq(users.id, id));

    return user;
  }

  /** The account, or a 404 for a route that needs it to exist. */
  findOrFail(id: string): Promise<User> {
    return loadOrFail(this.db, id);
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

  /** One page of accounts, newest first, with the total matching the filters. */
  async list(query: ListUsersQueryDto): Promise<UserPage<User>> {
    const filters = [];

    if (query.q) {
      filters.push(ilike(users.username, likePattern(query.q)));
    }

    if (query.role) {
      filters.push(eq(users.role, query.role));
    }

    const where = filters.length > 0 ? and(...filters) : undefined;

    const items = await this.db
      .select(publicUserColumns)
      .from(users)
      .where(where)
      .orderBy(asc(users.createdAt), asc(users.id))
      .limit(query.limit)
      .offset(query.offset);

    const [counted] = await this.db
      .select({ value: count() })
      .from(users)
      .where(where);

    return {
      items,
      total: counted?.value ?? 0,
      limit: query.limit,
      offset: query.offset,
    };
  }

  /**
   * The first account of an install, and its only admin until it promotes
   * someone. Returns `undefined` when setup is already complete, so a
   * concurrent onboarding request can never create a second admin.
   */
  async createFirstAdmin(input: {
    username: string;
    password: string;
  }): Promise<User | undefined> {
    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.db.transaction(async (tx) => {
      await tx.execute(onboardingLock);

      const [existing] = await tx.select({ id: users.id }).from(users).limit(1);
      if (existing) {
        return undefined;
      }

      const [user] = await tx
        .insert(users)
        .values({ username: input.username, passwordHash, role: 'admin' })
        .returning(publicUserColumns);

      return user;
    });
  }

  /**
   * Creates an account on an admin's behalf. New accounts are plain users;
   * `updateRole()` is the only way to promote one.
   */
  async createWithPassword(
    input: { username: string; password: string },
    actorId: string,
  ): Promise<User> {
    if (await this.findByUsername(input.username)) {
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    // The unique index catches a concurrent creation for the same username.
    const user = await rethrowUsernameConflict(async () => {
      const [created] = await this.db
        .insert(users)
        .values({
          username: input.username,
          passwordHash,
          role: 'user',
        })
        .returning(publicUserColumns);

      return created;
    });

    this.logger.log('User created', {
      actorId,
      userId: user.id,
      role: user.role,
    });

    return user;
  }

  /** Renames an account. The unique index is what settles a concurrent rename. */
  async updateUsername(
    id: string,
    username: string,
    actorId: string,
  ): Promise<User> {
    const user = await rethrowUsernameConflict(async () => {
      const [updated] = await this.db
        .update(users)
        .set({ username })
        .where(eq(users.id, id))
        .returning(publicUserColumns);

      if (!updated) {
        throw new NotFoundException('User not found');
      }

      return updated;
    });

    this.logger.log('Username changed', { actorId, userId: user.id });

    return user;
  }

  /**
   * Changes one account's role. The last admin cannot be demoted: an install
   * with no admin cannot create users or promote anyone again.
   */
  async updateRole(id: string, role: Role, actorId: string): Promise<User> {
    return this.db.transaction(async (tx) => {
      await tx.execute(rolesLock);

      const current = await loadOrFail(tx, id);

      if (current.role === role) {
        return current;
      }

      if (current.role === 'admin' && role === 'user') {
        await assertNotLastAdmin(tx, current, 'remove');
      }

      const [user] = await tx
        .update(users)
        .set({ role })
        .where(eq(users.id, id))
        .returning(publicUserColumns);

      this.logger.log('User role changed', {
        actorId,
        userId: user.id,
        from: current.role,
        to: user.role,
      });

      return user;
    });
  }

  /**
   * Sets a new password and signs the account out everywhere. The refresh
   * token is what a session lives on; access tokens keep working until they
   * expire, at most the access token TTL.
   */
  async resetPassword(
    id: string,
    password: string,
    actorId: string,
  ): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(password);

    await this.db.transaction(async (tx) => {
      await loadOrFail(tx, id);

      await tx.update(users).set({ passwordHash }).where(eq(users.id, id));
      await revokeFamilies(tx, id);
    });

    this.logger.log('User password reset', { actorId, userId: id });
  }

  /** Signs an account out of every device without changing its password. */
  async revokeSessions(id: string, actorId: string): Promise<void> {
    await this.findOrFail(id);

    await revokeFamilies(this.db, id);

    this.logger.log('User sessions revoked', { actorId, userId: id });
  }

  /**
   * Deletes an account. The last admin cannot be deleted, and an admin cannot
   * delete themselves through this route: either would end a session that may
   * be the only way back in. Refresh tokens go with the row through the
   * foreign-key cascade.
   */
  async deleteUser(id: string, actorId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(rolesLock);

      const current = await loadOrFail(tx, id);

      if (current.id === actorId) {
        throw new ConflictException('Cannot delete your own account');
      }

      await assertNotLastAdmin(tx, current, 'delete');

      await tx.delete(users).where(eq(users.id, id));

      this.logger.log('User deleted', {
        actorId,
        userId: id,
        role: current.role,
      });
    });
  }

  /** Whether onboarding has already run. */
  async hasAnyUser(): Promise<boolean> {
    return (await this.db.select().from(users).limit(1)).length > 0;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }
}

/** The account by id, or a 404. Shared by the transactional methods, which
 *  must read the row inside the same transaction that later writes it. */
async function loadOrFail(db: NodePgDatabase, id: string): Promise<User> {
  const [user] = await db
    .select(publicUserColumns)
    .from(users)
    .where(eq(users.id, id));

  if (!user) {
    throw new NotFoundException('User not found');
  }

  return user;
}

/**
 * Refuses when the account is the only admin: an install with no admin cannot
 * create users or promote anyone again. Call inside a `rolesLock` transaction,
 * so the count sees every row.
 */
async function assertNotLastAdmin(
  db: NodePgDatabase,
  user: User,
  action: 'remove' | 'delete',
): Promise<void> {
  if (user.role !== 'admin') {
    return;
  }

  const [admins] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, 'admin'));

  if (admins.value <= 1) {
    throw new ConflictException(`Cannot ${action} the last admin`);
  }
}

/** Runs a write that a concurrent request may lose to the unique username index. */
async function rethrowUsernameConflict<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictException('Username is already taken');
    }

    throw error;
  }
}

/** Revokes every still-valid refresh token family of one account. */
async function revokeFamilies(
  db: NodePgDatabase,
  userId: string,
): Promise<void> {
  await db
    .update(refreshTokenFamilies)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokenFamilies.userId, userId),
        isNull(refreshTokenFamilies.revokedAt),
      ),
    );
}

function isUniqueViolation(error: unknown, depth = 0): boolean {
  if (depth > 3 || typeof error !== 'object' || error === null) {
    return false;
  }

  const { code, cause } = error as { code?: unknown; cause?: unknown };

  return code === '23505' || isUniqueViolation(cause, depth + 1);
}
