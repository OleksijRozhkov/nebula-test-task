import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { File } from './entities/file.entity';
import { FilesController } from './files.controller';
import { FilesRepository } from './files.repository';
import { FilesService } from './files.service';
import { FilesWorkersModule } from './workers/files-workers.module';

@Module({
  imports: [TypeOrmModule.forFeature([File]), FilesWorkersModule],
  controllers: [FilesController],
  providers: [FilesService, FilesRepository],
  exports: [FilesService],
})
export class FilesModule {}
