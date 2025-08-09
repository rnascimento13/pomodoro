import React from 'react';
import { SessionType, TimerState } from '../types';
import { SESSION_NAMES, SESSION_COLORS, SESSIONS_UNTIL_LONG_BREAK } from '../utils/constants';
import './SessionInfo.css';

interface SessionInfoProps {
  timerState: TimerState;
}

export const SessionInfo: React.FC<SessionInfoProps> = ({ timerState }) => {
  const { sessionType, sessionCount, cycleCount } = timerState;

  // Calculate progress through the current cycle (1-4 sessions)
  const cycleProgress = sessionType === SessionType.WORK ? sessionCount : sessionCount - 1;

  // Generate cycle indicators (dots showing progress through 4 sessions)
  const renderCycleIndicators = () => {
    const indicators = [];
    for (let i = 1; i <= SESSIONS_UNTIL_LONG_BREAK; i++) {
      // During work sessions: completed = sessions before current, current = current session
      // During breaks: completed = sessions including the one we just finished
      let isCompleted = false;
      let isCurrent = false;
      
      if (sessionType === SessionType.WORK) {
        isCompleted = i < sessionCount;
        isCurrent = i === sessionCount;
      } else {
        // During breaks, we show completed sessions including the one we just finished
        isCompleted = i < sessionCount;
        isCurrent = false;
      }
      
      indicators.push(
        <div
          key={i}
          className={`cycle-indicator ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
          aria-label={`Session ${i} ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}`}
        />
      );
    }
    return indicators;
  };

  const sessionName = SESSION_NAMES[sessionType];
  const sessionColor = SESSION_COLORS[sessionType];

  return (
    <section 
      className="session-info" 
      style={{ '--session-color': sessionColor } as React.CSSProperties}
      aria-labelledby="session-title"

    >
      <div className="session-header">
        <h2 id="session-title" className="session-title">{sessionName}</h2>
        <div className="cycle-counter" aria-label={`Currently in cycle ${cycleCount + 1}`}>
          Cycle {cycleCount + 1}
        </div>
      </div>
      
      <div className="cycle-progress">
        <div 
          className="cycle-indicators" 
          role="progressbar" 
          aria-valuenow={cycleProgress} 
          aria-valuemax={SESSIONS_UNTIL_LONG_BREAK}
          aria-label={`Session progress: ${cycleProgress} of ${SESSIONS_UNTIL_LONG_BREAK} sessions completed in current cycle`}
        >
          {renderCycleIndicators()}
        </div>
        <div className="progress-text" aria-live="polite">
          {sessionType === SessionType.WORK ? (
            `Session ${sessionCount} of ${SESSIONS_UNTIL_LONG_BREAK}`
          ) : (
            `Break after session ${sessionCount - 1}`
          )}
        </div>
      </div>

      <div className="session-status" aria-live="polite">
        {sessionType === SessionType.WORK && (
          <span className="next-break-info" aria-label={`Next session will be: ${sessionCount >= SESSIONS_UNTIL_LONG_BREAK ? 'Long Break' : 'Short Break'}`}>
            Next: {sessionCount >= SESSIONS_UNTIL_LONG_BREAK ? 'Long Break' : 'Short Break'}
          </span>
        )}
        {sessionType !== SessionType.WORK && (
          <span className="next-session-info" aria-label="Next session will be: Work Session">
            Next: Work Session
          </span>
        )}
      </div>
    </section>
  );
};