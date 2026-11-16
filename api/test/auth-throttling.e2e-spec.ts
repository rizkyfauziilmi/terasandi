import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

/**
 * Rate limits are read from the validated environment, so this suite uses
 * whatever `AUTH_RATE_LIMIT` / `AUTH_IP_RATE_LIMIT` the app boots with.
 * Bodies are left invalid on purpose: the guard runs before validation, so
 * each request still counts without reaching the database.
 */
describe('Auth rate limiting (e2e)', () => {
  let app: INestApplication;
  let credentialsLimit: number;
  let addressLimit: number;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const config = app.get<ConfigService>(ConfigService);
    credentialsLimit = config.getOrThrow('AUTH_RATE_LIMIT', { infer: true });
    addressLimit = config.getOrThrow('AUTH_IP_RATE_LIMIT', { infer: true });
  });

  afterEach(async () => {
    await app.close();
  });

  it('refuses repeated sign-in attempts from one address', async () => {
    const attempt = () =>
      request(app.getHttpServer()).post('/auth/sign-in').send({});

    for (let i = 0; i < credentialsLimit; i++) {
      await attempt().expect(400);
    }

    await attempt().expect(429);
  });

  it('refuses a spray of usernames from one address', async () => {
    const attempt = (index: number) =>
      request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({ username: `user${index}` });

    for (let i = 0; i < addressLimit; i++) {
      await attempt(i).expect(400);
    }

    await attempt(addressLimit).expect(429);
  });
});
