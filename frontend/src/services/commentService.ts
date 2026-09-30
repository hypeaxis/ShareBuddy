/**
 * Comment API services for ShareBuddy
 */

import { apiRequest } from './api';
import { ApiResponse, Comment, PaginatedResponse } from '../types';

export const commentService = {
  // Get comments (Mapped to PaginatedResponse)
  getDocumentComments: async (
    documentId: string, 
    page = 1, 
    limit = 10, 
    sortOption: 'newest' | 'oldest' | 'popular' = 'newest'
  ): Promise<ApiResponse<PaginatedResponse<Comment>>> => {
    
    // Map frontend sort option to backend params
    let sortBy = 'created_at';
    let sortOrder = 'desc';

    if (sortOption === 'oldest') {
      sortOrder = 'asc';
    } else if (sortOption === 'popular') {
      sortBy = 'popular';
    }

    const response = await apiRequest<any>(
      'GET', 
      `/comments/document/${documentId}`, 
      null, 
      { params: { page, limit, sortBy, sortOrder } } // Pass params here
    );

    if (response.success && response.data) {
      const { comments, pagination } = response.data;
      
      const mappedData: PaginatedResponse<Comment> = {
        items: comments || [],
        page: pagination?.currentPage || 1,
        totalPages: pagination?.totalPages || 1,
        totalItems: pagination?.totalItems || 0,
        hasNext: pagination ? pagination.currentPage < pagination.totalPages : false,
        hasPrev: pagination ? pagination.currentPage > 1 : false,
      };

      return { ...response, data: mappedData };
    }

    return response;
  },

  // Create comment (Root)
  createComment: async (documentId: string, content: string): Promise<ApiResponse<{ comment: Comment }>> => {
    return apiRequest(
      'POST', 
      `/comments/document/${documentId}`,
      { content }
    );
  },

  // Reply to comment
  replyToComment: async (documentId: string, parentId: string, content: string): Promise<ApiResponse<{ comment: Comment }>> => {
    return apiRequest(
      'POST', 
      `/comments/document/${documentId}`,
      { content, parentId }
    );
  },

  // Get replies
  getCommentReplies: async (commentId: string, page = 1, limit = 5): Promise<ApiResponse<{ replies: Comment[] }>> => {
    return apiRequest(
      'GET', 
      `/comments/${commentId}/replies`, 
      null, 
      { params: { page, limit } }
    );
  },

  // Update
  updateComment: async (commentId: string, content: string): Promise<ApiResponse<{ comment: Comment }>> => {
    return apiRequest('PUT', `/comments/${commentId}`, { content });
  },

  // Delete
  deleteComment: async (commentId: string): Promise<ApiResponse<void>> => {
    return apiRequest('DELETE', `/comments/${commentId}`);
  },

  // Like
  toggleCommentLike: async (commentId: string): Promise<ApiResponse<{ isLiked: boolean; likeCount: number }>> => {
    return apiRequest('POST', `/comments/${commentId}/like`);
  },

  // Get user's comments
  getUserComments: async (
    userId?: string, 
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<Comment>>> => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    const url = query ? `comments/user?${query}` : 'comments/user';
    
    return apiRequest('GET', url);
  },

  // Report comment
  reportComment: async (commentId: string, reason: string, description?: string): Promise<ApiResponse> => {
    return apiRequest('POST', `comments/${commentId}/report`, {
      reason,
      description
    });
  },

  // Get comment by ID
  getCommentById: async (commentId: string): Promise<ApiResponse<Comment>> => {
    return apiRequest('GET', `comments/${commentId}`);
  },

  // Search comments
  searchComments: async (
    query: string, 
    documentId?: string,
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<Comment>>> => {
    const params = new URLSearchParams();
    params.append('search', query);
    if (documentId) params.append('documentId', documentId);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const queryString = params.toString();
    return apiRequest('GET', `comments/search?${queryString}`);
  }
};