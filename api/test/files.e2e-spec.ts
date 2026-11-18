import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type {
  DownloadUrl,
  FileUploadTicket,
  FilesResponse,
  StoredFile,
} from '@terasandi/contracts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Pool } from 'pg';
import request from 'supertest';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

/**
 * Full upload → list → rename → download → delete flow against throwaway
 * Postgres and the configured private S3-compatible bucket. The second account
 * and the admin both prove they cannot reach the first account's file.
 */
describe('Files (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let adminUrl: string;
  let databaseName = '';
  let previousDatabaseUrl: string | undefined;
  let previousMaxSize: string | undefined;

  const password = 'Files-test-1!';
  // A tiny limit keeps an oversize upload cheap and exercises the config.
  const maxSize = 1024;
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13,
  ]);

  beforeAll(async () => {
    adminUrl = process.env.DATABASE_URL ?? '';
    if (!adminUrl) {
      throw new Error(
        'DATABASE_URL is required: the file suite creates a database',
      );
    }
    if (!process.env.STORAGE_ENDPOINT) {
      throw new Error('STORAGE_ENDPOINT is required for the file suite');
    }

    databaseName = `terasandi_files_${Date.now()}`;
    const admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    await admin.end();

    const pool = new Pool({
      connectionString: withDatabase(adminUrl, databaseName),
    });
    await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
    await pool.end();

    previousDatabaseUrl = process.env.DATABASE_URL;
    previousMaxSize = process.env.MAX_FILE_SIZE_BYTES;
    process.env.DATABASE_URL = withDatabase(adminUrl, databaseName);
    process.env.MAX_FILE_SIZE_BYTES = String(maxSize);

    const { AppModule } = await import('../src/app.module.js');
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();

    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    if (previousMaxSize === undefined) {
      delete process.env.MAX_FILE_SIZE_BYTES;
    } else {
      process.env.MAX_FILE_SIZE_BYTES = previousMaxSize;
    }

    if (!databaseName) {
      return;
    }

    const admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [databaseName],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await admin.end();
  });

  const signIn = async (username: string): Promise<string> => {
    const { body } = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ username, password })
      .expect(200);
    return `Bearer ${body.accessToken}`;
  };

  const createUser = async (
    admin: string,
    username: string,
  ): Promise<string> => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', admin)
      .send({ username, password })
      .expect(201);
    return signIn(username);
  };

  /** Runs the browser half of a direct upload, then asks the API to record it. */
  const upload = async (
    session: string,
    name: string,
    bytes: Buffer,
  ): Promise<StoredFile> => {
    const { body: ticket } = await request(app.getHttpServer())
      .post('/files/uploads')
      .set('Authorization', session)
      .send({ name, size: bytes.length })
      .expect(201);

    const signed = ticket as FileUploadTicket;
    const headers = new Headers(signed.headers);
    // Browsers set Content-Length themselves; it is still part of the signature.
    headers.delete('content-length');

    const put = await fetch(signed.url, {
      method: 'PUT',
      headers,
      body: bytes,
    });
    expect(put.status).toBe(200);

    const { body } = await request(app.getHttpServer())
      .post('/files')
      .set('Authorization', session)
      .send({ uploadId: signed.uploadId, name })
      .expect(201);

    return body as StoredFile;
  };

  let admin = '';
  let alice = '';
  let bob = '';
  let file: StoredFile;

  it('sets up three signed-in accounts', async () => {
    await request(app.getHttpServer())
      .post('/auth/onboarding')
      .send({ username: 'owner', password })
      .expect(201);

    admin = await signIn('owner');
    alice = await createUser(admin, 'alicefiles');
    bob = await createUser(admin, 'bobfiles');
  });

  it('uploads bytes directly to storage and detects their type', async () => {
    file = await upload(alice, 'picture.png', png);

    expect(file).toMatchObject({
      name: 'picture.png',
      size: png.length,
      mimeType: 'image/png',
      category: 'image',
    });
    expect(file).not.toHaveProperty('storageKey');
    expect(file).not.toHaveProperty('etag');
    expect(file.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('lists only the signed-in user files with category totals', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/files')
      .set('Authorization', alice)
      .expect(200);

    const listed = body as FilesResponse;
    expect(listed.files.map((item) => item.id)).toEqual([file.id]);
    expect(listed.totals).toEqual({
      document: 0,
      image: 1,
      audio: 0,
      video: 0,
      other: 0,
    });
    expect(listed.totalSize).toBe(png.length);
    expect(listed.maxFileSize).toBe(maxSize);

    const { body: bobList } = await request(app.getHttpServer())
      .get('/files')
      .set('Authorization', bob)
      .expect(200);
    expect((bobList as FilesResponse).files).toEqual([]);
  });

  it('rejects oversized uploads and accepts previously unsupported formats', async () => {
    await request(app.getHttpServer())
      .post('/files/uploads')
      .set('Authorization', alice)
      .send({ name: 'large.png', size: maxSize + 1 })
      .expect(400);

    const page = await upload(
      alice,
      'page.html',
      Buffer.from('<script>alert(1)</script>'),
    );
    expect(page).toMatchObject({
      mimeType: 'text/html; charset=utf-8',
      category: 'document',
    });

    const archive = await upload(
      alice,
      'archive.zip',
      Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.alloc(20),
        Buffer.from('[Content_Types].xml', 'ascii'),
      ]),
    );
    expect(archive).toMatchObject({
      mimeType: 'application/zip',
      category: 'other',
    });

    const { body } = await request(app.getHttpServer())
      .get('/files')
      .set('Authorization', alice)
      .expect(200);
    expect((body as FilesResponse).totals).toEqual({
      document: 1,
      image: 1,
      audio: 0,
      video: 0,
      other: 1,
    });

    await request(app.getHttpServer())
      .delete(`/files/${page.id}`)
      .set('Authorization', alice)
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/files/${archive.id}`)
      .set('Authorization', alice)
      .expect(204);
  });

  it('refuses to rename, download, or delete another user file, even as admin', async () => {
    const stranger = { id: file.id };

    await request(app.getHttpServer())
      .patch(`/files/${stranger.id}`)
      .set('Authorization', bob)
      .send({ name: 'stolen.png' })
      .expect(404);
    await request(app.getHttpServer())
      .get(`/files/${stranger.id}/download`)
      .set('Authorization', bob)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/files/${stranger.id}/preview`)
      .set('Authorization', bob)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/files/${stranger.id}`)
      .set('Authorization', bob)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/files/${stranger.id}/download`)
      .set('Authorization', admin)
      .expect(404);
  });

  it('renames, downloads, and deletes the owner file', async () => {
    const { body: renamed } = await request(app.getHttpServer())
      .patch(`/files/${file.id}`)
      .set('Authorization', alice)
      .send({ name: 'renamed.png' })
      .expect(200);
    expect((renamed as StoredFile).name).toBe('renamed.png');

    const { body } = await request(app.getHttpServer())
      .get(`/files/${file.id}/download`)
      .set('Authorization', alice)
      .expect(200);
    const link = body as DownloadUrl;
    const downloaded = await fetch(link.url);
    expect(downloaded.status).toBe(200);
    expect(Buffer.from(await downloaded.arrayBuffer())).toEqual(png);

    await request(app.getHttpServer())
      .delete(`/files/${file.id}`)
      .set('Authorization', alice)
      .expect(204);

    const { body: after } = await request(app.getHttpServer())
      .get('/files')
      .set('Authorization', alice)
      .expect(200);
    expect((after as FilesResponse).files).toEqual([]);
    await request(app.getHttpServer())
      .get(`/files/${file.id}/download`)
      .set('Authorization', alice)
      .expect(404);
  });

  it('streams a ZIP of selected own files and bulk-deletes only own files', async () => {
    const alpha = await upload(alice, 'alpha.png', png);
    const beta = await upload(alice, 'beta.png', png);
    const stranger = await upload(bob, 'stranger.png', png);

    await request(app.getHttpServer())
      .post('/files/archive')
      .set('Authorization', alice)
      .send({ ids: [] })
      .expect(400);

    const archive = await request(app.getHttpServer())
      .post('/files/archive')
      .set('Authorization', alice)
      .send({ ids: [beta.id, alpha.id, stranger.id] })
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(archive.headers['content-type']).toContain('application/zip');
    const bytes = archive.body as Buffer;
    expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(bytes.includes(Buffer.from('alpha.png'))).toBe(true);
    expect(bytes.includes(Buffer.from('beta.png'))).toBe(true);
    expect(bytes.includes(Buffer.from('stranger.png'))).toBe(false);

    const preview = await request(app.getHttpServer())
      .get(`/files/${alpha.id}/preview`)
      .set('Authorization', alice)
      .expect(200);
    expect(preview.headers['content-type']).toContain('image/png');
    expect(preview.headers['content-disposition']).toBe('inline');

    await request(app.getHttpServer())
      .delete('/files')
      .set('Authorization', alice)
      .send({ ids: [alpha.id, beta.id, stranger.id] })
      .expect(204);

    const { body: aliceList } = await request(app.getHttpServer())
      .get('/files')
      .set('Authorization', alice)
      .expect(200);
    expect((aliceList as FilesResponse).files).toEqual([]);

    const { body: bobList } = await request(app.getHttpServer())
      .get('/files')
      .set('Authorization', bob)
      .expect(200);
    expect((bobList as FilesResponse).files.map((item) => item.id)).toEqual([
      stranger.id,
    ]);

    await request(app.getHttpServer())
      .delete(`/files/${stranger.id}`)
      .set('Authorization', bob)
      .expect(204);
  });

  it('keeps every file route away from guests', async () => {
    await request(app.getHttpServer()).get('/files').expect(401);
    await request(app.getHttpServer())
      .post('/files/uploads')
      .send({ name: 'x.png', size: 1 })
      .expect(401);
    await request(app.getHttpServer())
      .post('/files')
      .send({ uploadId: '00000000-0000-4000-8000-000000000000', name: 'x.png' })
      .expect(401);
    await request(app.getHttpServer())
      .patch(`/files/${file.id}`)
      .send({ name: 'x.png' })
      .expect(401);
    await request(app.getHttpServer()).delete(`/files/${file.id}`).expect(401);
  });
});

/** `postgres://…/terasandi` → `postgres://…/<name>`. */
function withDatabase(connectionString: string, name: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${name}`;
  return url.toString();
}
