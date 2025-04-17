import { ApiProperty } from '@nestjs/swagger';

export class FileDto {
  @ApiProperty({
    description: 'Unique identifier of the file',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  public id: string;

  @ApiProperty({
    description: 'Original name of the file',
    example: 'document.pdf',
  })
  public originalName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  public mimeType: string;

  @ApiProperty({ description: 'Size of the file in bytes', example: 1024 })
  public size: number;

  @ApiProperty({
    description: 'Google Drive file ID',
    example: '1A2B3C4D5E6F7G8H9I0J',
  })
  public driveFileId: string;

  @ApiProperty({
    description: 'Google Drive file URL',
    example: 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view',
  })
  public driveFileUrl: string;

  @ApiProperty({
    description: 'Original URL of the file',
    example: 'https://example.com/document.pdf',
  })
  public originalUrl: string;

  @ApiProperty({
    description: 'Date when the file was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  public createdAt: Date;

  @ApiProperty({
    description: 'Date when the file was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  public updatedAt: Date;
}
