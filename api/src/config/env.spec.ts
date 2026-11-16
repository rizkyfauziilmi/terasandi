import { envSchema, validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgres://terasandi:terasandi@localhost:5432/terasandi',
  JWT_SECRET: 'a'.repeat(32),
  STORAGE_ACCESS_KEY: 'terasandi',
  STORAGE_SECRET_KEY: 'terasandi-dev-secret',
};

const storageDefaults = {
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_REGION: 'us-east-1',
  STORAGE_BUCKET: 'terasandi-files',
  STORAGE_ACCESS_KEY: valid.STORAGE_ACCESS_KEY,
  STORAGE_SECRET_KEY: valid.STORAGE_SECRET_KEY,
  STORAGE_FORCE_PATH_STYLE: true,
};

describe('envSchema', () => {
  it('applies the development defaults', () => {
    expect(envSchema.parse(valid)).toEqual({
      NODE_ENV: 'development',
      PORT: 3001,
      DATABASE_URL: valid.DATABASE_URL,
      JWT_SECRET: valid.JWT_SECRET,
      ACCESS_TOKEN_TTL: '15m',
      TRUST_PROXY: false,
      AUTH_RATE_LIMIT: 5,
      AUTH_IP_RATE_LIMIT: 20,
      ...storageDefaults,
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

  it('parses TRUST_PROXY as a boolean', () => {
    expect(envSchema.parse({ ...valid, TRUST_PROXY: 'true' }).TRUST_PROXY).toBe(
      true,
    );
    expect(
      envSchema.parse({ ...valid, TRUST_PROXY: 'false' }).TRUST_PROXY,
    ).toBe(false);
  });

  it('rejects a non-positive auth rate limit', () => {
    expect(() => envSchema.parse({ ...valid, AUTH_RATE_LIMIT: '0' })).toThrow(
      /AUTH_RATE_LIMIT/,
    );
  });
});

describe('storage environment', () => {
  it('accepts a custom bucket, region and endpoint', () => {
    expect(
      envSchema.parse({
        ...valid,
        STORAGE_ENDPOINT: 'https://s3.example.com',
        STORAGE_REGION: 'eu-central-1',
        STORAGE_BUCKET: 'my-files',
      }),
    ).toMatchObject({
      STORAGE_ENDPOINT: 'https://s3.example.com',
      STORAGE_REGION: 'eu-central-1',
      STORAGE_BUCKET: 'my-files',
    });
  });

  it('rejects a malformed STORAGE_ENDPOINT', () => {
    expect(() =>
      envSchema.parse({ ...valid, STORAGE_ENDPOINT: 'not a url' }),
    ).toThrow(/STORAGE_ENDPOINT/);
  });

  it('rejects a bucket name shorter than three characters', () => {
    expect(() => envSchema.parse({ ...valid, STORAGE_BUCKET: 'ab' })).toThrow(
      /STORAGE_BUCKET/,
    );
  });

  it('requires the access key', () => {
    const { STORAGE_ACCESS_KEY: _, ...withoutAccessKey } = valid;

    expect(() => envSchema.parse(withoutAccessKey)).toThrow(
      /STORAGE_ACCESS_KEY/,
    );
  });

  it('requires the secret key', () => {
    const { STORAGE_SECRET_KEY: _, ...withoutSecretKey } = valid;

    expect(() => envSchema.parse(withoutSecretKey)).toThrow(
      /STORAGE_SECRET_KEY/,
    );
  });

  it('parses STORAGE_FORCE_PATH_STYLE as a boolean', () => {
    expect(
      envSchema.parse({ ...valid, STORAGE_FORCE_PATH_STYLE: 'false' })
        .STORAGE_FORCE_PATH_STYLE,
    ).toBe(false);
    expect(
      envSchema.parse({ ...valid, STORAGE_FORCE_PATH_STYLE: 'true' })
        .STORAGE_FORCE_PATH_STYLE,
    ).toBe(true);
  });

  it('rejects an ambiguous STORAGE_FORCE_PATH_STYLE', () => {
    expect(() =>
      envSchema.parse({ ...valid, STORAGE_FORCE_PATH_STYLE: 'maybe' }),
    ).toThrow(/STORAGE_FORCE_PATH_STYLE/);
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
      TRUST_PROXY: false,
      AUTH_RATE_LIMIT: 5,
      AUTH_IP_RATE_LIMIT: 20,
      ...storageDefaults,
    });
  });

  it('names the missing variables in the error', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(
      /Invalid environment variables[\s\S]*DATABASE_URL[\s\S]*JWT_SECRET[\s\S]*STORAGE_ACCESS_KEY/,
    );
  });
});
