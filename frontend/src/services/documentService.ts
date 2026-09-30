/**
 * Document API services for ShareBuddy
 */

import { apiRequest, uploadFile } from './api';
import apiClient from './api';
import { 
  ApiResponse, 
  Document,
  DocumentUploadResponse,
  DocumentUploadForm, 
  DocumentSearchParams,
  PaginatedResponse 
} from '../types';

export const documentService = {
  // Get all documents with pagination and filters
  // Uses full-text search API when search query is provided
  getDocuments: async (params?: DocumentSearchParams): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    // If search query exists, use full-text search API
    if (params?.search && params.search.trim().length > 0) {
      const queryParams = new URLSearchParams();
      queryParams.append('q', params.search.trim());
      
      // Add pagination
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      
      // Add filters that match search API
      if (params.subject) queryParams.append('subject', params.subject);
      if (params.university) queryParams.append('university', params.university);
      if (params.minRating) queryParams.append('minRating', params.minRating.toString());
      if (params.maxCreditCost) queryParams.append('maxCreditCost', params.maxCreditCost.toString());
      if (params.fileType) queryParams.append('fileType', params.fileType);
      if (params.isVerifiedAuthor) queryParams.append('isVerifiedAuthor', 'true');
      if (params.year) queryParams.append('year', params.year.toString());
      if (params.tags && Array.isArray(params.tags) && params.tags.length > 0) {
        params.tags.forEach(tag => queryParams.append('tags', tag));
      }
      
      // Map sortBy to search API format
      if (params.sortBy) {
        const sortMap: Record<string, string> = {
          'newest': 'newest',
          'oldest': 'newest', // Search API doesn't have oldest, use newest
          'popular': 'popular',
          'rating': 'rating',
          'downloads': 'popular', // Map to popular
          'relevance': 'relevance'
        };
        queryParams.append('sortBy', sortMap[params.sortBy] || 'relevance');
      }
      
      const response = await apiRequest('GET', `search/documents?${queryParams.toString()}`);
      
      // Map search API response to expected format
      if (response.data && response.data.documents) {
        return {
          ...response,
          data: {
            items: response.data.documents.map((doc: any) => ({
              ...doc,
              id: doc.document_id,
              thumbnailUrl: doc.thumbnail_url || doc.thumbnailUrl,
              author: {
                id: doc.user_id,
                username: doc.author_username || doc.username,
                fullName: doc.full_name,
                avatarUrl: doc.avatar_url,
                isVerifiedAuthor: doc.is_verified_author
              }
            })),
            page: response.data.pagination?.page || response.data.page || 1,
            totalPages: response.data.pagination?.totalPages || response.data.totalPages || 1,
            totalItems: response.data.pagination?.total || response.data.total || 0,
            hasNext: (response.data.pagination?.page || response.data.page || 1) < (response.data.pagination?.totalPages || response.data.totalPages || 1),
            hasPrev: (response.data.pagination?.page || response.data.page || 1) > 1
          }
        };
      }
      return response;
    }
    
    // Regular documents endpoint for non-search queries
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && key !== 'search') {
          // Handle array values (like tags)
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v.toString()));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }
    
    const query = queryParams.toString();
    const url = query ? `documents?${query}` : 'documents';
    
    return apiRequest('GET', url);
  },

  // Get document by ID
  getDocumentById: async (id: string) => {
    return apiRequest<{ document: Document }>('GET', `/documents/${id}`);
  },

  // Upload new document
  uploadDocument: async (
    data: DocumentUploadForm, 
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<DocumentUploadResponse>> => {
    return uploadFile('documents/upload', file, data, onProgress);
  },

  // Update document
  updateDocument: async (id: string, data: Partial<DocumentUploadForm>): Promise<ApiResponse<Document>> => {
    return apiRequest('PUT', `documents/${id}`, data);
  },

  // Delete document
  deleteDocument: async (id: string): Promise<ApiResponse> => {
    return apiRequest('DELETE', `documents/${id}`);
  },

  // Download document
  downloadDocument: async (id: string) => {
    // We use the raw apiClient here to handle 'blob' response type for file downloads
    const response = await apiClient.post(
      `/documents/${id}/download`, 
      {}, 
      { responseType: 'blob' }
    );
    return response.data;
  },
  // Get document preview
  previewDocument: async (id: string): Promise<ApiResponse<{ previewUrl: string }>> => {
    return apiRequest('GET', `documents/${id}/preview`);
  },

  // Bookmark document
  bookmarkDocument: async (id: string): Promise<ApiResponse> => {
    return apiRequest('POST', `documents/${id}/bookmark`);
  },

  // Remove bookmark
  removeBookmark: async (id: string): Promise<ApiResponse> => {
    return apiRequest('DELETE', `documents/${id}/bookmark`);
  },

  // Get user's bookmarked documents
  getBookmarkedDocuments: async (params?: DocumentSearchParams): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Handle array values (like tags)
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v.toString()));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }
    
    const query = queryParams.toString();
    const url = query ? `documents/bookmarks?${query}` : 'documents/bookmarks';
    
    return apiRequest('GET', url);
  },

  // Get user's uploaded documents
  getMyDocuments: async (): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    return apiRequest('GET', 'documents/my-documents');
  },

  // Get user's downloaded documents
  getDownloadedDocuments: async (): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    return apiRequest('GET', 'documents/downloads');
  },

  // Search documents (alias for getDocuments with search param)
  searchDocuments: async (
    query: string, 
    filters?: Partial<DocumentSearchParams>
  ): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    const params = {
      search: query,
      ...filters
    };
    
    return documentService.getDocuments(params);
  },

  // Get search suggestions (autocomplete)
  getSearchSuggestions: async (query: string, limit: number = 10): Promise<ApiResponse<{ suggestions: string[] }>> => {
    return apiRequest('GET', `search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  // Get popular documents
  getPopularDocuments: async (limit?: number): Promise<ApiResponse<Document[]>> => {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest('GET', `documents/popular${params}`);
  },

  // Get recent documents
  getRecentDocuments: async (limit?: number): Promise<ApiResponse<Document[]>> => {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest('GET', `documents/recent${params}`);
  },

  // Get documents by category
  getDocumentsByCategory: async (
    category: string, 
    params?: DocumentSearchParams
  ): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    const searchParams = { ...params, category };
    return documentService.getDocuments(searchParams);
  },

  // Get documents by subject
  getDocumentsBySubject: async (
    subject: string, 
    params?: DocumentSearchParams
  ): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    const searchParams = { ...params, subject };
    return documentService.getDocuments(searchParams);
  },

  // Get document statistics
  getDocumentStats: async (id: string): Promise<ApiResponse<{
    downloadCount: number;
    viewCount: number;
    bookmarkCount: number;
    ratingCount: number;
    averageRating: number;
  }>> => {
    return apiRequest('GET', `documents/${id}/stats`);
  },

  // Report document
  reportDocument: async (id: string, reason: string, description?: string): Promise<ApiResponse> => {
    return apiRequest('POST', `documents/${id}/report`, {
      reason,
      description
    });
  }
};