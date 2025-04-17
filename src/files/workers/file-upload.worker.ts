import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { PassThrough } from 'stream';
import { parentPort } from 'worker_threads';

import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { File } from '../entities/file.entity';
import { FilesRepository } from '../files.repository';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { IWorkerMessageRequest, IWorkerMessageResponse } from './interfaces';

// Initialize services with their dependencies
const configService = new ConfigService();

// Create database connection
const dataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'postgres'),
  database: configService.get('DB_DATABASE', 'file_upload'),
  entities: [File],
  synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
});

// Initialize services
const googleDriveService = new GoogleDriveService(configService);
const filesRepository = new FilesRepository(dataSource.getRepository(File));

/**
 * Processes a file upload from a URL
 * @param fileUrl - The URL of the file to upload
 * @returns Promise with the uploaded file entity
 */
async function processFileUpload(fileUrl: string): Promise<File> {
  try {
    // Generate a unique filename if the URL doesn't provide one
    const fileName = path.basename(fileUrl).split('?')[0] || `file-${uuidv4()}`;

    // Create a stream to pipe the file data through
    const passThrough = new PassThrough();

    // Promise to hold the upload result, will be initialised
    // when we know the final file name (in case of redirects)
    let uploadPromise: Promise<{ id: string; webViewLink: string }>;

    // Stream the file from the URL and start uploading to Google Drive
    const { finalFileName, totalSize } = await streamFile(
      fileName,
      fileUrl,
      passThrough,
      (finalFileName: string) => {
        // Start uploading to Google Drive when the stream is ready
        // and we know the final file name
        uploadPromise = googleDriveService.uploadFileStream(passThrough, finalFileName);
      },
    );

    // Wait for the Google Drive upload to complete
    const { id: driveFileId, webViewLink } = await uploadPromise;

    // Save the file to the database and return it
    const file = new File();
    file.originalName = finalFileName;
    file.mimeType = getMimeType(finalFileName);
    file.size = totalSize;
    file.driveFileId = driveFileId;
    file.driveFileUrl = webViewLink;
    file.originalUrl = fileUrl;
    return filesRepository.save(file);
  } catch (error) {
    console.error(`Failed to process file url "${fileUrl}": ${error.message}`);
    throw error;
  }
}

/**
 * Determines the MIME type of a file based on its extension
 * @param fileName - The name of the file
 * @returns The MIME type string
 */
function getMimeType(fileName: string): string {
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

/**
 * Streams a file from a URL and pipes it to a write stream
 * @param fileName - The name of the file
 * @param url - The URL to download from
 * @param writeStream - The stream to write the file to
 * @param startUploadToCloud - Callback to start the cloud upload
 * @returns Promise with the final filename and total size
 */
async function streamFile(
  fileName: string,
  url: string,
  writeStream: NodeJS.WritableStream,
  startUploadToCloud: (finalFileName: string) => void,
): Promise<{ finalFileName: string; totalSize: number }> {
  return new Promise((resolve, reject) => {
    // Function to make HTTP requests with redirect handling
    const makeRequest = (currentUrl: string, redirectsCount = 0) => {
      // Prevent infinite redirects
      if (redirectsCount > 10) {
        reject(new Error('Too many redirects'));
        return;
      }

      const protocol = currentUrl.startsWith('https') ? https : http;
      protocol
        .get(currentUrl, response => {
          // Handle redirects
          if (response.statusCode >= 300 && response.statusCode < 400) {
            const redirectUrl = response.headers.location;
            if (!redirectUrl) {
              reject(new Error('Redirect location not found'));
              return;
            }
            response.destroy();
            makeRequest(redirectUrl, redirectsCount + 1);
            return;
          }

          // Check for successful response
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download file, status code: ${response.statusCode}`));
            return;
          }

          // Validate content type
          const contentType = response.headers['content-type'];
          if (!contentType) {
            reject(new Error('No content-type specified in response headers'));
            return;
          }

          // Prevent downloading HTML pages as files
          const contentDispositionHeader = response.headers['content-disposition'];
          if (contentType.includes('text/html') || contentType.includes('text/plain')) {
            if (!contentDispositionHeader?.includes('filename=')) {
              reject(new Error('URL points to a web page, not a file'));
              return;
            }
          }

          // Get the final filename from content-disposition header or use the provided one
          let finalFileName = fileName;
          if (contentDispositionHeader) {
            const filenameMatch = contentDispositionHeader.match(/filename="([^"]+)"/);
            if (filenameMatch && filenameMatch[1]) {
              finalFileName = filenameMatch[1];
            }
          }

          // Track the total size of the file
          let totalSize = 0;
          response.on('data', chunk => (totalSize += chunk.length));

          // Pipe the response and start uploading to cloud
          response.pipe(writeStream);
          startUploadToCloud(finalFileName);

          // Resolve when the download is complete
          response.on('end', () => resolve({ finalFileName, totalSize }));
        })
        .on('error', err => {
          reject(err);
        });
    };

    // Start the download process
    makeRequest(url);
  });
}

// Initialize database connection
dataSource
  .initialize()
  .then(() => {
    // Handle messages from the main thread
    parentPort.on('message', async (message: IWorkerMessageRequest) => {
      try {
        const result = await processFileUpload(message.fileUrl);

        parentPort.postMessage({
          success: true,
          data: result,
          fileUrl: message.fileUrl,
          requestId: message.requestId,
        } as IWorkerMessageResponse);
      } catch (error) {
        parentPort.postMessage({
          success: false,
          error: error.message,
          fileUrl: message.fileUrl,
          requestId: message.requestId,
        } as IWorkerMessageResponse);
      }
    });
  })
  .catch(error => {
    console.error('Failed to initialize database connection:', error);
    process.exit(1);
  });
