import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username may only contain letters, numbers, and underscores',
  );

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^a-zA-Z0-9]/,
    'Password must contain at least one special character',
  );

/** The body accepted by `POST /auth/onboarding`. */
export const signUpSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

/** The body accepted by `POST /auth/sign-in`. */
export const signInSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type SignUpDto = z.infer<typeof signUpSchema>;
export type SignInDto = z.infer<typeof signInSchema>;

/** A user as it appears over JSON: dates are ISO strings, not `Date`. */
export interface AuthUser {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The token envelope returned by both auth endpoints. The user type is
 * generic because the API holds `Date`s internally while clients receive ISO
 * strings.
 */
export interface AuthResponse<TUser = AuthUser> {
  user: TUser;
  accessToken: string;
  expiresIn: number;
}
