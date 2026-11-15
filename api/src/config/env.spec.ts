import { envSchema, validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgres://terasandi:terasandi@localhost:5432/terasandi',
  JWT_SECRET: 'a'.repeat(32),
};

describe('envSchema', () => {
  it('applies the development defaults', () => {
    expect(envSchema.parse(valid)).toEqual({
      NODE_ENV: 'development',
      PORT: 3001,
      DATABASE_URL: valid.DATABASE_URL,
      JWT_SECRET: valid.JWT_SECRET,
      ACCESS_TOKEN_TTL: '15m',
    });
  });

  it('coerces PORT to a number', () => {
    expect(envSchema.parse({ ...valid, PORT: '4000' }).PORT).toBe(4000);
  });

  it('accepts a custom access-token lifetime', () => {
    expect(
      envSchema.parse({ ...valid, ACCESS_TOKEN_TTL: '30s' }).ACCESS_TOKEN_TTL,
    ).toBe('30s');
  });

  it('rejects a malformed access-token lifetime', () => {
    expect(() =>
      envSchema.parse({ ...valid, ACCESS_TOKEN_TTL: '15 minutes' }),
    ).toThrow(/ACCESS_TOKEN_TTL/);
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => envSchema.parse({ ...valid, PORT: 'http' })).toThrow();
  });

  it('leaves LOG_LEVEL undefined when it is not set', () => {
    expect(envSchema.parse(valid).LOG_LEVEL).toBeUndefined();
  });

  it('accepts a LOG_LEVEL value', () => {
    expect(envSchema.parse({ ...valid, LOG_LEVEL: '>=warn' }).LOG_LEVEL).toBe(
      '>=warn',
    );
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    expect(() => envSchema.parse({ ...valid, JWT_SECRET: 'short' })).toThrow(
      /at least 32 characters/,
    );
  });
});

describe('validateEnv', () => {
  it('returns the parsed environment', () => {
    expect(validateEnv(valid)).toEqual({
      NODE_ENV: 'development',
      PORT: 3001,
      DATABASE_URL: valid.DATABASE_URL,
      JWT_SECRET: valid.JWT_SECRET,
      ACCESS_TOKEN_TTL: '15m',
    });
  });

  it('names the missing variables in the error', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(
      /Invalid environment variables[\s\S]*DATABASE_URL[\s\S]*JWT_SECRET/,
    );
  });
});
