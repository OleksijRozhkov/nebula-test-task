import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUrl, ArrayMinSize, ArrayMaxSize } from 'class-validator';

import { File } from '../entities/file.entity';

export class UploadFilesRequestDto {
  @ApiProperty({
    description: 'Array of file URLs to upload',
    type: [String],
    example: ['https://example.com/file1.pdf', 'https://example.com/file2.jpg'],
    minItems: 1,
  })
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsUrl({}, { each: true, message: 'Each element must be a valid URL' })
  @ArrayMinSize(1, { message: 'At least one file URL must be provided' })
  @ArrayMaxSize(100, {
    message: 'Maximum of 100 file URLs per request allowed',
  })
  public fileUrls: string[];
}

export class FailedUploadDto {
  @ApiProperty({
    description: 'URL of the file that failed to upload',
    type: String,
  })
  public url: string;

  @ApiProperty({
    description: 'Error message from the failed upload',
    type: String,
  })
  public error: string;
}

export class UploadFilesResponseDto {
  @ApiProperty({
    description: 'List of successfully uploaded files',
    type: [File],
  })
  public successfulUploads: File[];

  @ApiProperty({
    description: 'List of failed uploads with error messages',
    type: [FailedUploadDto],
  })
  public failedUploads: FailedUploadDto[];
}
