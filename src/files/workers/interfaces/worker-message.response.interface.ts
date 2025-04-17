import { FileDto } from '../../dto';

export interface IWorkerMessageResponse {
  fileUrl: string;
  requestId: string;
  success: boolean;
  data?: FileDto;
  error?: string;
}
