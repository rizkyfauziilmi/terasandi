import { User } from '../../src/db/schema.js';

/** A user as returned by the services, never with the password hash. */
export const testUser: User = {
  id: 'a40890cc-d300-412b-9e3e-b760003170eb',
  username: 'rizky',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

/** The same user as stored, for the one lookup that reads the hash. */
export const testUserRow = {
  ...testUser,
  passwordHash: 'stored-hash',
};

export const testCredentials = {
  username: testUser.username,
  password: 'correct horse battery staple',
};

export const testTokens = {
  accessToken: 'token-123',
  expiresIn: 900,
};
