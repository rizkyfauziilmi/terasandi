import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import type { Env } from '../config/env.js';
import { AppLogger } from './app-logger.js';

function createLogger(env: Partial<Pick<Env, 'NODE_ENV' | 'LOG_LEVEL'>>) {
  const config = {
    get: vi.fn((key: keyof typeof env) => env[key]),
  } as unknown as ConfigService<Env, true>;

  return new AppLogger(config);
}

describe('AppLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enables debug by default in development', () => {
    const logger = createLogger({ NODE_ENV: 'development' });

    expect(logger.isLevelEnabled('debug')).toBe(true);
    expect(logger.isLevelEnabled('error')).toBe(true);
  });

  it('uses the info level and above by default in production', () => {
    const logger = createLogger({ NODE_ENV: 'production' });

    expect(logger.isLevelEnabled('debug')).toBe(false);
    expect(logger.isLevelEnabled('log')).toBe(true);
    expect(logger.isLevelEnabled('warn')).toBe(true);
  });

  it('honours an explicit LOG_LEVEL', () => {
    const logger = createLogger({ NODE_ENV: 'development', LOG_LEVEL: '>=warn' });

    expect(logger.isLevelEnabled('debug')).toBe(false);
    expect(logger.isLevelEnabled('log')).toBe(false);
    expect(logger.isLevelEnabled('warn')).toBe(true);
    expect(logger.isLevelEnabled('error')).toBe(true);
  });

  it('fails at construction for an invalid threshold', () => {
    expect(() =>
      createLogger({ NODE_ENV: 'development', LOG_LEVEL: '>=nope' }),
    ).toThrow(/unknown log level/);
  });

  it('writes one JSON record per line in production', () => {
    const write = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const logger = createLogger({ NODE_ENV: 'production' });

    logger.log('User onboarded', { userId: 'user-1' });

    expect(write).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(write.mock.calls[0][0]))).toMatchObject({
      level: 'log',
      message: 'User onboarded',
      params: { userId: 'user-1' },
    });
  });

  it('redacts secrets by key at any depth', () => {
    const write = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const logger = createLogger({ NODE_ENV: 'production' });

    logger.log('Credentials checked', {
      username: 'rizky',
      password: 'super-secret',
      nested: { accessToken: 'token-value', keep: true },
    });

    const record = JSON.parse(String(write.mock.calls[0][0]));

    expect(record.params).toEqual({
      username: 'rizky',
      password: '[REDACTED]',
      nested: { accessToken: '[REDACTED]', keep: true },
    });
  });
});
