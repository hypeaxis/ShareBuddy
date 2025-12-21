/**
 * Main App component for ShareBuddy - Document sharing platform
 * Features: Dark theme, routing, authentication, responsive layout
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { initializeAuth } from './store/slices/authSlice';
import { initializeTheme } from './store/slices/uiSlice';

// Components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import LoadingSpinner from './components/common/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import WelcomePage from './pages/WelcomePage';
import MyFeedPage from './pages/MyFeedPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import OAuthSuccessPage from './pages/auth/OAuthSuccessPage';
import CompleteOAuthProfilePage from './pages/auth/CompleteOAuthProfilePage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DocumentDetailPage from './pages/documents/DocumentDetailPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import UploadPage from './pages/documents/UploadPage';
import ProfilePage from './pages/user/ProfilePage';
import VerifiedAuthorProgressPage from './pages/VerifiedAuthorProgressPage';
import PurchaseCreditsPage from './pages/PurchaseCreditsPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import BookmarkedDocumentsPage from './pages/BookmarkedDocumentsPage';

// Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './styles/global.css';

// App Content Component
const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector((state) => state.ui);
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Initialize theme and auth on app start
    dispatch(initializeTheme());
    dispatch(initializeAuth());
  }, [dispatch]);

  // Apply theme to body
  useEffect(() => {
    document.body.className = theme;
    document.body.setAttribute('data-bs-theme', theme);
  }, [theme]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`app ${theme}`}>
      <Router>
        <Navbar />
        <div className="app-content">
          <Sidebar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/" 
                element={isAuthenticated ? <MyFeedPage /> : <WelcomePage />} 
              />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/documents/:id" element={<DocumentDetailPage />} />
              <Route path="/bookmarked" element={<BookmarkedDocumentsPage />} />
              
              {/* Auth Routes */}
              <Route 
                path="/login" 
                element={
                  isAuthenticated ? <Navigate to="/profile" replace /> : <LoginPage />
                } 
              />
              <Route 
                path="/register" 
                element={
                  isAuthenticated ? <Navigate to="/profile" replace /> : <RegisterPage />
                } 
              />
              <Route path="/oauth-success" element={<OAuthSuccessPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/complete-oauth-profile" element={<CompleteOAuthProfilePage />} />
                <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/:userId" element={<ProfilePage />} />
                <Route path="/verified-author-progress" element={<VerifiedAuthorProgressPage />} />
                <Route path="/purchase-credits" element={<PurchaseCreditsPage />} />
                <Route path="/payment-history" element={<PaymentHistoryPage />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
      
      {/* Toast notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme}
      />
    </div>
  );
};

// Main App Component with Redux Provider
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
