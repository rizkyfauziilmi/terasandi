import type { User } from '../db/schema.js';

export interface AuthResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
}

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: User;
    refreshTokens: false;
  }
}
