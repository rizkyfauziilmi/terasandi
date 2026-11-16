import { Policy, type PolicyBefore } from '@nestjs/authorization';
import type { User } from '../db/schema.js';

/**
 * Who may manage accounts. Admins pass every check; everyone else fails the
 * ability, and a guest fails it too because authentication never sets a user.
 * Declaring the abilities (instead of only `before()`) is what makes
 * `@Can(UserPolicy, 'create')` type-check.
 */
@Policy()
export class UserPolicy implements PolicyBefore<User> {
  before(user: User | null) {
    if (user?.role === 'admin') {
      return true;
    }
  }

  list(_user: User | null) {
    return false;
  }

  read(_user: User | null) {
    return false;
  }

  create(_user: User | null) {
    return false;
  }

  update(_user: User | null) {
    return false;
  }

  updateRole(_user: User | null) {
    return false;
  }

  resetPassword(_user: User | null) {
    return false;
  }

  revokeSessions(_user: User | null) {
    return false;
  }

  delete(_user: User | null) {
    return false;
  }
}
