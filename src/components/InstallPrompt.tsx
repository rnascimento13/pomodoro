import React, { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import './InstallPrompt.css';

interface InstallPromptProps {
  className?: string;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ className = '' }) => {
  const { isInstallable, isInstalled, showPrompt, installApp, dismissPrompt } = useInstallPrompt();
  const [isInstalling, setIsInstalling] = useState(false);

  // Don't show if already installed or not installable
  if (isInstalled || !isInstallable || !showPrompt) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installApp();
      if (success) {
        // Installation successful - component will unmount due to state change
        console.log('App installed successfully');
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    dismissPrompt();
  };

  return (
    <div className={`install-prompt ${className}`} role="dialog" aria-labelledby="install-title">
      <div className="install-prompt-content">
        <div className="install-prompt-header">
          <div className="install-prompt-icon">
            📱
          </div>
          <div className="install-prompt-text">
            <h3 id="install-title">Install Pomodoro Timer</h3>
            <p>Add to your home screen for quick access and a better experience!</p>
          </div>
          <button
            className="install-prompt-close"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            disabled={isInstalling}
          >
            ✕
          </button>
        </div>
        
        <div className="install-prompt-benefits">
          <ul>
            <li>🚀 Faster loading</li>
            <li>📱 Works offline</li>
            <li>🔔 Push notifications</li>
            <li>🎯 Distraction-free</li>
          </ul>
        </div>

        <div className="install-prompt-actions">
          <button
            className="install-button"
            onClick={handleInstall}
            disabled={isInstalling}
            aria-describedby="install-description"
          >
            {isInstalling ? (
              <>
                <span className="install-spinner" aria-hidden="true"></span>
                Installing...
              </>
            ) : (
              <>
                <span className="install-icon" aria-hidden="true">⬇️</span>
                Install App
              </>
            )}
          </button>
          
          <button
            className="dismiss-button"
            onClick={handleDismiss}
            disabled={isInstalling}
          >
            Maybe Later
          </button>
        </div>
        
        <p id="install-description" className="install-prompt-description">
          This will add the Pomodoro Timer to your device for easy access.
        </p>
      </div>
    </div>
  );
};