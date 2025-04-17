import { Injectable, NotFoundException } from '@nestjs/common';

import {
  UploadFilesRequestDto,
  FindFilesResponseDto,
  FindFilesRequestDto,
  UploadFilesResponseDto,
} from './dto';
import { File } from './entities/file.entity';
import { FilesRepository } from './files.repository';
import { WorkerPoolService } from './workers/worker-pool.service';

@Injectable()
export class FilesService {
  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly workerPoolService: WorkerPoolService,
  ) {}

  /**
   * Uploads multiple files from URLs in parallel
   * @param dto - Contains an array of file URLs to upload
   * @returns Object with successful and failed uploads
   */
  public async uploadFiles(dto: UploadFilesRequestDto): Promise<UploadFilesResponseDto> {
    return await this.workerPoolService.processFiles(dto.fileUrls);
  }

  /**
   * Finds all files with pagination
   * @param dto - Contains pagination parameters (page and limit)
   * @returns Object with paginated list of files
   */
  public async findAll(dto: FindFilesRequestDto): Promise<FindFilesResponseDto> {
    return await this.filesRepository.findAll(dto);
  }

  /**
   * Finds a single file by ID
   * @param id - The ID of the file to find
   * @returns The found file
   * @throws NotFoundException if the file is not found
   */
  public async findOne(id: string): Promise<File> {
    try {
      return await this.filesRepository.findOne(id);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
}
