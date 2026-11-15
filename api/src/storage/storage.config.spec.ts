import { ConfigService } from '@nestjs/config';
import { S3Disk } from '@nestjs/storage';
import { validateEnv } from '../config/env.js';
import type { Env } from '../config/env.js';
import { createStorageOptions } from './storage.config.js';

function configService(overrides: Record<string, string> = {}) {
  return new ConfigService(
    validateEnv({
      DATABASE_URL: 'postgres://terasandi:terasandi@localhost:5432/terasandi',
      JWT_SECRET: 'a'.repeat(32),
      STORAGE_ACCESS_KEY: 'terasandi',
      STORAGE_SECRET_KEY: 'terasandi-dev-secret',
      ...overrides,
    }),
  ) as ConfigService<Env, true>;
}

describe('createStorageOptions', () => {
  it('registers one default disk named files', () => {
    const options = createStorageOptions(configService());

    expect(options.default).toBe('files');
    expect(Object.keys(options.disks)).toEqual(['files']);
  });

  it('points the files disk at the configured bucket', () => {
    const options = createStorageOptions(
      configService({
        STORAGE_ENDPOINT: 'https://s3.example.com',
        STORAGE_REGION: 'eu-central-1',
        STORAGE_BUCKET: 'my-files',
      }),
    );

    const disk = options.disks.files;

    expect(disk).toBeInstanceOf(S3Disk);
    expect((disk as S3Disk).bucket).toBe('my-files');
    expect((disk as S3Disk).region).toBe('eu-central-1');
  });

  it('builds the disk without touching the network', () => {
    // Construction alone must not call MinIO: the API boots with it down.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    createStorageOptions(configService());

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
