import { apiRequest } from './api';
import { ApiResponse, Rating, DocumentRatingsResponse, RatingStatistics } from '../types';

export const ratingService = {
  // FIXED: Return type matches backend structure (ratings array, not items)
  getDocumentRatings: async (documentId: string, page = 1, limit = 10) => {
    return apiRequest<DocumentRatingsResponse>('GET', `/ratings/document/${documentId}`, null, {
      params: { page, limit }
    });
  },

  // FIXED: Added getRatingStats (fetching from same endpoint or specialized one if you created it)
  // Since your backend getDocumentRatings returns statistics, we can reuse it or use the /stats endpoint
  getRatingStats: async (documentId: string) => {
    // The backend route /api/ratings/document/:id/stats returns the same structure
    return apiRequest<DocumentRatingsResponse>('GET', `/ratings/document/${documentId}/stats`);
  },

  // FIXED: Return type is an object containing the rating object { rating: Rating }
  getUserRating: async (documentId: string) => {
    return apiRequest<{ rating: Rating }>('GET', `/ratings/document/${documentId}/user-rating`);
  },

  // FIXED: Added rateDocument method (Combined add/update logic matches backend)
  rateDocument: async (documentId: string, rating: number, comment?: string) => {
    return apiRequest<{ rating: Rating }>('POST', `/ratings/document/${documentId}`, {
      rating,
      comment // Note: Backend ignores this for DB insert/update on ratings table, but might process it if you add logic later
    });
  },

  // Helper aliases if you want to keep old naming conventions, but mapped to rateDocument
  addRating: async (documentId: string, rating: number, comment?: string) => {
    return ratingService.rateDocument(documentId, rating, comment);
  },

  updateRating: async (ratingId: string, rating: number, comment?: string) => {
    // Note: The backend route is /ratings/document/:docId. 
    // If you only have ratingId, you might need to adjust. 
    // But usually frontend has docId. 
    // For now, we assume this is handled by rateDocument
    throw new Error("Use rateDocument with documentId instead");
  },

  deleteRating: async (documentId: string) => {
    return apiRequest('DELETE', `/ratings/document/${documentId}`);
  },

  toggleRatingLike: async (ratingId: string) => {
    return apiRequest<{ isLiked: boolean; likeCount: number }>('POST', `/ratings/${ratingId}/like`);
  }
};