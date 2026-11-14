import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
