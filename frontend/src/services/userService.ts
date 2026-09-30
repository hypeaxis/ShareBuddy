/**
 * User API services for ShareBuddy
 */

import { apiRequest, uploadFile } from './api';
import { ApiResponse, User, PaginatedResponse } from '../types';

export interface UserSettings {
  emailNotifications: boolean;
  profilePublic: boolean;
  allowFollowing: boolean;
}

export const userService = {

  // Get user profile by ID
  getUserProfile: async (userId: string): Promise<ApiResponse<User>> => {
    return apiRequest('GET', `users/profile/${userId}`);
  },

  // Get user by username
  getUserByUsername: async (username: string): Promise<ApiResponse<User>> => {
    return apiRequest('GET', `users/username/${username}`);
  },

  // Search users
  searchUsers: async (
    query: string, 
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<User>>> => {
    const params = new URLSearchParams();
    params.append('search', query);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const queryString = params.toString();
    return apiRequest('GET', `users/search?${queryString}`);
  },

  // Follow user
  followUser: async (userId: string): Promise<ApiResponse> => {
    return apiRequest('POST', `users/follow/${userId}`);
  },

  // Unfollow user
  unfollowUser: async (userId: string): Promise<ApiResponse> => {
    return apiRequest('DELETE', `users/follow/${userId}`);
  },

  // Get user's followers
  getUserFollowers: async (
    userId: string, 
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<User>>> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    const url = query ? `users/followers/${userId}?${query}` : `users/followers/${userId}`;
    
    return apiRequest('GET', url);
  },

  // Get user's following
  getUserFollowing: async (
    userId: string, 
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<User>>> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    const url = query ? `users/following/${userId}?${query}` : `users/following/${userId}`;
    
    return apiRequest('GET', url);
  },

  // Get user's documents
  getUserDocuments: async (
    userId: string, 
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<{
    documents: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    const url = query ? `users/documents/${userId}?${query}` : `users/documents/${userId}`;
    
    return apiRequest('GET', url);
  },

  // Get user statistics
  getUserStats: async (userId: string): Promise<ApiResponse<{
    documentsCount: number;
    downloadsCount: number;
    ratingsCount: number;
    commentsCount: number;
    followersCount: number;
    followingCount: number;
    creditsEarned: number;
    creditsSpent: number;
    averageRating: number;
  }>> => {
    return apiRequest('GET', `users/stats/${userId}`);
  },

  // Update user profile
  updateProfile: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    return apiRequest('PUT', 'users/me', data);
  },

  // Upload user avatar
  uploadAvatar: async (
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ avatarUrl: string }>> => {
    return uploadFile('users/upload-avatar', file, {}, onProgress);
  },

  // Get user's credit history
  getCreditHistory: async (
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<any>>> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    const url = query ? `users/credits/history?${query}` : 'users/credits/history';
    
    return apiRequest('GET', url);
  },

  // Get user's notifications
  getNotifications: async (
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<any>>> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    const url = query ? `users/notifications?${query}` : 'users/notifications';
    
    return apiRequest('GET', url);
  },

  // Mark notification as read
  markNotificationAsRead: async (notificationId: string): Promise<ApiResponse> => {
    return apiRequest('PUT', `users/notifications/${notificationId}/read`);
  },

  // Mark all notifications as read
  markAllNotificationsAsRead: async (): Promise<ApiResponse> => {
    return apiRequest('PUT', 'users/notifications/read-all');
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<ApiResponse> => {
    return apiRequest('DELETE', `users/notifications/${notificationId}`);
  },

  // Get unread notifications count
  getUnreadNotificationsCount: async (): Promise<ApiResponse<{ count: number }>> => {
    return apiRequest('GET', 'users/notifications/unread-count');
  },

  // Check if following user
  isFollowingUser: async (userId: string): Promise<ApiResponse<{ isFollowing: boolean }>> => {
    return apiRequest('GET', `users/${userId}/is-following`);
  },

  // Get recommended users to follow
  getRecommendedUsers: async (limit?: number): Promise<ApiResponse<User[]>> => {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest('GET', `users/recommendations${params}`);
  },

  // Report user
  reportUser: async (userId: string, reason: string, description?: string): Promise<ApiResponse> => {
    return apiRequest('POST', `users/${userId}/report`, {
      reason,
      description
    });
  },

  // Get top contributors
  getTopContributors: async (limit?: number): Promise<ApiResponse<User[]>> => {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest('GET', `users/top-contributors${params}`);
  },

  // Get user settings
  getUserSettings: async () => {
    return apiRequest('GET', 'users/settings');
  },

  // Update user settings
  updateUserSettings: async (settings: {
    email_notifications?: boolean;
    is_public_profile?: boolean;
    allow_follow_activity?: boolean;
  }) => {
    return apiRequest('PUT', 'users/settings', settings);
  },
  
  // Update email notifications
  updateEmailNotifications: async (enabled: boolean) => {
    return apiRequest('PATCH', '/settings/email-notifications', { enabled });
  },

  // Update profile visibility
  updateProfileVisibility: async (isPublic: boolean) => {
    return apiRequest('PATCH', '/settings/profile-visibility', { isPublic });
  },

  // Update allow following
  updateAllowFollowing: async (allowed: boolean) => {
    return apiRequest('PATCH', '/settings/allow-following', { allowed });
  },

  // Update all settings at once
  updateAllSettings: async (settings: Partial<UserSettings>) => {
    return apiRequest('PUT', '/settings', settings);
  }
};