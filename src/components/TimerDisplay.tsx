import React from 'react';
import { SessionType } from '../types';
import { SESSION_COLORS, SESSION_NAMES } from '../utils/constants';
import './TimerDisplay.css';

interface TimerDisplayProps {
  timeRemaining: number; // in seconds
  totalTime: number; // in seconds
  isRunning: boolean;
  sessionType: SessionType;
  formatTime: (seconds: number) => string;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timeRemaining,
  totalTime,
  isRunning,
  sessionType,
  formatTime
}) => {
  // Calculate progress percentage (0-100)
  const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;
  
  // Calculate stroke dash array for circular progress
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  const sessionColor = SESSION_COLORS[sessionType];
  const sessionName = SESSION_NAMES[sessionType];

  return (
    <div 
      className="timer-display" 
      data-session-type={sessionType}
      role="timer"
      aria-label={`${sessionName} timer`}
    >
      <div className="timer-container">
        {/* Circular Progress Ring */}
        <svg 
          className="progress-ring" 
          width="280" 
          height="280"
          viewBox="0 0 280 280"
          role="img"
          aria-label={`Timer progress: ${Math.round(progress)}% complete`}
        >
          <title>Timer Progress Ring</title>
          {/* Background circle */}
          <circle
            className="progress-ring-background"
            cx="140"
            cy="140"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="8"
          />
          
          {/* Progress circle */}
          <circle
            className={`progress-ring-progress ${isRunning ? 'running' : ''}`}
            cx="140"
            cy="140"
            r={radius}
            fill="transparent"
            stroke={sessionColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 140 140)"
            style={{
              transition: isRunning ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.3s ease'
            }}
          />
        </svg>
        
        {/* Timer Content */}
        <div className="timer-content">
          <div 
            className="session-type" 
            style={{ color: sessionColor }}
            aria-label={`Current session type: ${sessionName}`}
          >
            {sessionName}
          </div>
          
          <div 
            className="time-display"
            style={{ color: sessionColor }}
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Time remaining: ${formatTime(timeRemaining)}`}
          >
            {formatTime(timeRemaining)}
          </div>
          
          <div 
            className="timer-status"
            aria-live="polite"
            aria-label={`Timer status: ${isRunning ? 'Running' : 'Paused'}`}
          >
            {isRunning ? 'Running' : 'Paused'}
          </div>
        </div>
      </div>
    </div>
  );
};