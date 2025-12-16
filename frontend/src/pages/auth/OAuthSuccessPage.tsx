/**
 * OAuth Success Page - Handles redirect after successful OAuth authentication
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';

const OAuthSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser, user, isLoading } = useAuth();
  const [error, setError] = useState<string>('');
  const [processingAuth, setProcessingAuth] = useState(true);

  useEffect(() => {
    const processOAuth = async () => {
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 OAuth Success Page - Processing OAuth callback');
        console.log('Token received:', token ? 'Yes' : 'No');
        console.log('Error param:', errorParam);
      }

      if (errorParam) {
        console.error('❌ OAuth error parameter:', errorParam);
        setError('Đăng nhập thất bại. Vui lòng thử lại.');
        setProcessingAuth(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!token) {
        console.error('❌ No token received from OAuth callback');
        setError('Token không hợp lệ');
        setProcessingAuth(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Save token to localStorage
        if (process.env.NODE_ENV === 'development') {
          console.log('💾 Saving OAuth token to localStorage');
        }
        localStorage.setItem('sharebuddy_token', token);
        
        // Add a small delay to ensure localStorage is written
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Refresh user data with new token
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Fetching user data from server...');
        }
        const result = await refreshUser();
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📦 User fetch result:', result);
        }
        
        // Check if user fetch was successful
        if (result.type === 'auth/getCurrentUser/fulfilled') {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ User data loaded successfully');
            console.log('🚀 Redirecting to dashboard...');
          }
          setProcessingAuth(false);
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 500);
        } else {
          console.error('❌ Failed to fetch user data:', result);
          throw new Error('Failed to fetch user data');
        }
      } catch (err: any) {
        console.error('❌ OAuth processing error:', err);
        console.error('Error details:', err.message || err);
        setError('Không thể tải thông tin người dùng. Vui lòng thử đăng nhập lại.');
        setProcessingAuth(false);
        
        // Clear the invalid token
        localStorage.removeItem('sharebuddy_token');
        
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    processOAuth();
  }, [searchParams, navigate, refreshUser]);

  return (
    <Container className="py-5" style={{ marginTop: '80px' }}>
      <div className="text-center">
        {error ? (
          <Alert variant="danger">
            <Alert.Heading>Lỗi đăng nhập</Alert.Heading>
            <p>{error}</p>
          </Alert>
        ) : (
          <>
            <Spinner animation="border" variant="primary" className="mb-3" />
            <h4>Đang xử lý đăng nhập...</h4>
            <p className="text-muted">
              {processingAuth || isLoading 
                ? 'Đang tải thông tin người dùng...' 
                : 'Chuyển hướng đến dashboard...'}
            </p>
          </>
        )}
      </div>
    </Container>
  );
};

export default OAuthSuccessPage;
