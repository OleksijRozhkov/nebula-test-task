import * as path from 'path';
import { Readable } from 'stream';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { drive_v3 } from 'googleapis/build/src/apis/drive/v3';

@Injectable()
export class GoogleDriveService {
  private driveClient: drive_v3.Drive;

  constructor(private readonly configService: ConfigService) {}

  private async setupDriveClient() {
    try {
      // Load credentials from environment variables
      const credentials = {
        client_email: this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
        private_key: this.configService.get<string>('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      };

      const auth = new google.auth.JWT(credentials.client_email, null, credentials.private_key, [
        'https://www.googleapis.com/auth/drive',
      ]);

      this.driveClient = google.drive({ version: 'v3', auth });
    } catch (error) {
      console.error('Failed to initialize Google Drive client:', error);
      throw error;
    }
  }

  public async uploadFileStream(
    stream: Readable,
    fileName: string,
  ): Promise<{ id: string; webViewLink: string }> {
    try {
      if (!this.driveClient) {
        await this.setupDriveClient();
      }

      const fileMetadata = {
        name: fileName,
        parents: [this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID')],
      };

      const media = {
        mimeType: this.getMimeType(fileName),
        body: stream,
      };

      const response = await this.driveClient.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
      });

      return {
        id: response.data.id,
        webViewLink: response.data.webViewLink,
      };
    } catch (error) {
      console.error('Error uploading file stream to Google Drive: ', error);
      throw error;
    }
  }

  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    // now, we could add more mime types here
    // but since this is a test task, I think this is enough
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
}
