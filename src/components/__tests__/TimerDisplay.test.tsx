import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimerDisplay } from '../TimerDisplay';
import { SessionType } from '../../types';

// Mock formatTime function
const mockFormatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

describe('TimerDisplay', () => {
  const defaultProps = {
    timeRemaining: 1500, // 25 minutes in seconds
    totalTime: 1500,
    isRunning: false,
    sessionType: SessionType.WORK,
    formatTime: mockFormatTime
  };

  it('renders timer display with correct time format', () => {
    render(<TimerDisplay {...defaultProps} />);
    
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('Work Session')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('shows running status when timer is active', () => {
    render(<TimerDisplay {...defaultProps} isRunning={true} />);
    
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('displays correct session type for short break', () => {
    render(
      <TimerDisplay 
        {...defaultProps} 
        sessionType={SessionType.SHORT_BREAK}
        timeRemaining={300}
        totalTime={300}
      />
    );
    
    expect(screen.getByText('Short Break')).toBeInTheDocument();
    expect(screen.getByText('05:00')).toBeInTheDocument();
  });

  it('displays correct session type for long break', () => {
    render(
      <TimerDisplay 
        {...defaultProps} 
        sessionType={SessionType.LONG_BREAK}
        timeRemaining={900}
        totalTime={900}
      />
    );
    
    expect(screen.getByText('Long Break')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
  });

  it('applies correct data attribute for session type', () => {
    const { container } = render(<TimerDisplay {...defaultProps} />);
    const timerDisplay = container.querySelector('.timer-display');
    
    expect(timerDisplay).toHaveAttribute('data-session-type', 'work');
  });

  it('renders SVG progress ring', () => {
    const { container } = render(<TimerDisplay {...defaultProps} />);
    
    const svg = container.querySelector('.progress-ring');
    expect(svg).toBeInTheDocument();
    expect(svg?.tagName).toBe('svg');
  });

  it('calculates progress correctly', () => {
    // 50% progress (750 seconds remaining out of 1500 total)
    render(
      <TimerDisplay 
        {...defaultProps} 
        timeRemaining={750}
        totalTime={1500}
      />
    );
    
    const progressCircle = document.querySelector('.progress-ring-progress');
    expect(progressCircle).toBeInTheDocument();
  });
});