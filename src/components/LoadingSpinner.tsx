import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = '#e53e3e',
  className = ''
}) => {
  return (
    <div 
      className={`loading-spinner ${size} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div 
        className="spinner"
        style={{ borderTopColor: color }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;