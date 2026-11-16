import { z } from "zod";
import { COMMON_PASSWORDS } from "./common-passwords.js";
import type { Role } from "./user.js";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username may only contain letters, numbers, and underscores",
  );

/**
 * Length is the only composition rule, following NIST SP 800-63B-4 and OWASP
 * ASVS 5.0 V6.2.5: no required letters, digits, or symbols. Requiring those
 * makes users pick predictable values (`Password1!`); length is what raises the
 * cost of guessing.
 *
 * The control that replaces composition rules is the blocklist: a password that
 * is already common or breached is the attack that matters, so it is refused
 * outright. The whole password is compared, case-insensitively.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), {
    message: "That password is too common. Please choose another.",
  });

/** The body accepted by `POST /auth/onboarding`. */
export const signUpSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

/** The body accepted by `POST /auth/sign-in`. */
export const signInSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/** The body accepted by `POST /auth/refresh` and `POST /auth/sign-out`. */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type SignUpDto = z.infer<typeof signUpSchema>;
export type SignInDto = z.infer<typeof signInSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

/** How long one refresh token lives, and how long the web cookie stores it. */
export const REFRESH_TOKEN_TTL_DAYS = 30;
export const REFRESH_TOKEN_TTL = `${REFRESH_TOKEN_TTL_DAYS}d` as const;
export const REFRESH_TOKEN_MAX_AGE = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

/** A signed-in client's tokens, as returned by sign-in and refresh. */
export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

/** A user as it appears over JSON: dates are ISO strings, not `Date`. */
export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

/**
 * The envelope returned by both sign-in endpoints. The user type is generic
 * because the API holds `Date`s internally while clients receive ISO strings.
 */
export interface AuthResponse<TUser = AuthUser> extends AuthTokens {
  user: TUser;
}
