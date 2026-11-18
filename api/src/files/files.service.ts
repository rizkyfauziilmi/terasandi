import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDrizzle } from '@nestjs/drizzle';
import {
  InjectDisk,
  StorageDisk,
  StorageFileNotFoundError,
} from '@nestjs/storage';
import {
  FILE_CATEGORIES,
  type CompleteFileUploadDto,
  type DownloadUrl,
  type FileCategory,
  type FilesResponse,
  type FileUploadTicket,
  type RequestFileUploadDto,
  type StoredFile,
} from '@terasandi/contracts';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { durationToMs, type Env } from '../config/env.js';
import type { User } from '../db/schema.js';
import { files, publicFileColumns } from '../db/schema.js';
import { detectFileType } from './file-detector.js';

/** Enough bytes to recognize every format, including the OOXML ZIP entries. */
const SNIFF_BYTES = 64 * 1024;

type PublicFileRow = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  category: FileCategory;
  createdAt: Date;
  updatedAt: Date;
};

export interface ArchiveEntry {
  name: string;
  storageKey: string;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    @InjectDisk('files') private readonly disk: StorageDisk,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** A presigned PUT to a user-scoped prefix in the private bucket. */
  async createUploadTicket(
    user: User,
    input: RequestFileUploadDto,
  ): Promise<FileUploadTicket> {
    const maxSize = this.maxFileSize();

    if (input.size > maxSize) {
      throw new BadRequestException('File is too large');
    }

    const uploadId = randomUUID();
    const expiresIn = this.config.getOrThrow('UPLOAD_URL_TTL', { infer: true });
    const signed = await this.disk.signedUpload(
      incomingKey(user.id, uploadId),
      {
        contentType: 'application/octet-stream',
        contentLength: input.size,
        expiresIn,
      },
    );

    return {
      uploadId,
      url: signed.url,
      method: signed.method,
      headers: signed.headers,
      expiresAt: signed.expiresAt.toISOString(),
      maxSize,
    };
  }

  /**
   * Inspects the bytes at the incoming key, falling back to the extension for
   * unrecognized formats, then moves the object to its final key and records
   * it. Nothing is ever trusted from the browser's MIME type.
   */
  async completeUpload(
    user: User,
    input: CompleteFileUploadDto,
  ): Promise<StoredFile> {
    const from = incomingKey(user.id, input.uploadId);
    let stat;

    try {
      stat = await this.disk.stat(from);
    } catch (error) {
      if (error instanceof StorageFileNotFoundError) {
        throw new BadRequestException('Upload expired. Please try again.');
      }

      throw error;
    }

    if (stat.size === 0 || stat.size > this.maxFileSize()) {
      await this.deleteIncoming(from);
      throw new BadRequestException('File is empty or too large');
    }

    const sample = await readPrefix(this.disk, from, SNIFF_BYTES);
    const detected = detectFileType(sample, input.name);
    const id = randomUUID();
    const to = finalKey(user.id, id, detected.extension);

    // S3 moves by copy + delete, so the new object may have a different ETag.
    const moved = await this.disk.move(from, to);

    try {
      const [row] = await this.db
        .insert(files)
        .values({
          id,
          userId: user.id,
          name: input.name,
          size: moved.size,
          mimeType: detected.mimeType,
          category: detected.category,
          storageKey: to,
          etag: moved.etag ?? null,
        })
        .returning(publicFileColumns);

      if (!row) {
        throw new Error('File insert returned no row');
      }

      const result = serialize(row);
      this.logger.log('File uploaded', {
        userId: user.id,
        fileId: id,
        category: result.category,
        size: result.size,
      });

      return result;
    } catch (error) {
      await this.disk.delete(to);
      throw error;
    }
  }

  /** Every file of the signed-in user, newest first. */
  async list(user: User): Promise<FilesResponse> {
    const rows = await this.db
      .select(publicFileColumns)
      .from(files)
      .where(eq(files.userId, user.id))
      .orderBy(desc(files.createdAt), desc(files.id));

    const items = rows.map(serialize);
    const totals = Object.fromEntries(
      FILE_CATEGORIES.map((category) => [category, 0]),
    ) as Record<FileCategory, number>;

    for (const file of items) {
      totals[file.category] += 1;
    }

    return {
      files: items,
      totals,
      totalSize: items.reduce((sum, file) => sum + file.size, 0),
      maxFileSize: this.maxFileSize(),
    };
  }

  async rename(user: User, id: string, name: string): Promise<StoredFile> {
    const [row] = await this.db
      .update(files)
      .set({ name })
      .where(and(eq(files.id, id), eq(files.userId, user.id)))
      .returning(publicFileColumns);

    if (!row) {
      throw new NotFoundException('File not found');
    }

    return serialize(row);
  }

  async delete(user: User, id: string): Promise<void> {
    const [row] = await this.db
      .delete(files)
      .where(and(eq(files.id, id), eq(files.userId, user.id)))
      .returning({ storageKey: files.storageKey });

    if (!row) {
      throw new NotFoundException('File not found');
    }

    await this.disk.delete(row.storageKey);
    this.logger.log('File deleted', { userId: user.id, fileId: id });
  }

  /** Deletes every selected file that still belongs to the signed-in user. */
  async deleteMany(user: User, ids: string[]): Promise<string[]> {
    const uniqueIds = [...new Set(ids)];
    const rows = await this.db
      .delete(files)
      .where(and(inArray(files.id, uniqueIds), eq(files.userId, user.id)))
      .returning({ id: files.id, storageKey: files.storageKey });

    if (rows.length === 0) {
      return [];
    }

    await this.disk.delete(rows.map((row) => row.storageKey));
    this.logger.log('Files deleted', { userId: user.id, count: rows.length });
    return rows.map((row) => row.id);
  }

  /** Storage keys for the ZIP stream, in the order the client selected them. */
  async archiveEntries(user: User, ids: string[]): Promise<ArchiveEntry[]> {
    const uniqueIds = [...new Set(ids)];
    const rows = await this.db
      .select({
        id: files.id,
        name: files.name,
        storageKey: files.storageKey,
      })
      .from(files)
      .where(and(inArray(files.id, uniqueIds), eq(files.userId, user.id)));

    if (rows.length === 0) {
      throw new NotFoundException('No files found');
    }

    const byId = new Map(rows.map((row) => [row.id, row]));
    return uniqueIds.flatMap((id) => {
      const row = byId.get(id);
      return row ? [{ name: row.name, storageKey: row.storageKey }] : [];
    });
  }

  /** Opens one object as a stream so the controller can pipe it into the ZIP. */
  async openArchiveEntry(storageKey: string) {
    const { body } = await this.disk.get(storageKey);
    return body;
  }

  /** Opens one of the user's files for inline preview with its detected MIME type. */
  async openPreview(
    user: User,
    id: string,
  ): Promise<{ mimeType: string; body: Readable }> {
    const [row] = await this.db
      .select({ mimeType: files.mimeType, storageKey: files.storageKey })
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, user.id)))
      .limit(1);

    if (!row) {
      throw new NotFoundException('File not found');
    }

    const { body } = await this.disk.get(row.storageKey);
    return { mimeType: row.mimeType, body };
  }

  /** A short-lived link to the private object, only for one of the user's files. */
  async downloadUrl(user: User, id: string): Promise<DownloadUrl> {
    const [row] = await this.db
      .select({ name: files.name, storageKey: files.storageKey })
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, user.id)))
      .limit(1);

    if (!row) {
      throw new NotFoundException('File not found');
    }

    const expiresIn = this.config.getOrThrow('DOWNLOAD_URL_TTL', {
      infer: true,
    });
    const url = await this.disk.signedUrl(row.storageKey, {
      expiresIn,
      filename: row.name,
      disposition: 'attachment',
    });

    return {
      url,
      expiresAt: new Date(Date.now() + durationToMs(expiresIn)).toISOString(),
    };
  }

  private maxFileSize(): number {
    return this.config.getOrThrow('MAX_FILE_SIZE_BYTES', { infer: true });
  }

  private async deleteIncoming(key: string): Promise<void> {
    try {
      await this.disk.delete(key);
    } catch (error) {
      this.logger.warn('Could not clean up an incoming upload', {
        key,
        error: String(error),
      });
    }
  }
}

function incomingKey(userId: string, uploadId: string): string {
  return `incoming/${userId}/${uploadId}`;
}

function finalKey(userId: string, fileId: string, extension: string): string {
  return `files/${userId}/${fileId}${extension}`;
}

function serialize(row: PublicFileRow): StoredFile {
  return {
    id: row.id,
    name: row.name,
    size: row.size,
    mimeType: row.mimeType,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Reads only the leading bytes of an object, never the whole file. */
async function readPrefix(
  disk: StorageDisk,
  key: string,
  bytes: number,
): Promise<Buffer> {
  const download = await disk.get(key, { range: { start: 0, end: bytes - 1 } });
  const chunks: Buffer[] = [];
  let total = 0;

  try {
    for await (const chunk of download.body) {
      const buffer = Buffer.from(chunk);
      chunks.push(buffer);
      total += buffer.length;

      if (total >= bytes) {
        break;
      }
    }
  } finally {
    download.body.destroy();
  }

  return Buffer.concat(chunks).subarray(0, bytes);
}
