import type { AuthResponse as AuthResponseEnvelope } from '@terasandi/contracts';
import type { User } from '../db/schema.js';

/**
 * The envelope is shared with the web app; the API's user keeps its `Date`
 * fields, which Nest serializes to the ISO strings the client type expects.
 */
export type AuthResponse = AuthResponseEnvelope<User>;

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: User;
    refreshTokens: false;
  }
}
