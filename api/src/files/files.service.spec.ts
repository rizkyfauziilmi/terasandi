import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InMemoryDisk, StorageModule } from '@nestjs/storage';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { validateEnv, type Env } from '../config/env.js';
import type { User } from '../db/schema.js';
import { FilesService } from './files.service.js';

const USER_ID = 'fe0e0dbd-29d9-44ce-9e24-2cfd1082d37b';
const UPLOAD_ID = '00000000-0000-4000-8000-000000000001';
const MAX_SIZE = 1024;
const NOW = new Date('2026-01-01T00:00:00.000Z');
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13,
]);

const user: User = {
  id: USER_ID,
  username: 'alice',
  role: 'user',
  createdAt: NOW,
  updatedAt: NOW,
};

/** A select chain ending in `.returning()`, as Drizzle builds it. */
function insertChain(result: () => unknown[] | Promise<unknown[]>) {
  const returning = vi.fn(result);
  const values = vi.fn(() => ({ returning }));

  return { chain: { values }, values, returning };
}

describe('FilesService', () => {
  let disk: InMemoryDisk;
  let db: {
    insert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
  };
  let service: FilesService;

  const incomingKey = `incoming/${USER_ID}/${UPLOAD_ID}`;

  async function putIncoming(bytes: Buffer) {
    await disk.put(incomingKey, bytes, {
      contentType: 'application/octet-stream',
      contentLength: bytes.length,
    });
  }

  /** Accepts the insert and returns the public columns `serialize()` needs. */
  function acceptInsert(name = 'picture.png') {
    const { chain, values } = insertChain(() => [
      {
        id: '11111111-1111-4111-8111-111111111111',
        name,
        size: PNG.length,
        mimeType: 'image/png',
        category: 'image',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);
    db.insert.mockReturnValue(chain);

    return values;
  }

  function deleteChain(rows: { id: string; storageKey: string }[]) {
    const returning = vi.fn(() => rows);
    const where = vi.fn(() => ({ returning }));
    db.delete.mockReturnValue({ where });
    return where;
  }

  function selectChain(
    rows: { id: string; name: string; storageKey: string }[],
  ) {
    const where = vi.fn(async () => rows);
    const from = vi.fn(() => ({ where }));
    db.select.mockReturnValue({ from });
    return where;
  }

  beforeEach(async () => {
    disk = new InMemoryDisk({
      signedUrls: {
        baseUrl: 'http://localhost:3001/files',
        keys: ['test-signing-key-0123456789abcdef'],
      },
    });
    db = { insert: vi.fn(), delete: vi.fn(), select: vi.fn() };

    const config = new ConfigService(
      validateEnv({
        DATABASE_URL: 'postgres://terasandi:terasandi@localhost:5432/terasandi',
        JWT_SECRET: 'a'.repeat(32),
        STORAGE_ACCESS_KEY: 'terasandi',
        STORAGE_SECRET_KEY: 'terasandi-dev-secret',
        MAX_FILE_SIZE_BYTES: String(MAX_SIZE),
      }),
    ) as ConfigService<Env, true>;

    const moduleRef = await Test.createTestingModule({
      imports: [StorageModule.forRoot({ disks: { files: disk } })],
      providers: [
        FilesService,
        { provide: 'DrizzleDatabase', useValue: db },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(FilesService);
  });

  describe('createUploadTicket', () => {
    it('signs a PUT for the declared size without storing anything', async () => {
      const ticket = await service.createUploadTicket(user, {
        name: 'picture.png',
        size: PNG.length,
      });

      expect(ticket.method).toBe('PUT');
      expect(ticket.headers['content-type']).toBe('application/octet-stream');
      expect(new Date(ticket.expiresAt).getTime()).toBeGreaterThan(Date.now());
      expect(ticket.maxSize).toBe(MAX_SIZE);
      expect(disk.keys()).toEqual([]);
    });

    it('rejects a size above the configured limit', async () => {
      await expect(
        service.createUploadTicket(user, {
          name: 'large.png',
          size: MAX_SIZE + 1,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(disk.keys()).toEqual([]);
    });
  });

  describe('completeUpload', () => {
    it('detects the bytes, moves the object and stores the final ETag', async () => {
      await putIncoming(PNG);
      const values = acceptInsert();

      const result = await service.completeUpload(user, {
        uploadId: UPLOAD_ID,
        name: 'picture.png',
      });

      expect(result).toMatchObject({
        name: 'picture.png',
        size: PNG.length,
        mimeType: 'image/png',
        category: 'image',
      });
      expect(result).not.toHaveProperty('storageKey');
      expect(result).not.toHaveProperty('etag');

      const inserted = values.mock.calls[0][0] as {
        storageKey: string;
        etag: string;
      };
      expect(inserted.storageKey).toMatch(
        new RegExp(`^files/${USER_ID}/[0-9a-f-]{36}\\.png$`),
      );
      expect(inserted.etag).toBe((await disk.stat(inserted.storageKey)).etag);
      expect(disk.keys()).toEqual([inserted.storageKey]);
    });

    it('rejects an upload that was never made', async () => {
      await expect(
        service.completeUpload(user, {
          uploadId: UPLOAD_ID,
          name: 'picture.png',
        }),
      ).rejects.toThrow(/Upload expired/);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('deletes an empty incoming object', async () => {
      await putIncoming(Buffer.alloc(0));

      await expect(
        service.completeUpload(user, {
          uploadId: UPLOAD_ID,
          name: 'empty.png',
        }),
      ).rejects.toThrow(/empty or too large/);
      expect(disk.keys()).toEqual([]);
    });

    it('deletes an incoming object that grew past the limit', async () => {
      await putIncoming(Buffer.alloc(MAX_SIZE + 1, 1));

      await expect(
        service.completeUpload(user, {
          uploadId: UPLOAD_ID,
          name: 'large.png',
        }),
      ).rejects.toThrow(/empty or too large/);
      expect(disk.keys()).toEqual([]);
    });

    it('removes the moved object when the database insert fails', async () => {
      await putIncoming(PNG);
      const { chain } = insertChain(() => Promise.reject(new Error('db down')));
      db.insert.mockReturnValue(chain);

      await expect(
        service.completeUpload(user, {
          uploadId: UPLOAD_ID,
          name: 'picture.png',
        }),
      ).rejects.toThrow('db down');
      expect(disk.keys()).toEqual([]);
    });
  });

  describe('bulk operations', () => {
    const firstId = '20000000-0000-4000-8000-000000000001';
    const secondId = '20000000-0000-4000-8000-000000000002';

    it('deletes only owned rows and removes their objects in one call', async () => {
      const rows = [
        { id: firstId, storageKey: `files/${USER_ID}/${firstId}` },
        { id: secondId, storageKey: `files/${USER_ID}/${secondId}` },
      ];
      deleteChain(rows);
      const remove = vi
        .spyOn(disk, 'delete')
        .mockResolvedValue(undefined as never);

      const deleted = await service.deleteMany(user, [
        firstId,
        secondId,
        '30000000-0000-4000-8000-000000000000',
      ]);

      expect(deleted).toEqual([firstId, secondId]);
      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledWith(rows.map((row) => row.storageKey));
    });

    it('returns archive entries in selection order', async () => {
      selectChain([
        { id: firstId, name: 'first.png', storageKey: `files/${USER_ID}/${firstId}` },
        { id: secondId, name: 'second.png', storageKey: `files/${USER_ID}/${secondId}` },
      ]);

      await expect(
        service.archiveEntries(user, [secondId, firstId]),
      ).resolves.toEqual([
        { name: 'second.png', storageKey: `files/${USER_ID}/${secondId}` },
        { name: 'first.png', storageKey: `files/${USER_ID}/${firstId}` },
      ]);
    });
  });
});
