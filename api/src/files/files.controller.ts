import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { Can } from '@nestjs/authorization';
import { CurrentUser } from '@nestjs/authentication';
import {
  bulkFileIdsSchema,
  completeFileUploadSchema,
  fileIdSchema,
  renameFileSchema,
  requestFileUploadSchema,
} from '@terasandi/contracts';
import type {
  BulkFileIdsDto,
  CompleteFileUploadDto,
  DownloadUrl,
  FilesResponse,
  FileUploadTicket,
  RenameFileDto,
  RequestFileUploadDto,
  StoredFile,
} from '@terasandi/contracts';
import { ZipArchive } from 'archiver';
import type { Response } from 'express';
import type { User } from '../db/schema.js';
import { FilesService } from './files.service.js';

/**
 * Every route serves only the signed-in user's files. `@Can.Anyone()` means
 * "signed in, no extra role", and the service scopes each query by user id, so
 * an admin gets no cross-account access either.
 */
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  @Can.Anyone()
  list(@CurrentUser() user: User): Promise<FilesResponse> {
    return this.filesService.list(user);
  }

  /** Creates a short-lived direct-to-storage upload URL. */
  @Post('uploads')
  @Can.Anyone()
  createUpload(
    @CurrentUser() user: User,
    @Body({ schema: requestFileUploadSchema }) body: RequestFileUploadDto,
  ): Promise<FileUploadTicket> {
    return this.filesService.createUploadTicket(user, body);
  }

  /** Records an upload after its bytes have been checked on the server. */
  @Post()
  @Can.Anyone()
  completeUpload(
    @CurrentUser() user: User,
    @Body({ schema: completeFileUploadSchema }) body: CompleteFileUploadDto,
  ): Promise<StoredFile> {
    return this.filesService.completeUpload(user, body);
  }

  /** Streams the selected files as one ZIP without buffering them in memory. */
  @Post('archive')
  @HttpCode(200)
  @Can.Anyone()
  async archive(
    @CurrentUser() user: User,
    @Body({ schema: bulkFileIdsSchema }) body: BulkFileIdsDto,
    @Res() res: Response,
  ): Promise<void> {
    const entries = await this.filesService.archiveEntries(user, body.ids);
    const archive = new ZipArchive({ zlib: { level: 0 } });
    const usedNames = new Set<string>();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="terasandi-files.zip"',
    );
    archive.on('error', () => {
      if (res.headersSent) {
        res.destroy();
      } else {
        res.status(500).json({ message: 'Could not create the archive.' });
      }
    });
    archive.pipe(res);

    try {
      for (const entry of entries) {
        const stream = await this.filesService.openArchiveEntry(
          entry.storageKey,
        );
        archive.append(stream, {
          name: uniqueArchiveName(entry.name, usedNames),
        });
      }
      await archive.finalize();
    } catch {
      archive.abort();
      if (!res.headersSent) {
        res.status(500).json({ message: 'Could not create the archive.' });
      }
    }
  }

  /** Streams one of the user's files inline, with the MIME type stored at upload. */
  @Get(':id/preview')
  @Can.Anyone()
  async preview(
    @CurrentUser() user: User,
    @Param('id', { schema: fileIdSchema }) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const preview = await this.filesService.openPreview(user, id);

    res.setHeader('Content-Type', preview.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store');
    preview.body.on('error', () => {
      if (res.headersSent) {
        res.destroy();
      } else {
        res.status(500).json({ message: 'Could not preview the file.' });
      }
    });
    preview.body.pipe(res);
  }

  @Get(':id/download')
  @Can.Anyone()
  downloadUrl(
    @CurrentUser() user: User,
    @Param('id', { schema: fileIdSchema }) id: string,
  ): Promise<DownloadUrl> {
    return this.filesService.downloadUrl(user, id);
  }

  @Patch(':id')
  @Can.Anyone()
  rename(
    @CurrentUser() user: User,
    @Param('id', { schema: fileIdSchema }) id: string,
    @Body({ schema: renameFileSchema }) body: RenameFileDto,
  ): Promise<StoredFile> {
    return this.filesService.rename(user, id, body.name);
  }

  @Delete()
  @HttpCode(204)
  @Can.Anyone()
  async deleteMany(
    @CurrentUser() user: User,
    @Body({ schema: bulkFileIdsSchema }) body: BulkFileIdsDto,
  ): Promise<void> {
    await this.filesService.deleteMany(user, body.ids);
  }

  @Delete(':id')
  @HttpCode(204)
  @Can.Anyone()
  async delete(
    @CurrentUser() user: User,
    @Param('id', { schema: fileIdSchema }) id: string,
  ): Promise<void> {
    await this.filesService.delete(user, id);
  }
}

/** Two files may share a display name; ZIP entry names still have to be unique. */
function uniqueArchiveName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }

  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : '';
  let counter = 2;
  let candidate = `${base} (${counter})${extension}`;

  while (used.has(candidate)) {
    counter += 1;
    candidate = `${base} (${counter})${extension}`;
  }

  used.add(candidate);
  return candidate;
}
