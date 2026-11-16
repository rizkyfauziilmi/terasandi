import { ROLES } from '@terasandi/contracts';
import { getTableColumns } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const at = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date' });

/** The closed set of roles, shared with the contracts and the API. */
export const userRole = pgEnum('user_role', [...ROLES]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('user'),
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

const { passwordHash, ...rest } = getTableColumns(users);
/** The columns safe to select and return from a route. */
export const publicUserColumns = rest;

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
