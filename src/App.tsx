import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { 
  TimerDisplay, 
  ControlPanel, 
  SessionInfo, 
  ErrorBoundary,
  LoadingSpinner,
  SkeletonLoader,
  PWATestSuite
} from './components';
import { useTimer } from './hooks/useTimer';
import { useErrorHandler } from './hooks/useErrorHandler';
import { SessionType } from './types';
import { storage, StorageError } from './utils/storage';
import { notificationService } from './services/NotificationService';
import { settingsService } from './services/SettingsService';
import PerformanceService from './services/PerformanceService';
import BackgroundSyncService from './services/BackgroundSyncService';
import './App.css';

// Lazy load non-critical components
const Settings = lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const Statistics = lazy(() => import('./components/Statistics').then(module => ({ default: module.Statistics })));
const InstallPrompt = lazy(() => import('./components/InstallPrompt').then(module => ({ default: module.InstallPrompt })));
const OfflineIndicator = lazy(() => import('./components/OfflineIndicator'));
const UpdateNotification = lazy(() => import('./components/UpdateNotification'));
const CompletionModal = lazy(() => import('./components/CompletionModal').then(module => ({ default: module.CompletionModal })));

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isPWATestOpen, setIsPWATestOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<StorageError | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [completionModal, setCompletionModal] = useState<{
    isOpen: boolean;
    sessionType: SessionType;
  }>({ isOpen: false, sessionType: SessionType.WORK });

  const { errorState, setError, clearError } = useErrorHandler();

  // Handle session completion with error handling
  const handleSessionComplete = useCallback(async (sessionType: SessionType) => {
    try {
      // Show browser/audio notifications
      await notificationService.showSessionCompleteNotification(sessionType);
      
      // Show visual completion modal
      setCompletionModal({
        isOpen: true,
        sessionType
      });
    } catch (error) {
      console.error('Error showing session completion notification:', error);
      setNotificationError('Failed to show notification. Please check your browser settings.');
      
      // Still show the completion modal even if notifications fail
      setCompletionModal({
        isOpen: true,
        sessionType
      });
      
      // Clear notification error after 5 seconds
      setTimeout(() => setNotificationError(null), 5000);
    }
  }, []);

  const { timerState, start, pause, reset, skip, formatTime } = useTimer(
    undefined, // Use default settings
    handleSessionComplete
  );

  // Handle app shortcuts from manifest
  useEffect(() => {
    const handleShortcutAction = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');
      
      if (action && isInitialized) {
        switch (action) {
          case 'start-work':
            if (!timerState.isRunning) {
              start();
            }
            break;
          case 'start-break':
            if (!timerState.isRunning) {
              // Force start a break session
              start();
            }
            break;
          case 'stats':
            setIsStatsOpen(true);
            break;
          case 'settings':
            setIsSettingsOpen(true);
            break;
        }
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleShortcutAction();
  }, [isInitialized, timerState.isRunning, start]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+T to open PWA Test Suite (developer tool)
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        setIsPWATestOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize app with error handling
  useEffect(() => {
    const initializeApp = async () => {
      const performanceService = PerformanceService.getInstance();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const backgroundSyncService = BackgroundSyncService.getInstance();
      
      try {
        setIsLoading(true);
        clearError();

        // Track app initialization performance
        const initStartTime = performance.now();

        // Set up storage error handling
        const unsubscribeStorage = storage.onError((error: StorageError) => {
          setStorageError(error);
          performanceService.captureError({
            message: `Storage error: ${error.message}`,
            stack: undefined
          });
          console.warn('Storage error:', error);
        });

        // Initialize notification service
        try {
          await performanceService.measureAsyncFunction('loadAudioFiles', async () => {
            await notificationService.loadAudioFiles();
          });
        } catch (error) {
          console.warn('Failed to load audio files:', error);
          performanceService.captureError({
            message: `Failed to load audio files: ${error}`,
            stack: error instanceof Error ? error.stack : undefined
          });
          // This is not critical, continue initialization
        }

        // Check for unsupported features and show warnings
        if (!notificationService.isNotificationSupported()) {
          console.warn('Browser notifications not supported');
          performanceService.recordMetric('feature_notification_support', 0, 'gauge');
        } else {
          performanceService.recordMetric('feature_notification_support', 1, 'gauge');
        }

        if (!notificationService.isAudioSupported()) {
          console.warn('Audio notifications not supported');
          performanceService.recordMetric('feature_audio_support', 0, 'gauge');
        } else {
          performanceService.recordMetric('feature_audio_support', 1, 'gauge');
        }

        // Track initialization completion
        const initDuration = performance.now() - initStartTime;
        performanceService.recordMetric('app_initialization', initDuration, 'timing');

        setIsInitialized(true);

        // Cleanup function
        return () => {
          unsubscribeStorage();
          performanceService.destroy();
        };
      } catch (error) {
        console.error('Failed to initialize app:', error);
        performanceService.captureError({
          message: `App initialization failed: ${error}`,
          stack: error instanceof Error ? error.stack : undefined
        });
        setError(error instanceof Error ? error : new Error('Failed to initialize application'));
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [setError, clearError]);

  // Handle critical errors
  const handleCriticalError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Critical app error:', error, errorInfo);
    
    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, { extra: errorInfo });
    }
  }, []);

  // Dismiss storage error
  const dismissStorageError = useCallback(() => {
    setStorageError(null);
  }, []);

  // Dismiss notification error
  const dismissNotificationError = useCallback(() => {
    setNotificationError(null);
  }, []);

  // Handle completion modal actions
  const handleCloseCompletionModal = useCallback(() => {
    setCompletionModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleStartNextSession = useCallback(() => {
    setCompletionModal(prev => ({ ...prev, isOpen: false }));
    start();
  }, [start]);

  // Get current settings for auto-start behavior
  const currentSettings = settingsService.getSettings();
  const shouldAutoStart = completionModal.sessionType === SessionType.WORK 
    ? currentSettings.autoStartBreaks 
    : currentSettings.autoStartWork;

  // Show loading state during initialization
  if (isLoading) {
    return (
      <div className="App">
        <div className="app-loading">
          <SkeletonLoader />
          <LoadingSpinner size="large" />
          <p>Loading Pomodoro Timer...</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (errorState.hasError) {
    return (
      <div className="App">
        <div className="app-error">
          <h2>Failed to Load Application</h2>
          <p>{errorState.errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="error-button primary"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary onError={handleCriticalError}>
      <div className="App">
        {/* Storage Error Banner */}
        {storageError && (
          <div className="error-banner storage-error" role="alert">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{storageError.message}</span>
              <button 
                onClick={dismissStorageError}
                className="error-dismiss"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Notification Error Banner */}
        {notificationError && (
          <div className="error-banner notification-error" role="alert">
            <div className="error-content">
              <span className="error-icon">🔔</span>
              <span className="error-message">{notificationError}</span>
              <button 
                onClick={dismissNotificationError}
                className="error-dismiss"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <header className="App-header" role="banner">
          <div className="header-content">
            <h1>Pomodoro Timer</h1>
            <p>Focus & Productivity</p>
            {storage.isUsingFallback() && (
              <small className="storage-warning">
                Using temporary storage - data won't persist
              </small>
            )}
          </div>
          <nav className="header-actions" role="navigation" aria-label="Main navigation">
            <button 
              className="header-button"
              onClick={() => setIsStatsOpen(true)}
              aria-label="View Statistics"
              type="button"
              disabled={!isInitialized}
            >
              <span role="img" aria-label="Statistics">📊</span>
            </button>
            <button 
              className="header-button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open Settings"
              type="button"
              disabled={!isInitialized}
            >
              <span role="img" aria-label="Settings">⚙️</span>
            </button>
          </nav>
        </header>
        
        <main className="App-main" role="main" aria-label="Pomodoro Timer">
          <ErrorBoundary fallback={
            <div className="component-error">
              <p>Session info temporarily unavailable</p>
            </div>
          }>
            <SessionInfo timerState={timerState} />
          </ErrorBoundary>
          
          <ErrorBoundary fallback={
            <div className="component-error">
              <p>Timer display temporarily unavailable</p>
              <button onClick={() => window.location.reload()}>
                Reload Timer
              </button>
            </div>
          }>
            <TimerDisplay
              timeRemaining={timerState.currentTime}
              totalTime={timerState.totalTime}
              isRunning={timerState.isRunning}
              sessionType={timerState.sessionType}
              formatTime={formatTime}
            />
          </ErrorBoundary>
          
          <ErrorBoundary fallback={
            <div className="component-error">
              <p>Timer controls temporarily unavailable</p>
            </div>
          }>
            <ControlPanel
              timerState={timerState}
              onStart={start}
              onPause={pause}
              onReset={reset}
              onSkip={skip}
            />
          </ErrorBoundary>
        </main>

        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner size="small" />}>
            <Settings 
              isOpen={isSettingsOpen} 
              onClose={() => setIsSettingsOpen(false)} 
            />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner size="small" />}>
            <Statistics 
              isOpen={isStatsOpen} 
              onClose={() => setIsStatsOpen(false)} 
            />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={null}>
            <InstallPrompt />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={null}>
            <OfflineIndicator />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={null}>
            <UpdateNotification />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner size="small" />}>
            <CompletionModal
              isOpen={completionModal.isOpen}
              sessionType={completionModal.sessionType}
              onClose={handleCloseCompletionModal}
              onStartNext={handleStartNextSession}
              autoStartEnabled={shouldAutoStart}
              autoStartDelay={5}
            />
          </Suspense>
        </ErrorBoundary>

        {/* PWA Test Suite - Developer Tool (Ctrl+Shift+T) */}
        <ErrorBoundary>
          <PWATestSuite 
            isOpen={isPWATestOpen} 
            onClose={() => setIsPWATestOpen(false)} 
          />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}

export default App;