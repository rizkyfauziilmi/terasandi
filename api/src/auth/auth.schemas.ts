import { z } from 'zod';

const username = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username may only contain letters, numbers, and underscores',
  );

export const signUpSchema = z.object({
  username,
  password: z.string().min(12).max(128),
});

export const signInSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string(),
});

export type SignUpDto = z.infer<typeof signUpSchema>;
export type SignInDto = z.infer<typeof signInSchema>;
