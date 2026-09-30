import { apiRequest } from './api';
import { ApiResponse } from '../types';

interface PreviewData {
  documentId: string;
  title: string;
  hasPreview: boolean;
  hasThumbnail: boolean;
  previewGenerated: boolean;
  previewPages: number;
  viewCount: number;
  fileSize: string;
  previewUrl: string | null;
  thumbnailUrl: string | null;
}

export const previewService = {
  // Get preview info
  getPreviewInfo: async (documentId: string) => {
    return apiRequest<PreviewData>('GET', `/preview/${documentId}/info`);
  },

  // (Admin/Owner) Generate preview manually
  generatePreview: async (documentId: string) => {
    return apiRequest('POST', `/preview/${documentId}/generate`);
  }
};