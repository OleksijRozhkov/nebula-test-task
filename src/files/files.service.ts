import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { PassThrough } from 'stream';

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { File } from './entities/file.entity';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { UploadFilesDto, FindFilesResponseDto, FindFilesRequestDto } from './dto';
import { FilesRepository } from './files.repository';

@Injectable()
export class FilesService {
  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  public async uploadFiles(dto: UploadFilesDto): Promise<File[]> {
    const uploadPromises = dto.fileUrls.map(url => this.processFileUpload(url));
    return Promise.all(uploadPromises);
  }

  private async processFileUpload(fileUrl: string): Promise<File> {
    try {
      // Generate a unique filename
      const fileName = path.basename(fileUrl).split('?')[0] || `file-${uuidv4()}`;

      // Create a pass-through stream
      const passThrough = new PassThrough();

      // The upload promise that is gonna be initialised in the streamFile function
      let uploadPromise: Promise<{
        id: string;
        webViewLink: string;
      }>;

      // Start downloading the file first
      const { finalFileName, totalSize } = await this.streamFile(
        fileName,
        fileUrl,
        passThrough,
        // The function that is gonna be called right after the file download has started
        (finalFileName: string) => {
          uploadPromise = this.googleDriveService.uploadFileStream(passThrough, finalFileName);
        },
      );

      // By the time we get here, uploadPromise should already be initialised
      const { id: driveFileId, webViewLink } = await uploadPromise;

      // Save file info to database and return
      const file = new File();
      file.originalName = finalFileName;
      file.mimeType = this.getMimeType(finalFileName);
      file.size = totalSize;
      file.driveFileId = driveFileId;
      file.driveFileUrl = webViewLink;
      file.originalUrl = fileUrl;
      return this.filesRepository.save(file);
    } catch (error) {
      throw new BadRequestException(`Failed to process file url "${fileUrl}": ${error.message}`);
    }
  }

  private async streamFile(
    fileName: string,
    url: string,
    writeStream: NodeJS.WritableStream,
    startUploadToCloud: (finalFileName: string) => void,
  ): Promise<{
    finalFileName: string;
    totalSize: number;
  }> {
    return new Promise((resolve, reject) => {
      const makeRequest = (currentUrl: string, redirectsCount = 0) => {
        if (redirectsCount > 10) {
          reject(new Error('Too many redirects'));
          return;
        }

        const protocol = currentUrl.startsWith('https') ? https : http;
        protocol
          .get(currentUrl, response => {
            if (response.statusCode >= 300 && response.statusCode < 400) {
              // Handle redirect
              const redirectUrl = response.headers.location;
              if (!redirectUrl) {
                reject(new Error('Redirect location not found'));
                return;
              }

              // Close the current response and make a new request to the redirect URL
              response.destroy();
              makeRequest(redirectUrl, redirectsCount + 1);
              return;
            }

            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download file, status code: ${response.statusCode}`));
              return;
            }

            // Validate that this is a file and not a web page
            const contentType = response.headers['content-type'];
            if (!contentType) {
              reject(new Error('No content-type specified in response headers'));
              return;
            }

            const contentDispositionHeader = response.headers['content-disposition'];

            // Check if the content type indicates a web page
            if (contentType.includes('text/html') || contentType.includes('text/plain')) {
              // If it's a web page, check if it has a Content-Disposition header with a filename
              if (!contentDispositionHeader?.includes('filename=')) {
                reject(new Error('URL points to a web page, not a file'));
                return;
              }
            }

            // Extract filename from Content-Disposition header if available
            let finalFileName = fileName;
            if (contentDispositionHeader) {
              const filenameMatch = contentDispositionHeader.match(/filename="([^"]+)"/);
              if (filenameMatch && filenameMatch[1]) {
                finalFileName = filenameMatch[1];
              }
            }

            let totalSize = 0;
            response.on('data', chunk => (totalSize += chunk.length));

            response.pipe(writeStream);
            startUploadToCloud(finalFileName);

            response.on('end', () => resolve({ finalFileName, totalSize }));
          })
          .on('error', err => {
            reject(err);
          });
      };

      makeRequest(url);
    });
  }

  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.zip': 'application/zip',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  public async findAll(dto: FindFilesRequestDto): Promise<FindFilesResponseDto> {
    return this.filesRepository.findAll(dto);
  }

  public async findOne(id: string): Promise<File> {
    try {
      return await this.filesRepository.findOne(id);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
}
