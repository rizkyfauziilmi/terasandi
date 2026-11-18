import { Module } from '@nestjs/common';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';

/** Private, per-user file storage on the existing `files` disk. */
@Module({
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
