import React, { useEffect, useState } from 'react';
import { SessionType } from '../types';
import './CompletionModal.css';

interface CompletionModalProps {
  isOpen: boolean;
  sessionType: SessionType;
  onClose: () => void;
  onStartNext?: () => void;
  autoStartEnabled?: boolean;
  autoStartDelay?: number; // seconds
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  isOpen,
  sessionType,
  onClose,
  onStartNext,
  autoStartEnabled = false,
  autoStartDelay = 5
}) => {
  const [countdown, setCountdown] = useState(autoStartDelay);
  const [isAutoStarting, setIsAutoStarting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(autoStartDelay);
      setIsAutoStarting(false);
      return;
    }

    if (!autoStartEnabled || !onStartNext) {
      return;
    }

    setIsAutoStarting(true);
    setCountdown(autoStartDelay);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onStartNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, autoStartEnabled, autoStartDelay, onStartNext]);

  const handleStartNow = () => {
    if (onStartNext) {
      onStartNext();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const getModalContent = () => {
    switch (sessionType) {
      case SessionType.WORK:
        return {
          emoji: '🎉',
          title: 'Work Session Complete!',
          message: 'Great job! You\'ve completed a focused work session.',
          nextAction: 'Time for a well-deserved break.',
          buttonText: 'Start Break',
          skipText: 'Skip Break'
        };
      case SessionType.SHORT_BREAK:
        return {
          emoji: '⚡',
          title: 'Break Time Over!',
          message: 'Hope you feel refreshed and ready to focus.',
          nextAction: 'Let\'s get back to productive work.',
          buttonText: 'Start Work',
          skipText: 'Skip Work Session'
        };
      case SessionType.LONG_BREAK:
        return {
          emoji: '🚀',
          title: 'Long Break Complete!',
          message: 'You\'ve completed a full Pomodoro cycle!',
          nextAction: 'Ready to start a new cycle of focused work?',
          buttonText: 'Start New Cycle',
          skipText: 'Take More Time'
        };
      default:
        return {
          emoji: '✅',
          title: 'Session Complete!',
          message: 'Session completed successfully.',
          nextAction: 'What would you like to do next?',
          buttonText: 'Continue',
          skipText: 'Close'
        };
    }
  };

  if (!isOpen) return null;

  const content = getModalContent();

  return (
    <div 
      className="completion-modal-overlay" 
      onClick={handleSkip}
      role="presentation"
    >
      <div 
        className={`completion-modal ${sessionType}`}
        role="dialog"
        aria-labelledby="completion-title"
        aria-describedby="completion-message"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="completion-content">
          <div className="completion-emoji" aria-hidden="true">
            {content.emoji}
          </div>
          
          <h2 id="completion-title" className="completion-title">
            {content.title}
          </h2>
          
          <p id="completion-message" className="completion-message">
            {content.message}
          </p>
          
          <p className="completion-next-action">
            {content.nextAction}
          </p>

          {isAutoStarting && countdown > 0 && (
            <div className="auto-start-countdown" aria-live="polite">
              <div className="countdown-circle">
                <svg className="countdown-svg" viewBox="0 0 36 36">
                  <path
                    className="countdown-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeOpacity="0.2"
                  />
                  <path
                    className="countdown-progress"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${(countdown / autoStartDelay) * 100}, 100`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <span className="countdown-number" aria-label={`Auto-starting in ${countdown} seconds`}>
                  {countdown}
                </span>
              </div>
              <p className="countdown-text">
                Auto-starting in {countdown} second{countdown !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        <div className="completion-actions">
          {onStartNext && (
            <button
              className="completion-button primary"
              onClick={handleStartNow}
              type="button"
              aria-label={`${content.buttonText} now`}
            >
              {isAutoStarting ? 'Start Now' : content.buttonText}
            </button>
          )}
          
          <button
            className="completion-button secondary"
            onClick={handleSkip}
            type="button"
            aria-label={content.skipText}
          >
            {content.skipText}
          </button>
        </div>

        <button
          className="completion-close"
          onClick={handleSkip}
          type="button"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};