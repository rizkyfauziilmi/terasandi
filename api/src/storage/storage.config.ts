import type { ConfigService } from '@nestjs/config';
import { S3Disk, type StorageModuleOptions } from '@nestjs/storage';
import type { Env } from '../config/env.js';

/**
 * One private disk on an S3-compatible store. MinIO needs `forcePathStyle`;
 * the same options point at AWS S3 or R2 by changing the environment.
 */
export function createStorageOptions(
  config: ConfigService<Env, true>,
): StorageModuleOptions {
  return {
    default: 'files',
    disks: {
      files: new S3Disk({
        endpoint: config.get('STORAGE_ENDPOINT', { infer: true }),
        region: config.get('STORAGE_REGION', { infer: true }),
        bucket: config.get('STORAGE_BUCKET', { infer: true }),
        forcePathStyle: config.get('STORAGE_FORCE_PATH_STYLE', { infer: true }),
        credentials: {
          accessKeyId: config.get('STORAGE_ACCESS_KEY', { infer: true }),
          secretAccessKey: config.get('STORAGE_SECRET_KEY', { infer: true }),
        },
      }),
    },
  };
}
