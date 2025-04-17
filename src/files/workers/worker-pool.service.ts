import { cpus } from 'os';
import * as path from 'path';
import { Worker } from 'worker_threads';

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { UploadFilesResponseDto } from '../dto';
import { IWorkerMessageResponse } from './interfaces/worker-message.response.interface';
import { IWorkerMessageRequest } from './interfaces';

interface PendingRequest {
  resolve: (value: UploadFilesResponseDto) => void;
  reject: (reason?: any) => void;
  results: UploadFilesResponseDto;
  remainingFiles: number;
}

/**
 * Service responsible for managing a pool of worker threads
 * Handles parallel file processing using Node.js worker threads
 */
@Injectable()
export class WorkerPoolService implements OnModuleInit, OnModuleDestroy {
  // Collection of active worker threads
  private workers: Worker[] = [];
  // Map to track pending requests
  private pendingRequests: Map<string, PendingRequest> = new Map();

  /**
   * Initializes the worker pool when the module starts
   * Creates worker threads based on available CPU cores
   */
  public async onModuleInit() {
    // Use all available CPU cores minus one (to leave one core for main thread)
    const numberOfThreadsToCreate = Math.min(cpus().length - 1, 1);

    for (let i = 0; i < numberOfThreadsToCreate; i++) {
      // Create a new worker thread from the compiled worker file
      const worker = new Worker(path.join(__dirname, 'file-upload.worker.js'));

      // Set up event handlers for worker communication
      worker.on('message', result => this.handleWorkerMessage(result));
      worker.on('error', error => this.handleWorkerError(error));

      // Add the worker to our pool
      this.workers.push(worker);
    }
  }

  private async handleWorkerMessage(workerResponse: IWorkerMessageResponse) {
    const pendingRequest = this.pendingRequests.get(workerResponse.requestId);
    if (!pendingRequest) {
      const errorMessage = `No pending request found for request ID: ${workerResponse.requestId}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    if (workerResponse.success && workerResponse.data) {
      pendingRequest.results.successfulUploads.push(workerResponse.data);
    } else {
      pendingRequest.results.failedUploads.push({
        url: workerResponse.fileUrl || 'unknown',
        error: workerResponse.error || 'Unknown error',
      });
    }

    pendingRequest.remainingFiles--;
    if (pendingRequest.remainingFiles === 0) {
      pendingRequest.resolve(pendingRequest.results);
      this.pendingRequests.delete(workerResponse.requestId);
    }
  }

  private async handleWorkerError(error: Error) {
    // this should not happen, we handle all errors in workers
    console.error('Received unexpected error from worker:', error);
    throw error;
  }

  /**
   * Cleans up worker threads when the module is destroyed
   * Ensures all workers are properly terminated
   */
  public async onModuleDestroy() {
    await Promise.all(this.workers.map(worker => worker.terminate()));
  }

  public async processFiles(fileUrls: string[]): Promise<UploadFilesResponseDto> {
    return new Promise((resolve, reject) => {
      const requestId = uuidv4();
      const results: UploadFilesResponseDto = {
        successfulUploads: [],
        failedUploads: [],
      };

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        results,
        remainingFiles: fileUrls.length,
      });

      for (let i = 0; i < fileUrls.length; i++) {
        const fileUrl = fileUrls[i];
        const workerIndex = i % this.workers.length;
        this.workers[workerIndex].postMessage({ fileUrl, requestId } as IWorkerMessageRequest);
      }
    });
  }
}
