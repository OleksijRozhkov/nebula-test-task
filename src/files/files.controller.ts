import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { UploadFilesDto, FindFilesRequestDto, FindFilesResponseDto } from './dto';
import { File } from './entities';
import { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload files from URLs' })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
    type: [File],
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  public async uploadFiles(
    @Body() uploadFilesDto: UploadFilesDto,
  ): Promise<{ message: string; uploadedFiles: File[] }> {
    const uploadedFiles = await this.filesService.uploadFiles(uploadFilesDto);
    return {
      message: 'Files uploaded successfully',
      uploadedFiles,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all files with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of files',
    type: FindFilesResponseDto,
  })
  public async findAll(
    @Query() findFilesRequestDto: FindFilesRequestDto,
  ): Promise<FindFilesResponseDto> {
    return this.filesService.findAll(findFilesRequestDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a file by ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Returns the file', type: File })
  @ApiResponse({ status: 404, description: 'File not found' })
  public async findOne(@Param('id') id: string): Promise<File> {
    return this.filesService.findOne(id);
  }
}
