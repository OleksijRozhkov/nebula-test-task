import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { File } from './entities/file.entity';
import { FindFilesRequestDto, FindFilesResponseDto } from './dto';

@Injectable()
export class FilesRepository {
  public constructor(
    @InjectRepository(File)
    private readonly repository: Repository<File>,
  ) {}

  public async save(file: File): Promise<File> {
    return await this.repository.save(file);
  }

  public async findAll(dto: FindFilesRequestDto): Promise<FindFilesResponseDto> {
    const { page, limit } = dto;

    const [files, total] = await this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      files,
      total,
      page,
      limit,
    };
  }

  public async findOne(id: string): Promise<File> {
    const file = await this.repository.findOne({ where: { id } });
    if (!file) {
      throw new Error(`File with ID ${id} not found`);
    }
    return file;
  }
}
