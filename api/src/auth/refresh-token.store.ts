import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import {
  AuthenticationStorage,
  type RefreshTokenRecord,
  type RefreshTokenStore,
} from '@nestjs/authentication';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  refreshTokenFamilies,
  refreshTokens,
  type RefreshTokenRow,
} from '../db/schema.js';

/** The store hands optional fields back absent, never as `null`. */
function toRecord(row: RefreshTokenRow): RefreshTokenRecord {
  return {
    id: row.id,
    familyId: row.familyId,
    userId: row.userId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    familyExpiresAt: row.familyExpiresAt,
    ...(row.usedAt && { usedAt: row.usedAt }),
    ...(row.claims && { claims: row.claims }),
  };
}

/**
 * Refresh-token storage in PostgreSQL. It registers itself with
 * `AuthenticationStorage`, which is what lets the app boot in production.
 */
@Injectable()
export class DrizzleRefreshTokenStore implements RefreshTokenStore {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({ refreshTokens: this });
  }

  async getRefreshToken(id: string): Promise<RefreshTokenRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, id))
      .limit(1);

    return row && toRecord(row);
  }

  async saveRefreshToken(record: RefreshTokenRecord): Promise<void> {
    // Expired families can no longer be refreshed, so they are safe to drop
    // here; their tokens go with them through the cascade.
    await this.db
      .delete(refreshTokenFamilies)
      .where(lt(refreshTokenFamilies.familyExpiresAt, new Date()));

    await this.db
      .insert(refreshTokenFamilies)
      .values({
        id: record.familyId,
        userId: record.userId,
        familyExpiresAt: record.familyExpiresAt,
      })
      .onConflictDoNothing();

    await this.db.insert(refreshTokens).values({
      id: record.id,
      familyId: record.familyId,
      userId: record.userId,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      familyExpiresAt: record.familyExpiresAt,
      ...(record.claims && { claims: record.claims }),
    });
  }

  /**
   * One conditional write: of several concurrent calls exactly one wins, and
   * the rest look like a reused token.
   */
  async markRefreshTokenUsed(id: string, at: Date): Promise<boolean> {
    const used = await this.db
      .update(refreshTokens)
      .set({ usedAt: at })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.usedAt)))
      .returning({ id: refreshTokens.id });

    return used.length > 0;
  }

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    await this.db
      .update(refreshTokenFamilies)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokenFamilies.id, familyId));
  }

  async isRefreshTokenFamilyRevoked(familyId: string): Promise<boolean> {
    const [family] = await this.db
      .select({ revokedAt: refreshTokenFamilies.revokedAt })
      .from(refreshTokenFamilies)
      .where(eq(refreshTokenFamilies.id, familyId))
      .limit(1);

    return Boolean(family?.revokedAt);
  }

  async revokeUserRefreshTokens(userId: string): Promise<void> {
    await this.db
      .update(refreshTokenFamilies)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokenFamilies.userId, userId),
          isNull(refreshTokenFamilies.revokedAt),
        ),
      );
  }
}
