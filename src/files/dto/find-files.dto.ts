import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { File } from '../entities';

export class FindFilesRequestDto {
  @ApiProperty({
    description: 'Page number',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  public page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    required: false,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  public limit?: number = 10;
}

export class FindFilesResponseDto {
  @ApiProperty({
    description: 'List of files',
    type: [File],
  })
  public files: File[];

  @ApiProperty({
    description: 'Total number of files',
    type: Number,
  })
  public total: number;

  @ApiProperty({
    description: 'Current page number',
    type: Number,
  })
  public page: number;

  @ApiProperty({
    description: 'Number of items per page',
    type: Number,
  })
  public limit: number;
}
