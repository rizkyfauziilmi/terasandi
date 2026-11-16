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
describe('Roles and RBAC (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let adminUrl: string;
  let databaseName = '';
  let previousDatabaseUrl: string | undefined;

  const password = 'Role-test-1!';

  beforeAll(async () => {
    adminUrl = process.env.DATABASE_URL ?? '';
    if (!adminUrl) {
      throw new Error(
        'DATABASE_URL is required: the RBAC suite creates its own database',
      );
    }

    databaseName = `terasandi_rbac_${Date.now()}`;

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

  const signIn = async (username: string) => {
    const { body } = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ username, password })
      .expect(200);

    return `Bearer ${body.accessToken}`;
  };

  it('makes the first onboarded user an admin', async () => {
    await request(app.getHttpServer()).get('/auth/onboarding').expect(200);

    const { body } = await request(app.getHttpServer())
      .post('/auth/onboarding')
      .send({ username: 'owner', password })
      .expect(201);

    expect(body.user).toMatchObject({ username: 'owner', role: 'admin' });

    await request(app.getHttpServer())
      .post('/auth/onboarding')
      .send({ username: 'second', password })
      .expect(409);
  });

  it('keeps account management away from guests and plain users', async () => {
    const owner = await signIn('owner');

    const { body: member } = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', owner)
      .send({ username: 'member', password })
      .expect(201);

    expect(member).toMatchObject({ username: 'member', role: 'user' });
    expect(member).not.toHaveProperty('passwordHash');

    const memberSession = await signIn('member');

    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', memberSession)
      .send({ username: 'sneaky', password })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/users/${member.id}/role`)
      .set('Authorization', memberSession)
      .send({ role: 'admin' })
      .expect(403);

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', memberSession)
      .expect(200)
      .expect(({ body }) => {
        expect(body.role).toBe('user');
      });
  });

  it('returns the shape errors an admin route can produce', async () => {
    const owner = await signIn('owner');

    await request(app.getHttpServer())
      .post('/users')
      .send({ username: 'guest', password })
      .expect(401);

    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', owner)
      .send({ username: 'owner', password })
      .expect(409);

    await request(app.getHttpServer())
      .patch('/users/not-a-uuid/role')
      .set('Authorization', owner)
      .send({ role: 'admin' })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/users/00000000-0000-4000-8000-000000000000/role')
      .set('Authorization', owner)
      .send({ role: 'admin' })
      .expect(404);

    await request(app.getHttpServer())
      .patch('/users/00000000-0000-4000-8000-000000000000/role')
      .set('Authorization', owner)
      .send({ role: 'superuser' })
      .expect(400);
  });

  it('promotes a user and refuses to demote the last admin', async () => {
    const owner = await signIn('owner');
    const { body: ownerUser } = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', owner)
      .expect(200);
    const { body: member } = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', await signIn('member'))
      .expect(200);

    // Two admins now exist, so the owner may step down.
    await request(app.getHttpServer())
      .patch(`/users/${member.id}/role`)
      .set('Authorization', owner)
      .send({ role: 'admin' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.role).toBe('admin');
      });

    await request(app.getHttpServer())
      .patch(`/users/${ownerUser.id}/role`)
      .set('Authorization', owner)
      .send({ role: 'user' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.role).toBe('user');
      });

    // The promoted account is the only admin left.
    const remainingAdmin = await signIn('member');

    await request(app.getHttpServer())
      .patch(`/users/${member.id}/role`)
      .set('Authorization', remainingAdmin)
      .send({ role: 'user' })
      .expect(409);
  });
});

/** `postgres://…/terasandi` → `postgres://…/<name>`. */
function withDatabase(connectionString: string, name: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${name}`;
  return url.toString();
}
