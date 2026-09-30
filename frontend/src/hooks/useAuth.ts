/**
 * Authentication hook for ShareBuddy
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUser, 
  updateProfile,
  clearError 
} from '../store/slices/authSlice';
import { LoginForm, RegisterForm, User } from '../types';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const { 
    user, 
    token, 
    isLoading, 
    error, 
    isAuthenticated 
  } = authState;

  const login = useCallback(
    async (credentials: LoginForm) => {
      const result = await dispatch(loginUser(credentials));
      return result;
    },
    [dispatch]
  );

  const register = useCallback(
    async (userData: RegisterForm) => {
      const result = await dispatch(registerUser(userData));
      return result;
    },
    [dispatch]
  );

  const logout = useCallback(
    async () => {
      const result = await dispatch(logoutUser());
      return result;
    },
    [dispatch]
  );

  const refreshUser = useCallback(
    async () => {
      const result = await dispatch(getCurrentUser());
      return result;
    },
    [dispatch]
  );

  const updateUserProfile = useCallback(
    async (userData: Partial<User>) => {
      const result = await dispatch(updateProfile(userData));
      return result;
    },
    [dispatch]
  );

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // State
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    
    // Actions
    login,
    register,
    logout,
    refreshUser,
    updateUserProfile,
    clearAuthError,
  };
};