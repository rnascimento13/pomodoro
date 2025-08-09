import React from 'react';
import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate';
import './UpdateNotification.css';

/**
 * UpdateNotification component shows when app updates are available
 * Provides options to update now or dismiss the notification
 */
const UpdateNotification: React.FC = () => {
  const { 
    isUpdateAvailable, 
    isUpdating, 
    updateError, 
    applyUpdate, 
    dismissUpdate, 
    clearUpdateError 
  } = useServiceWorkerUpdate();

  // Show error state
  if (updateError) {
    return (
      <div className="update-notification update-notification--error" role="alert">
        <div className="update-notification__content">
          <span className="update-notification__icon">❌</span>
          <div className="update-notification__text">
            <strong>Update failed</strong>
            <p>{updateError}</p>
          </div>
          <div className="update-notification__actions">
            <button
              className="update-notification__button update-notification__button--primary"
              onClick={applyUpdate}
              aria-label="Retry app update"
            >
              Retry
            </button>
            <button
              className="update-notification__button update-notification__button--secondary"
              onClick={clearUpdateError}
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show updating state
  if (isUpdating) {
    return (
      <div className="update-notification update-notification--updating" role="alert">
        <div className="update-notification__content">
          <span className="update-notification__icon update-notification__spinner">🔄</span>
          <div className="update-notification__text">
            <strong>Updating app...</strong>
            <p>Please wait while the app updates to the latest version.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show update available
  if (isUpdateAvailable) {
    return (
      <div className="update-notification" role="alert" aria-live="polite">
        <div className="update-notification__content">
          <span className="update-notification__icon">🔄</span>
          <div className="update-notification__text">
            <strong>New version available!</strong>
            <p>A new version of the app is ready. Update now for the latest features and improvements.</p>
          </div>
          <div className="update-notification__actions">
            <button
              className="update-notification__button update-notification__button--primary"
              onClick={applyUpdate}
              aria-label="Update app to new version"
            >
              Update Now
            </button>
            <button
              className="update-notification__button update-notification__button--secondary"
              onClick={dismissUpdate}
              aria-label="Dismiss update notification"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default UpdateNotification;