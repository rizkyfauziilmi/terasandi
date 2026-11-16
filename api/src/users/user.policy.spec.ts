import {
  testAdmin,
  testUser as user,
} from '../../test/fixtures/auth.fixture.js';
import { UserPolicy } from './user.policy.js';

describe('UserPolicy', () => {
  // A policy is a plain class: no Nest needed.
  const policy = new UserPolicy();

  it('lets an admin pass every ability of the policy', () => {
    expect(policy.before(testAdmin)).toBe(true);
  });

  it('does not bypass the abilities for a plain user', () => {
    expect(policy.before(user)).toBeUndefined();
    expect(policy.list(user)).toBe(false);
    expect(policy.read(user)).toBe(false);
    expect(policy.create(user)).toBe(false);
    expect(policy.update(user)).toBe(false);
    expect(policy.updateRole(user)).toBe(false);
    expect(policy.resetPassword(user)).toBe(false);
    expect(policy.revokeSessions(user)).toBe(false);
    expect(policy.delete(user)).toBe(false);
  });

  it('does not bypass the abilities for a guest', () => {
    expect(policy.before(null)).toBeUndefined();
    expect(policy.list(null)).toBe(false);
    expect(policy.read(null)).toBe(false);
    expect(policy.create(null)).toBe(false);
    expect(policy.update(null)).toBe(false);
    expect(policy.updateRole(null)).toBe(false);
    expect(policy.resetPassword(null)).toBe(false);
    expect(policy.revokeSessions(null)).toBe(false);
    expect(policy.delete(null)).toBe(false);
  });
});
