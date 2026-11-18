import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Can } from '@nestjs/authorization';
import { CurrentUser } from '@nestjs/authentication';
import {
  completeFileUploadSchema,
  fileIdSchema,
  renameFileSchema,
  requestFileUploadSchema,
} from '@terasandi/contracts';
import type {
  CompleteFileUploadDto,
  DownloadUrl,
  FilesResponse,
  FileUploadTicket,
  RenameFileDto,
  RequestFileUploadDto,
  StoredFile,
} from '@terasandi/contracts';
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
