import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import {
  testAdmin,
  testUser as user,
  testUserRow as userRow,
} from '../../test/fixtures/auth.fixture.js';
import { publicUserColumns, users } from '../db/schema.js';
import { UsersService } from './users.service.js';

/**
 * A stand-in for the Drizzle query builder: every terminal step resolves to
 * `rows`, and every step is a spy the test can assert on. Every builder method
 * hands the result back, so one builder serves a select, an insert, an update
 * and a delete, and any chain order the service uses.
 */
function createQuery(rows: unknown[]) {
  const result = Promise.resolve(rows) as Promise<unknown[]> & {
    limit: ReturnType<typeof vi.fn>;
    offset: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    returning: ReturnType<typeof vi.fn>;
  };
  const limit = vi.fn(() => result);
  const offset = vi.fn(() => result);
  const orderBy = vi.fn(() => Object.assign(result, { limit, offset }));
  const returning = vi.fn(() => result);
  const where = vi.fn(() =>
    Object.assign(result, { orderBy, limit, offset, returning }),
  );
  const from = vi.fn(() =>
    Object.assign(result, { where, orderBy, limit, offset }),
  );
  const values = vi.fn(() => Object.assign(result, { returning }));
  const set = vi.fn(() => Object.assign(result, { where, returning }));

  result.limit = limit;
  result.offset = offset;
  result.orderBy = orderBy;
  result.where = where;
  result.returning = returning;

  return {
    select: { from },
    insert: { values },
    update: { set },
    delete: { where },
    from,
    values,
    set,
    where,
    orderBy,
    offset,
    limit,
    returning,
  };
}

function createDb() {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
    execute: vi.fn(() => Promise.resolve()),
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let db: ReturnType<typeof createDb>;
  let tx: ReturnType<typeof createDb>;
  let passwordHasher: { hash: ReturnType<typeof vi.fn> };
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    db = createDb();
    tx = createDb();
    db.transaction.mockImplementation(async (callback) => callback(tx));
    passwordHasher = { hash: vi.fn() };
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getDrizzleToken(), useValue: db },
        { provide: PasswordHasher, useValue: passwordHasher },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('returns the matching user, role included', async () => {
      const query = createQuery([user]);
      db.select.mockReturnValue(query.select);

      await expect(service.findById(user.id)).resolves.toBe(user);

      expect(db.select).toHaveBeenCalledWith(publicUserColumns);
      expect(query.from).toHaveBeenCalledWith(users);
      expect(query.where).toHaveBeenCalledTimes(1);
    });

    it('returns undefined when no user matches', async () => {
      db.select.mockReturnValue(createQuery([]).select);

      await expect(service.findById('missing')).resolves.toBeUndefined();
    });
  });

  describe('findOrFail', () => {
    it('returns the matching user', async () => {
      db.select.mockReturnValue(createQuery([user]).select);

      await expect(service.findOrFail(user.id)).resolves.toBe(user);
    });

    it('throws when no user matches', async () => {
      db.select.mockReturnValue(createQuery([]).select);

      await expect(service.findOrFail('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByUsername', () => {
    it('returns the matching user', async () => {
      const query = createQuery([user]);
      db.select.mockReturnValue(query.select);

      await expect(service.findByUsername('rizky')).resolves.toBe(user);

      expect(db.select).toHaveBeenCalledWith(publicUserColumns);
      expect(query.from).toHaveBeenCalledWith(users);
    });

    it('returns undefined when the username is unknown', async () => {
      db.select.mockReturnValue(createQuery([]).select);

      await expect(service.findByUsername('unknown')).resolves.toBeUndefined();
    });
  });

  describe('findCredentials', () => {
    it('splits the hash off the row', async () => {
      const query = createQuery([userRow]);
      db.select.mockReturnValue(query.select);

      await expect(service.findCredentials('rizky')).resolves.toEqual({
        user,
        passwordHash: userRow.passwordHash,
      });

      // Unlike the other lookups, this one needs the hash.
      expect(db.select).toHaveBeenCalledWith();
      expect(query.from).toHaveBeenCalledWith(users);
    });

    it('returns undefined when the username is unknown', async () => {
      db.select.mockReturnValue(createQuery([]).select);

      await expect(service.findCredentials('unknown')).resolves.toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns a page of accounts with the matching total', async () => {
      const listQuery = createQuery([user]);
      const countQuery = createQuery([{ value: 1 }]);
      db.select
        .mockReturnValueOnce(listQuery.select)
        .mockReturnValueOnce(countQuery.select);

      await expect(service.list({ limit: 20, offset: 0 })).resolves.toEqual({
        items: [user],
        total: 1,
        limit: 20,
        offset: 0,
      });

      expect(listQuery.orderBy).toHaveBeenCalledTimes(1);
      expect(listQuery.limit).toHaveBeenCalledWith(20);
      expect(listQuery.offset).toHaveBeenCalledWith(0);
      // No filters: the where clause is left open.
      expect(listQuery.where).toHaveBeenCalledWith(undefined);
    });

    it('filters by username and role', async () => {
      const listQuery = createQuery([user]);
      const countQuery = createQuery([{ value: 1 }]);
      db.select
        .mockReturnValueOnce(listQuery.select)
        .mockReturnValueOnce(countQuery.select);

      await service.list({ q: 'riz', role: 'user', limit: 10, offset: 5 });

      expect(listQuery.where).toHaveBeenCalledWith(expect.anything());
      expect(countQuery.where).toHaveBeenCalledWith(expect.anything());
    });

    it('falls back to a total of zero when the count returns nothing', async () => {
      db.select
        .mockReturnValueOnce(createQuery([]).select)
        .mockReturnValueOnce(createQuery([]).select);

      await expect(service.list({ limit: 20, offset: 0 })).resolves.toEqual({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('createFirstAdmin', () => {
    const input = { username: 'rizky', password: 'correct horse' };

    it('creates the first account as admin inside the onboarding lock', async () => {
      passwordHasher.hash.mockResolvedValue('hashed-password');
      tx.select.mockReturnValue(createQuery([]).select);
      const query = createQuery([testAdmin]);
      tx.insert.mockReturnValue(query.insert);

      await expect(service.createFirstAdmin(input)).resolves.toBe(testAdmin);

      expect(tx.execute).toHaveBeenCalledTimes(1);
      expect(passwordHasher.hash).toHaveBeenCalledWith(input.password);
      expect(query.values).toHaveBeenCalledWith({
        username: input.username,
        passwordHash: 'hashed-password',
        role: 'admin',
      });
      expect(query.returning).toHaveBeenCalledWith(publicUserColumns);
    });

    it('returns undefined when setup already ran', async () => {
      passwordHasher.hash.mockResolvedValue('hashed-password');
      tx.select.mockReturnValue(createQuery([{ id: user.id }]).select);

      await expect(service.createFirstAdmin(input)).resolves.toBeUndefined();

      expect(tx.insert).not.toHaveBeenCalled();
    });
  });

  describe('createWithPassword', () => {
    const input = { username: 'new-user', password: 'correct horse' };

    it('hashes the password and creates a plain user', async () => {
      passwordHasher.hash.mockResolvedValue('hashed-password');
      db.select.mockReturnValue(createQuery([]).select);
      const query = createQuery([user]);
      db.insert.mockReturnValue(query.insert);

      await expect(
        service.createWithPassword(input, testAdmin.id),
      ).resolves.toBe(user);

      expect(db.select).toHaveBeenCalledWith(publicUserColumns);
      expect(query.values).toHaveBeenCalledWith({
        username: input.username,
        passwordHash: 'hashed-password',
        role: 'user',
      });
      expect(logSpy).toHaveBeenCalledWith('User created', {
        actorId: testAdmin.id,
        userId: user.id,
        role: 'user',
      });
      expect(JSON.stringify(logSpy.mock.calls)).not.toContain(input.password);
    });

    it('rejects a username that is already taken', async () => {
      db.select.mockReturnValue(createQuery([user]).select);

      await expect(
        service.createWithPassword(input, testAdmin.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(passwordHasher.hash).not.toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('maps a unique violation raised during the insert to a conflict', async () => {
      passwordHasher.hash.mockResolvedValue('hashed-password');
      db.select.mockReturnValue(createQuery([]).select);
      db.insert.mockReturnValue({
        values: () => ({
          returning: () => Promise.reject({ cause: { code: '23505' } }),
        }),
      });

      await expect(
        service.createWithPassword(input, testAdmin.id),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('does not walk an arbitrarily deep cause chain', async () => {
      passwordHasher.hash.mockResolvedValue('hashed-password');
      db.select.mockReturnValue(createQuery([]).select);
      db.insert.mockReturnValue({
        values: () => ({
          returning: () =>
            Promise.reject({
              cause: { cause: { cause: { cause: { code: '23505' } } } },
            }),
        }),
      });

      await expect(
        service.createWithPassword(input, testAdmin.id),
      ).rejects.not.toBeInstanceOf(ConflictException);
    });

    it('rethrows an unrelated insert error unchanged', async () => {
      const error = new Error('connection lost');
      passwordHasher.hash.mockResolvedValue('hashed-password');
      db.select.mockReturnValue(createQuery([]).select);
      db.insert.mockReturnValue({
        values: () => ({ returning: () => Promise.reject(error) }),
      });

      await expect(
        service.createWithPassword(input, testAdmin.id),
      ).rejects.toBe(error);
    });
  });

  describe('updateUsername', () => {
    it('renames the account and logs the change', async () => {
      const renamed = { ...user, username: 'renamed' };
      const query = createQuery([renamed]);
      db.update.mockReturnValue(query.update);

      await expect(
        service.updateUsername(user.id, 'renamed', testAdmin.id),
      ).resolves.toBe(renamed);

      expect(db.update).toHaveBeenCalledWith(users);
      expect(query.set).toHaveBeenCalledWith({ username: 'renamed' });
      expect(logSpy).toHaveBeenCalledWith('Username changed', {
        actorId: testAdmin.id,
        userId: user.id,
      });
    });

    it('maps a unique violation to a conflict', async () => {
      db.update.mockReturnValue({
        set: () => ({
          where: () => ({
            returning: () => Promise.reject({ code: '23505' }),
          }),
        }),
      });

      await expect(
        service.updateUsername(user.id, 'taken', testAdmin.id),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws when the account does not exist', async () => {
      db.update.mockReturnValue(createQuery([]).update);

      await expect(
        service.updateUsername('missing', 'renamed', testAdmin.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateRole', () => {
    it('promotes a user inside the role lock', async () => {
      const query = createQuery([{ ...user, role: 'admin' }]);
      tx.select.mockReturnValue(createQuery([user]).select);
      tx.update.mockReturnValue(query.update);

      await expect(
        service.updateRole(user.id, 'admin', testAdmin.id),
      ).resolves.toEqual({ ...user, role: 'admin' });

      expect(tx.execute).toHaveBeenCalledTimes(1);
      expect(query.set).toHaveBeenCalledWith({ role: 'admin' });
      expect(logSpy).toHaveBeenCalledWith('User role changed', {
        actorId: testAdmin.id,
        userId: user.id,
        from: 'user',
        to: 'admin',
      });
    });

    it('is a no-op when the role is unchanged', async () => {
      tx.select.mockReturnValue(createQuery([user]).select);

      await expect(
        service.updateRole(user.id, 'user', testAdmin.id),
      ).resolves.toBe(user);

      expect(tx.update).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalledWith(
        'User role changed',
        expect.anything(),
      );
    });

    it('refuses to demote the last admin', async () => {
      tx.select
        .mockReturnValueOnce(createQuery([testAdmin]).select)
        .mockReturnValueOnce(createQuery([{ value: 1 }]).select);

      await expect(
        service.updateRole(testAdmin.id, 'user', testAdmin.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.update).not.toHaveBeenCalled();
    });

    it('demotes an admin while another one remains', async () => {
      const demoted = { ...testAdmin, role: 'user' as const };
      const query = createQuery([demoted]);
      tx.select
        .mockReturnValueOnce(createQuery([testAdmin]).select)
        .mockReturnValueOnce(createQuery([{ value: 2 }]).select);
      tx.update.mockReturnValue(query.update);

      await expect(
        service.updateRole(testAdmin.id, 'user', testAdmin.id),
      ).resolves.toEqual(demoted);
      expect(query.set).toHaveBeenCalledWith({ role: 'user' });
    });

    it('throws when the user does not exist', async () => {
      tx.select.mockReturnValue(createQuery([]).select);

      await expect(
        service.updateRole('missing', 'admin', testAdmin.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.update).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('sets the hash and revokes every session of the account', async () => {
      passwordHasher.hash.mockResolvedValue('hashed-password');
      tx.select.mockReturnValue(createQuery([{ id: user.id }]).select);
      const userUpdate = createQuery([]);
      const familyUpdate = createQuery([]);
      tx.update
        .mockReturnValueOnce(userUpdate.update)
        .mockReturnValueOnce(familyUpdate.update);

      await service.resetPassword(user.id, 'new-password-1!', testAdmin.id);

      expect(passwordHasher.hash).toHaveBeenCalledWith('new-password-1!');
      expect(userUpdate.set).toHaveBeenCalledWith({
        passwordHash: 'hashed-password',
      });
      expect(familyUpdate.set).toHaveBeenCalledWith({
        revokedAt: expect.any(Date),
      });
      expect(logSpy).toHaveBeenCalledWith('User password reset', {
        actorId: testAdmin.id,
        userId: user.id,
      });
    });

    it('throws when the account does not exist', async () => {
      passwordHasher.hash.mockResolvedValue('hashed-password');
      tx.select.mockReturnValue(createQuery([]).select);

      await expect(
        service.resetPassword('missing', 'new-password-1!', testAdmin.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.update).not.toHaveBeenCalled();
    });
  });

  describe('revokeSessions', () => {
    it('revokes the account refresh token families', async () => {
      db.select.mockReturnValue(createQuery([user]).select);
      const query = createQuery([]);
      db.update.mockReturnValue(query.update);

      await service.revokeSessions(user.id, testAdmin.id);

      expect(query.set).toHaveBeenCalledWith({ revokedAt: expect.any(Date) });
      expect(logSpy).toHaveBeenCalledWith('User sessions revoked', {
        actorId: testAdmin.id,
        userId: user.id,
      });
    });

    it('throws when the account does not exist', async () => {
      db.select.mockReturnValue(createQuery([]).select);

      await expect(
        service.revokeSessions('missing', testAdmin.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('deletes a plain user inside the role lock', async () => {
      tx.select.mockReturnValueOnce(createQuery([user]).select);
      const query = createQuery([]);
      tx.delete.mockReturnValue(query.delete);

      await service.deleteUser(user.id, 'another-admin');

      expect(tx.execute).toHaveBeenCalledTimes(1);
      expect(query.where).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith('User deleted', {
        actorId: 'another-admin',
        userId: user.id,
        role: 'user',
      });
    });

    it('refuses to delete your own account', async () => {
      tx.select.mockReturnValueOnce(createQuery([testAdmin]).select);

      await expect(
        service.deleteUser(testAdmin.id, testAdmin.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.delete).not.toHaveBeenCalled();
    });

    it('refuses to delete the last admin', async () => {
      tx.select
        .mockReturnValueOnce(createQuery([testAdmin]).select)
        .mockReturnValueOnce(createQuery([{ value: 1 }]).select);

      await expect(
        service.deleteUser(testAdmin.id, 'another-admin'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.delete).not.toHaveBeenCalled();
    });

    it('deletes an admin while another one remains', async () => {
      tx.select
        .mockReturnValueOnce(createQuery([testAdmin]).select)
        .mockReturnValueOnce(createQuery([{ value: 2 }]).select);
      const query = createQuery([]);
      tx.delete.mockReturnValue(query.delete);

      await service.deleteUser(testAdmin.id, 'another-admin');

      expect(query.where).toHaveBeenCalledTimes(1);
    });

    it('throws when the account does not exist', async () => {
      tx.select.mockReturnValue(createQuery([]).select);

      await expect(
        service.deleteUser('missing', testAdmin.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.delete).not.toHaveBeenCalled();
    });
  });

  describe('hasAnyUser', () => {
    it('is true when at least one user exists', async () => {
      const query = createQuery([userRow]);
      db.select.mockReturnValue(query.select);

      await expect(service.hasAnyUser()).resolves.toBe(true);

      expect(db.select).toHaveBeenCalledWith();
      expect(query.from).toHaveBeenCalledWith(users);
      expect(query.limit).toHaveBeenCalledWith(1);
    });

    it('is false when the table is empty', async () => {
      db.select.mockReturnValue(createQuery([]).select);

      await expect(service.hasAnyUser()).resolves.toBe(false);
    });
  });

  describe('updatePasswordHash', () => {
    it('sets the new hash for the user', async () => {
      const query = createQuery([]);
      db.update.mockReturnValue(query.update);

      await service.updatePasswordHash(user.id, 'new-hash');

      expect(db.update).toHaveBeenCalledWith(users);
      expect(query.set).toHaveBeenCalledWith({ passwordHash: 'new-hash' });
      expect(query.where).toHaveBeenCalledTimes(1);
    });
  });
});
