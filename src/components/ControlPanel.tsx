import React, { useState } from 'react';
import { TimerState, SessionType } from '../types';
import './ControlPanel.css';

export interface ControlPanelProps {
  timerState: TimerState;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  timerState,
  onStart,
  onPause,
  onReset,
  onSkip
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handlePlayPause = () => {
    if (timerState.isRunning) {
      onPause();
    } else {
      onStart();
    }
  };

  const handleReset = () => {
    // Show confirmation dialog if timer is running or paused (active session)
    if (timerState.isRunning || timerState.isPaused) {
      setShowResetConfirm(true);
    } else {
      onReset();
    }
  };

  const confirmReset = () => {
    onReset();
    setShowResetConfirm(false);
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
  };

  const handleSkip = () => {
    onSkip();
  };

  const getPlayPauseIcon = () => {
    if (timerState.isRunning) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="control-icon">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      );
    } else {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="control-icon">
          <path d="M8 5v14l11-7z"/>
        </svg>
      );
    }
  };

  const getPlayPauseLabel = () => {
    if (timerState.isRunning) {
      return 'Pause';
    } else if (timerState.isPaused) {
      return 'Resume';
    } else {
      return 'Start';
    }
  };

  const shouldShowSkip = () => {
    // Show skip button only during break sessions
    return timerState.sessionType === SessionType.SHORT_BREAK || 
           timerState.sessionType === SessionType.LONG_BREAK;
  };

  return (
    <>
      <div 
        className="control-panel" 
        data-session-type={timerState.sessionType}
        role="group"
        aria-label="Timer controls"
      >
        <button
          className="control-button control-button--primary"
          onClick={handlePlayPause}
          aria-label={`${getPlayPauseLabel()} timer`}
          aria-describedby="timer-status"
          type="button"
        >
          {getPlayPauseIcon()}
          <span className="control-label">{getPlayPauseLabel()}</span>
        </button>

        <button
          className="control-button control-button--secondary"
          onClick={handleReset}
          aria-label="Reset timer to beginning"
          aria-describedby="reset-description"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="control-icon" aria-hidden="true">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          <span className="control-label">Reset</span>
        </button>

        {shouldShowSkip() && (
          <button
            className="control-button control-button--tertiary"
            onClick={handleSkip}
            aria-label="Skip current break session"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="control-icon" aria-hidden="true">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
            <span className="control-label">Skip</span>
          </button>
        )}
      </div>

      {/* Hidden descriptions for screen readers */}
      <div id="timer-status" className="sr-only">
        Current timer status: {timerState.isRunning ? 'running' : timerState.isPaused ? 'paused' : 'stopped'}
      </div>
      <div id="reset-description" className="sr-only">
        Resets the current session and returns timer to initial state
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div 
          className="confirmation-overlay" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="reset-dialog-title"
          aria-describedby="reset-dialog-description"
        >
          <div className="confirmation-dialog">
            <h3 id="reset-dialog-title">Reset Timer?</h3>
            <p id="reset-dialog-description">Are you sure you want to reset the current session? Your progress will be lost.</p>
            <div className="confirmation-buttons">
              <button
                className="confirmation-button confirmation-button--cancel"
                onClick={cancelReset}
                autoFocus
                type="button"
              >
                Cancel
              </button>
              <button
                className="confirmation-button confirmation-button--confirm"
                onClick={confirmReset}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};