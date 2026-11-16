import { ROLES } from '@terasandi/contracts';
import { publicUserColumns, userRole, users } from './schema.js';

describe('users schema', () => {
  it('stores exactly the roles the contracts allow', () => {
    expect(userRole.enumValues).toEqual([...ROLES]);
  });

  it('includes the role in the columns safe to return', () => {
    expect(publicUserColumns.role).toBe(users.role);
  });
});
