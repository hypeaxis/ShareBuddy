/**
 * Authentication API services for ShareBuddy
 */

import { apiRequest } from './api';
import { ApiResponse, User, LoginForm, RegisterForm, UpdatePasswordForm } from '../types';

export const authService = {
  // User registration
  register: async (data: RegisterForm): Promise<ApiResponse<{ user: User; token: string }>> => {
    return apiRequest('POST', 'auth/register', data);
  },

  // User login
  login: async (data: LoginForm): Promise<ApiResponse<{ user: User; token: string }>> => {
    return apiRequest('POST', 'auth/login', data);
  },

  // Logout user
  logout: async (): Promise<ApiResponse> => {
    return apiRequest('POST', 'auth/logout');
  },

  // Get current user profile
  getProfile: async (): Promise<ApiResponse<User>> => {
    return apiRequest('GET', 'auth/me');
  },

  // Update user profile
  updateProfile: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    return apiRequest('PUT', 'auth/update-profile', data);
  },

  // Update password
  updatePassword: async (data: UpdatePasswordForm): Promise<ApiResponse> => {
    return apiRequest('PUT', 'auth/change-password', data);
  },

  // Upload avatar
  uploadAvatar: async (file: File): Promise<ApiResponse<{ avatarUrl: string }>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return apiRequest('POST', 'users/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Request password reset
  requestPasswordReset: async (email: string): Promise<ApiResponse> => {
    return apiRequest('POST', 'auth/forgot-password', { email });
  },

  // Reset password with token
  resetPassword: async (token: string, newPassword: string): Promise<ApiResponse> => {
    return apiRequest('POST', 'auth/reset-password', { token, newPassword });
  },

  // Verify email
  verifyEmail: async (token: string): Promise<ApiResponse> => {
    return apiRequest('POST', 'auth/verify-email', { token });
  },

  // Resend verification email
  resendVerification: async (): Promise<ApiResponse> => {
    return apiRequest('POST', 'auth/resend-verification');
  }
};

// Helper functions for token management
export const tokenService = {
  setToken: (token: string) => {
    localStorage.setItem('sharebuddy_token', token);
  },

  getToken: (): string | null => {
    return localStorage.getItem('sharebuddy_token');
  },

  removeToken: () => {
    localStorage.removeItem('sharebuddy_token');
  },

  setUser: (user: User) => {
    localStorage.setItem('sharebuddy_user', JSON.stringify(user));
  },

  getUser: (): User | null => {
    const userStr = localStorage.getItem('sharebuddy_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  removeUser: () => {
    localStorage.removeItem('sharebuddy_user');
  },

  clearAll: () => {
    localStorage.removeItem('sharebuddy_token');
    localStorage.removeItem('sharebuddy_user');
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('sharebuddy_token');
    const user = localStorage.getItem('sharebuddy_user');
    return !!(token && user);
  }
};