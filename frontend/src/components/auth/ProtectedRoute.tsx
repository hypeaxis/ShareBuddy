/**
 * Protected Route Component for ShareBuddy
 * Requires authentication and password setup for OAuth users
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner message="Đang xác thực..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if OAuth user needs to complete profile (set password)
  // Only redirect if not already on the complete-oauth-profile page
  if (user && user.hasPassword === false && location.pathname !== '/complete-oauth-profile') {
    console.log('⚠️ User needs to set password, redirecting to complete-oauth-profile');
    return <Navigate to="/complete-oauth-profile" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;