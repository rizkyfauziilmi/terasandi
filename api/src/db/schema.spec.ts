import { FILE_CATEGORIES, ROLES } from '@terasandi/contracts';
import {
  fileCategory,
  publicFileColumns,
  publicUserColumns,
  userRole,
  users,
} from './schema.js';

describe('users schema', () => {
  it('stores exactly the roles the contracts allow', () => {
    expect(userRole.enumValues).toEqual([...ROLES]);
  });

  it('includes the role in the columns safe to return', () => {
    expect(publicUserColumns.role).toBe(users.role);
  });
});

describe('files schema', () => {
  it('stores exactly the categories the contracts allow', () => {
    expect(fileCategory.enumValues).toEqual([...FILE_CATEGORIES]);
  });

  it('never exposes the internal storage key', () => {
    expect(publicFileColumns).not.toHaveProperty('storageKey');
  });
});
