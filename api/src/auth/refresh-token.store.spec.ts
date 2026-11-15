import type { RefreshTokenRecord } from '@nestjs/authentication';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { vi } from 'vitest';
import {
  refreshTokenFamilies,
  refreshTokens,
} from '../db/schema.js';
import { DrizzleRefreshTokenStore } from './refresh-token.store.js';

const now = new Date('2026-01-01T00:00:00.000Z');

const record: RefreshTokenRecord = {
  id: 'hashed-token',
  familyId: 'family-1',
  userId: 'a40890cc-d300-412b-9e3e-b760003170eb',
  createdAt: now,
  expiresAt: new Date('2026-01-31T00:00:00.000Z'),
  familyExpiresAt: new Date('2026-03-31T00:00:00.000Z'),
};

/** A select chain ending in `.limit()`. */
function selectRows(rows: unknown[]) {
  const limit = vi.fn(() => Promise.resolve(rows));
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));

  return { chain: { from }, from, where, limit };
}

/** An update chain ending in `.returning()`. */
function updateRows(returned: unknown[]) {
  const returning = vi.fn(() => Promise.resolve(returned));
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));

  return { chain: { set }, set, where, returning };
}

describe('DrizzleRefreshTokenStore', () => {
  let store: DrizzleRefreshTokenStore;
  let db: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let storage: { registerSource: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    db = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    storage = { registerSource: vi.fn() };

    store = new DrizzleRefreshTokenStore(
      db as unknown as NodePgDatabase,
      storage as never,
    );
  });

  it('registers itself as the refresh-token store', () => {
    expect(storage.registerSource).toHaveBeenCalledWith({
      refreshTokens: store,
    });
  });

  describe('getRefreshToken', () => {
    it('maps a row and omits unset optional fields', async () => {
      const { chain } = selectRows([
        { ...record, usedAt: null, claims: null },
      ]);
      db.select.mockReturnValue(chain);

      const found = await store.getRefreshToken(record.id);

      expect(found).toEqual(record);
      expect(found).not.toHaveProperty('usedAt');
      expect(found).not.toHaveProperty('claims');
    });

    it('keeps usedAt and claims when the row has them', async () => {
      const usedAt = new Date('2026-01-02T00:00:00.000Z');
      const claims = { amr: ['pwd'] };
      const { chain } = selectRows([{ ...record, usedAt, claims }]);
      db.select.mockReturnValue(chain);

      await expect(store.getRefreshToken(record.id)).resolves.toEqual({
        ...record,
        usedAt,
        claims,
      });
    });

    it('returns undefined for an unknown token', async () => {
      const { chain } = selectRows([]);
      db.select.mockReturnValue(chain);

      await expect(store.getRefreshToken('missing')).resolves.toBeUndefined();
    });
  });

  describe('saveRefreshToken', () => {
    it('drops expired families, upserts the family and inserts the token', async () => {
      const purgeWhere = vi.fn().mockResolvedValue(undefined);
      db.delete.mockReturnValue({ where: purgeWhere });

      const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
      const familyValues = vi.fn(() => ({ onConflictDoNothing }));
      const tokenValues = vi.fn().mockResolvedValue(undefined);
      db.insert
        .mockReturnValueOnce({ values: familyValues })
        .mockReturnValueOnce({ values: tokenValues });

      await store.saveRefreshToken(record);

      expect(db.delete).toHaveBeenCalledWith(refreshTokenFamilies);
      expect(purgeWhere).toHaveBeenCalledTimes(1);
      expect(db.insert).toHaveBeenNthCalledWith(1, refreshTokenFamilies);
      expect(familyValues).toHaveBeenCalledWith({
        id: record.familyId,
        userId: record.userId,
        familyExpiresAt: record.familyExpiresAt,
      });
      expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
      expect(db.insert).toHaveBeenNthCalledWith(2, refreshTokens);
      expect(tokenValues).toHaveBeenCalledWith({
        id: record.id,
        familyId: record.familyId,
        userId: record.userId,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        familyExpiresAt: record.familyExpiresAt,
      });
    });

    it('stores the family claims when the record carries them', async () => {
      db.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      const tokenValues = vi.fn().mockResolvedValue(undefined);
      db.insert
        .mockReturnValueOnce({
          values: vi.fn(() => ({
            onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
          })),
        })
        .mockReturnValueOnce({ values: tokenValues });

      await store.saveRefreshToken({ ...record, claims: { amr: ['pwd'] } });

      expect(tokenValues).toHaveBeenCalledWith(
        expect.objectContaining({ claims: { amr: ['pwd'] } }),
      );
    });
  });

  describe('markRefreshTokenUsed', () => {
    it('is true when this call set usedAt', async () => {
      const { chain, set, where, returning } = updateRows([{ id: record.id }]);
      db.update.mockReturnValue(chain);

      await expect(
        store.markRefreshTokenUsed(record.id, now),
      ).resolves.toBe(true);
      expect(db.update).toHaveBeenCalledWith(refreshTokens);
      expect(set).toHaveBeenCalledWith({ usedAt: now });
      expect(where).toHaveBeenCalledTimes(1);
      expect(returning).toHaveBeenCalledTimes(1);
    });

    it('is false when another call already spent the token', async () => {
      const { chain } = updateRows([]);
      db.update.mockReturnValue(chain);

      await expect(
        store.markRefreshTokenUsed(record.id, now),
      ).resolves.toBe(false);
    });
  });

  describe('revokeRefreshTokenFamily', () => {
    it('sets revokedAt on the family', async () => {
      const where = vi.fn().mockResolvedValue(undefined);
      const set = vi.fn(() => ({ where }));
      db.update.mockReturnValue({ set });

      await store.revokeRefreshTokenFamily(record.familyId);

      expect(db.update).toHaveBeenCalledWith(refreshTokenFamilies);
      expect(set).toHaveBeenCalledWith({
        revokedAt: expect.any(Date),
      });
      expect(where).toHaveBeenCalledTimes(1);
    });
  });

  describe('isRefreshTokenFamilyRevoked', () => {
    it('is true once the family has a revocation time', async () => {
      const { chain } = selectRows([{ revokedAt: now }]);
      db.select.mockReturnValue(chain);

      await expect(
        store.isRefreshTokenFamilyRevoked(record.familyId),
      ).resolves.toBe(true);
    });

    it('is false while the family is live', async () => {
      const { chain } = selectRows([{ revokedAt: null }]);
      db.select.mockReturnValue(chain);

      await expect(
        store.isRefreshTokenFamilyRevoked(record.familyId),
      ).resolves.toBe(false);
    });

    it('is false when the family no longer exists', async () => {
      const { chain } = selectRows([]);
      db.select.mockReturnValue(chain);

      await expect(
        store.isRefreshTokenFamilyRevoked('missing'),
      ).resolves.toBe(false);
    });
  });

  describe('revokeUserRefreshTokens', () => {
    it('revokes every live family of the user', async () => {
      const where = vi.fn().mockResolvedValue(undefined);
      const set = vi.fn(() => ({ where }));
      db.update.mockReturnValue({ set });

      await store.revokeUserRefreshTokens(record.userId);

      expect(db.update).toHaveBeenCalledWith(refreshTokenFamilies);
      expect(set).toHaveBeenCalledWith({ revokedAt: expect.any(Date) });
      expect(where).toHaveBeenCalledTimes(1);
    });
  });
});
