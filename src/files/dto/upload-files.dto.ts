import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUrl, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class UploadFilesDto {
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
