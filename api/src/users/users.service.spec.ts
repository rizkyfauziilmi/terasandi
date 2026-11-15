import { getDrizzleToken } from '@nestjs/drizzle';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { publicUserColumns, users } from '../db/schema.js';
import type { User, UserRow } from '../db/schema.js';
import { UsersService } from './users.service.js';

const user: User = {
  id: 'a40890cc-d300-412b-9e3e-b760003170eb',
  username: 'rizky',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const userRow: UserRow = { ...user, passwordHash: 'stored-hash' };

/**
 * A stand-in for the Drizzle query builder: each terminal step resolves to
 * `rows` and every step is a spy the test can assert on.
 */
function createQuery(rows: unknown[]) {
  const result = Promise.resolve(rows);
  const where = vi.fn(() => result);
  const limit = vi.fn(() => result);
  const returning = vi.fn(() => result);

  return {
    select: { from: vi.fn(() => ({ where, limit })) },
    insert: { values: vi.fn(() => ({ returning })) },
    update: { set: vi.fn(() => ({ where })) },
    where,
    limit,
    returning,
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let db: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    db = { select: vi.fn(), insert: vi.fn(), update: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: getDrizzleToken(), useValue: db }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findById', () => {
    it('returns the matching user and selects only public columns', async () => {
      const query = createQuery([user]);
      db.select.mockReturnValue(query.select);

      await expect(service.findById(user.id)).resolves.toBe(user);

      expect(db.select).toHaveBeenCalledWith(publicUserColumns);
      expect(db.select).toHaveBeenCalledTimes(1);
      expect(query.select.from).toHaveBeenCalledWith(users);
      expect(query.where).toHaveBeenCalledTimes(1);
    });

    it('returns undefined when no user matches', async () => {
      db.select.mockReturnValue(createQuery([]).select);

      await expect(service.findById('missing')).resolves.toBeUndefined();
    });
  });

  describe('findByUsername', () => {
    it('returns the matching user and selects only public columns', async () => {
      const query = createQuery([user]);
      db.select.mockReturnValue(query.select);

      await expect(service.findByUsername('rizky')).resolves.toBe(user);

      expect(db.select).toHaveBeenCalledWith(publicUserColumns);
      expect(query.select.from).toHaveBeenCalledWith(users);
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
        passwordHash: 'stored-hash',
      });

      // Unlike the other lookups, this one needs the hash.
      expect(db.select).toHaveBeenCalledWith();
      expect(query.select.from).toHaveBeenCalledWith(users);
    });

    it('returns undefined when the username is unknown', async () => {
      db.select.mockReturnValue(createQuery([]).select);

      await expect(service.findCredentials('unknown')).resolves.toBeUndefined();
    });
  });

  describe('create', () => {
    it('inserts the user and returns only public columns', async () => {
      const query = createQuery([user]);
      db.insert.mockReturnValue(query.insert);

      await expect(
        service.create({ username: 'rizky', passwordHash: 'hashed' }),
      ).resolves.toBe(user);

      expect(db.insert).toHaveBeenCalledWith(users);
      expect(query.insert.values).toHaveBeenCalledWith({
        username: 'rizky',
        passwordHash: 'hashed',
      });
      expect(query.returning).toHaveBeenCalledWith(publicUserColumns);
    });
  });

  describe('hasAnyUser', () => {
    it('is true when at least one user exists', async () => {
      const query = createQuery([userRow]);
      db.select.mockReturnValue(query.select);

      await expect(service.hasAnyUser()).resolves.toBe(true);

      expect(db.select).toHaveBeenCalledWith();
      expect(query.select.from).toHaveBeenCalledWith(users);
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
      expect(query.update.set).toHaveBeenCalledWith({
        passwordHash: 'new-hash',
      });
      expect(query.where).toHaveBeenCalledTimes(1);
    });
  });
});
