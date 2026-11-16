import { z } from "zod";
import { passwordSchema, usernameSchema } from "./auth.js";
import type { AuthUser } from "./auth.js";

/** Every role the API knows. The database uses the same closed set. */
export const ROLES = ["admin", "user"] as const;

export type Role = (typeof ROLES)[number];

export const roleSchema = z.enum(ROLES);

/** The body accepted by `POST /users`. New users start as `user`. */
export const createUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

/** The body accepted by `PATCH /users/:id/role`. */
export const updateUserRoleSchema = z.object({
  role: roleSchema,
});

/** The body accepted by `PATCH /users/:id`. */
export const updateUsernameSchema = z.object({
  username: usernameSchema,
});

/** The body accepted by `PATCH /users/:id/password`. */
export const setUserPasswordSchema = z.object({
  password: passwordSchema,
});

/** Query params arrive as strings, and an empty one means "no filter". */
const emptyToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

/** The query accepted by `GET /users`. */
export const listUsersQuerySchema = z.object({
  q: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(32).optional(),
  ),
  role: z.preprocess(emptyToUndefined, roleSchema.optional()),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserRoleDto = z.infer<typeof updateUserRoleSchema>;
export type UpdateUsernameDto = z.infer<typeof updateUsernameSchema>;
export type SetUserPasswordDto = z.infer<typeof setUserPasswordSchema>;
export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;

/**
 * A page of accounts, as `GET /users` returns it. The user type is generic
 * because the API holds `Date`s internally while clients receive ISO strings.
 */
export interface UserPage<TUser = AuthUser> {
  items: TUser[];
  total: number;
  limit: number;
  offset: number;
}
