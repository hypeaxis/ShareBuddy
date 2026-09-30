/**
 * Loading Spinner Component for ShareBuddy
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  message = 'Đang tải...' 
}) => {
  const getSpinnerSize = () => {
    switch (size) {
      case 'sm': return '1rem';
      case 'lg': return '3rem';
      default: return '2rem';
    }
  };

  return (
    <div className="loading-spinner">
      <div className="text-center">
        <div 
          className="spinner-border text-primary" 
          role="status"
          style={{ width: getSpinnerSize(), height: getSpinnerSize() }}
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        {message && (
          <div className="mt-2 text-muted">
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;