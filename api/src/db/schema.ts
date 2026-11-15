import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const at = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date' });

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: at('created_at').notNull().defaultNow(),
  updatedAt: at('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UserRow = typeof users.$inferSelect;

/** A user as it may leave the service: never includes the password hash. */
export type User = Omit<UserRow, 'passwordHash'>;

export type NewUser = typeof users.$inferInsert;

/** The columns safe to select and return from a route. */
export const publicUserColumns = {
  id: users.id,
  username: users.username,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

/**
 * One per sign-in. The family is a separate row so revoking it also applies to
 * the tokens rotation saves after the revocation.
 */
export const refreshTokenFamilies = pgTable(
  'refresh_token_families',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    revokedAt: at('revoked_at'),
    familyExpiresAt: at('family_expires_at').notNull(),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('refresh_token_families_user_id_idx').on(table.userId),
    index('refresh_token_families_family_expires_at_idx').on(
      table.familyExpiresAt,
    ),
  ],
);

/** One row per issued refresh token. The id is the token's SHA-256 hash. */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    familyId: text('family_id')
      .notNull()
      .references(() => refreshTokenFamilies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: at('created_at').notNull(),
    expiresAt: at('expires_at').notNull(),
    familyExpiresAt: at('family_expires_at').notNull(),
    usedAt: at('used_at'),
    claims: jsonb('claims').$type<Record<string, unknown>>(),
  },
  (table) => [
    index('refresh_tokens_family_id_idx').on(table.familyId),
    index('refresh_tokens_user_id_idx').on(table.userId),
    index('refresh_tokens_family_expires_at_idx').on(table.familyExpiresAt),
  ],
);

export type RefreshTokenFamilyRow = typeof refreshTokenFamilies.$inferSelect;
export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
