import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Pool } from 'pg';
import request from 'supertest';

// The app loads `.env` through `ConfigModule`, but this suite needs
// DATABASE_URL before the app module is evaluated. Variables already in the
// environment win, so CI can point the suite at another server.
if (existsSync('.env')) {
  loadEnvFile('.env');
}

/**
 * Runs against a database of its own: the first onboarding call must see an
 * empty users table, and running the suite must not touch development data.
 *
 * The app module is imported after the throwaway database exists, because
 * `ConfigModule.forRoot()` captures `process.env` when the module is first
 * evaluated.
 */
describe('User management (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let adminUrl: string;
  let databaseName = '';
  let previousDatabaseUrl: string | undefined;

  const password = 'User-test-1!';
  const newPassword = 'User-test-2!';

  beforeAll(async () => {
    adminUrl = process.env.DATABASE_URL ?? '';
    if (!adminUrl) {
      throw new Error(
        'DATABASE_URL is required: the user suite creates its own database',
      );
    }

    databaseName = `terasandi_users_${Date.now()}`;

    const admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    await admin.end();

    const databaseUrl = withDatabase(adminUrl, databaseName);
    const pool = new Pool({ connectionString: databaseUrl });
    await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
    await pool.end();

    previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = databaseUrl;

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

  const signIn = async (username: string, secret = password) => {
    const { body } = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ username, password: secret })
      .expect(200);

    return `Bearer ${body.accessToken}`;
  };

  const createUser = async (
    owner: string,
    username: string,
  ): Promise<{ id: string; username: string; role: string }> => {
    const { body } = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', owner)
      .send({ username, password })
      .expect(201);

    return body;
  };

  let owner = '';

  it('onboards the first account as admin', async () => {
    await request(app.getHttpServer())
      .post('/auth/onboarding')
      .send({ username: 'owner', password })
      .expect(201);

    owner = await signIn('owner');
  });

  it('lists accounts with search, role filter and pagination', async () => {
    await createUser(owner, 'alice');
    await createUser(owner, 'bob');
    await createUser(owner, 'carol');

    const { body: page } = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', owner)
      .expect(200);

    expect(page.total).toBe(4);
    expect(page.items).toHaveLength(4);
    expect(page.items[0]).not.toHaveProperty('passwordHash');

    const { body: searched } = await request(app.getHttpServer())
      .get('/users')
      .query({ q: 'ali' })
      .set('Authorization', owner)
      .expect(200);

    expect(searched.items.map((u: { username: string }) => u.username)).toEqual(
      ['alice'],
    );

    const { body: admins } = await request(app.getHttpServer())
      .get('/users')
      .query({ role: 'admin' })
      .set('Authorization', owner)
      .expect(200);

    expect(admins.total).toBe(1);
    expect(
      admins.items.every((u: { role: string }) => u.role === 'admin'),
    ).toBe(true);

    const { body: firstPage } = await request(app.getHttpServer())
      .get('/users')
      .query({ limit: 2, offset: 0 })
      .set('Authorization', owner)
      .expect(200);

    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(4);

    const { body: secondPage } = await request(app.getHttpServer())
      .get('/users')
      .query({ limit: 2, offset: 2 })
      .set('Authorization', owner)
      .expect(200);

    expect(secondPage.items).toHaveLength(2);
  });

  it('rejects an invalid list query', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .query({ limit: 0 })
      .set('Authorization', owner)
      .expect(400);

    await request(app.getHttpServer())
      .get('/users')
      .query({ role: 'superuser' })
      .set('Authorization', owner)
      .expect(400);
  });

  it('reads one account and 404s an unknown id', async () => {
    const alice = await createUser(owner, 'aliceread');

    await request(app.getHttpServer())
      .get(`/users/${alice.id}`)
      .set('Authorization', owner)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ username: 'aliceread', role: 'user' });
      });

    await request(app.getHttpServer())
      .get('/users/not-a-uuid')
      .set('Authorization', owner)
      .expect(400);

    await request(app.getHttpServer())
      .get('/users/00000000-0000-4000-8000-000000000000')
      .set('Authorization', owner)
      .expect(404);
  });

  it('keeps the endpoints away from guests and plain users', async () => {
    const member = await createUser(owner, 'member');
    const memberSession = await signIn('member');

    await request(app.getHttpServer()).get('/users').expect(401);
    await request(app.getHttpServer())
      .delete(`/users/${member.id}`)
      .expect(401);

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', memberSession)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/users/${member.id}`)
      .set('Authorization', memberSession)
      .send({ username: 'member2' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/users/${member.id}`)
      .set('Authorization', memberSession)
      .expect(403);
  });

  it('renames an account and refuses a taken username', async () => {
    const alice = await createUser(owner, 'alicerename');

    await request(app.getHttpServer())
      .patch(`/users/${alice.id}`)
      .set('Authorization', owner)
      .send({ username: 'alicerenamed' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.username).toBe('alicerenamed');
      });

    await request(app.getHttpServer())
      .patch(`/users/${alice.id}`)
      .set('Authorization', owner)
      .send({ username: 'owner' })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/users/${alice.id}`)
      .set('Authorization', owner)
      .send({ username: 'ab' })
      .expect(400);
  });

  it('resets a password and signs the account out everywhere', async () => {
    const dave = await createUser(owner, 'dave');

    const { body: session } = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ username: 'dave', password })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/users/${dave.id}/password`)
      .set('Authorization', owner)
      .send({ password: newPassword })
      .expect(204);

    // The old password no longer works, the new one does.
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ username: 'dave', password })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ username: 'dave', password: newPassword })
      .expect(200);

    // The refresh token issued before the reset is revoked.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });

  it('revokes an account sessions without touching the password', async () => {
    const erin = await createUser(owner, 'erin');

    const { body: session } = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ username: 'erin', password })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/users/${erin.id}/sessions/revoke`)
      .set('Authorization', owner)
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);

    // The password still works.
    await signIn('erin');
  });

  it('deletes an account and refuses to delete your own', async () => {
    const frank = await createUser(owner, 'frank');
    const { body: ownerUser } = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', owner)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/users/${ownerUser.id}`)
      .set('Authorization', owner)
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/users/${frank.id}`)
      .set('Authorization', owner)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/users/${frank.id}`)
      .set('Authorization', owner)
      .expect(404);

    // A deleted account can no longer sign in.
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ username: 'frank', password })
      .expect(401);
  });

  it('deletes another admin while one remains', async () => {
    const grace = await createUser(owner, 'grace');

    await request(app.getHttpServer())
      .patch(`/users/${grace.id}/role`)
      .set('Authorization', owner)
      .send({ role: 'admin' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/users/${grace.id}`)
      .set('Authorization', owner)
      .expect(204);
  });
});

/** `postgres://…/terasandi` → `postgres://…/<name>`. */
function withDatabase(connectionString: string, name: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${name}`;
  return url.toString();
}
