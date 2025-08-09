import React from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  animation = 'pulse'
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`skeleton-loader ${variant} ${animation} ${className}`}
      style={style}
      aria-label="Loading content"
      role="status"
    />
  );
};

// Predefined skeleton components for common use cases
export const TimerSkeleton: React.FC = () => (
  <div className="timer-skeleton">
    <SkeletonLoader variant="circular" width={200} height={200} />
    <SkeletonLoader variant="text" width="60%" height={24} />
  </div>
);

export const StatsSkeleton: React.FC = () => (
  <div className="stats-skeleton">
    <SkeletonLoader variant="text" width="80%" height={20} />
    <SkeletonLoader variant="rectangular" width="100%" height={60} />
    <SkeletonLoader variant="text" width="60%" height={16} />
    <SkeletonLoader variant="text" width="40%" height={16} />
  </div>
);

export const SettingsSkeleton: React.FC = () => (
  <div className="settings-skeleton">
    <SkeletonLoader variant="text" width="70%" height={20} />
    <SkeletonLoader variant="rectangular" width="100%" height={40} />
    <SkeletonLoader variant="text" width="50%" height={16} />
    <SkeletonLoader variant="rectangular" width="100%" height={40} />
  </div>
);

export default SkeletonLoader;