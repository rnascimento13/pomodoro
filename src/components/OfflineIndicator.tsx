import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import './OfflineIndicator.css';

/**
 * OfflineIndicator component displays the current network connection status
 * Shows a banner when the app is offline
 */
const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="offline-indicator" role="alert" aria-live="polite">
      <div className="offline-indicator__content">
        <span className="offline-indicator__icon">📡</span>
        <span className="offline-indicator__text">
          You're offline. The app will continue to work with cached data.
        </span>
      </div>
    </div>
  );
};

export default OfflineIndicator;