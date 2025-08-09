import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import App from '../App';

// Mock timers for testing
jest.useFakeTimers();

describe('Session Cycle Integration', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('should complete a full Pomodoro cycle with proper session transitions', async () => {
    
    render(<App />);

    // Initial state - should show work session 1
    expect(screen.getByText('Work Session')).toBeInTheDocument();
    expect(screen.getByText('Session 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('Cycle 1')).toBeInTheDocument();
    expect(screen.getByText('Next: Short Break')).toBeInTheDocument();

    // Start the timer
    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);

    // Fast forward to complete the work session (25 minutes = 1500 seconds)
    act(() => {
      jest.advanceTimersByTime(1500 * 1000);
    });

    // Should now be in short break
    expect(screen.getByText('Short Break')).toBeInTheDocument();
    expect(screen.getByText('Break after session 1')).toBeInTheDocument();
    expect(screen.getByText('Next: Work Session')).toBeInTheDocument();

    // Start the break
    const startBreakButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startBreakButton);

    // Fast forward to complete the short break (5 minutes = 300 seconds)
    act(() => {
      jest.advanceTimersByTime(300 * 1000);
    });

    // Should now be in work session 2
    expect(screen.getByText('Work Session')).toBeInTheDocument();
    expect(screen.getByText('Session 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('Next: Short Break')).toBeInTheDocument();

    // Complete sessions 2 and 3 with their breaks
    for (let session = 2; session <= 3; session++) {
      // Start work session
      const workStartButton = screen.getByRole('button', { name: /start/i });
      fireEvent.click(workStartButton);

      // Complete work session
      act(() => {
        jest.advanceTimersByTime(1500 * 1000);
      });

      // Should be in short break
      expect(screen.getByText('Short Break')).toBeInTheDocument();
      expect(screen.getByText(`Break after session ${session}`)).toBeInTheDocument();

      // Start and complete break
      const breakStartButton = screen.getByRole('button', { name: /start/i });
      fireEvent.click(breakStartButton);

      act(() => {
        jest.advanceTimersByTime(300 * 1000);
      });
    }

    // Should now be in work session 4
    expect(screen.getByText('Work Session')).toBeInTheDocument();
    expect(screen.getByText('Session 4 of 4')).toBeInTheDocument();
    expect(screen.getByText('Next: Long Break')).toBeInTheDocument();

    // Start and complete session 4
    const session4StartButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(session4StartButton);

    act(() => {
      jest.advanceTimersByTime(1500 * 1000);
    });

    // Should now be in long break and cycle should have incremented
    expect(screen.getByText('Long Break')).toBeInTheDocument();
    expect(screen.getByText('Break after session 0')).toBeInTheDocument(); // Session count resets after long break
    expect(screen.getByText('Cycle 2')).toBeInTheDocument(); // Cycle incremented
    expect(screen.getByText('Next: Work Session')).toBeInTheDocument();

    // Start and complete long break
    const longBreakStartButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(longBreakStartButton);

    act(() => {
      jest.advanceTimersByTime(900 * 1000); // 15 minutes = 900 seconds
    });

    // Should now be back to work session 1 of cycle 2
    expect(screen.getByText('Work Session')).toBeInTheDocument();
    expect(screen.getByText('Session 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('Cycle 2')).toBeInTheDocument();
    expect(screen.getByText('Next: Short Break')).toBeInTheDocument();
  });

  it('should show correct cycle indicators throughout the cycle', () => {
    render(<App />);

    // Session 1 - first indicator should be current
    expect(screen.getByLabelText('Session 1 current')).toBeInTheDocument();
    expect(screen.getByLabelText('Session 2 pending')).toBeInTheDocument();
    expect(screen.getByLabelText('Session 3 pending')).toBeInTheDocument();
    expect(screen.getByLabelText('Session 4 pending')).toBeInTheDocument();

    // Complete session 1
    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);
    act(() => {
      jest.advanceTimersByTime(1500 * 1000);
    });

    // During break after session 1 - first should be completed
    expect(screen.getByLabelText('Session 1 completed')).toBeInTheDocument();
    expect(screen.getByLabelText('Session 2 pending')).toBeInTheDocument();
    expect(screen.getByLabelText('Session 3 pending')).toBeInTheDocument();
    expect(screen.getByLabelText('Session 4 pending')).toBeInTheDocument();

    // Complete break and start session 2
    const breakStartButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(breakStartButton);
    act(() => {
      jest.advanceTimersByTime(300 * 1000);
    });

    // Session 2 - second indicator should be current
    expect(screen.getByLabelText('Session 1 completed')).toBeInTheDocument();
    expect(screen.getByLabelText('Session 2 current')).toBeInTheDocument();
    expect(screen.getByLabelText('Session 3 pending')).toBeInTheDocument();
    expect(screen.getByLabelText('Session 4 pending')).toBeInTheDocument();
  });

  it('should handle skip functionality correctly', () => {
    render(<App />);

    // Start work session 1
    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);

    // Skip the work session
    const skipButton = screen.getByRole('button', { name: /skip/i });
    fireEvent.click(skipButton);

    // Should now be in short break
    expect(screen.getByText('Short Break')).toBeInTheDocument();
    expect(screen.getByText('Break after session 1')).toBeInTheDocument();

    // Skip the break
    const skipBreakButton = screen.getByRole('button', { name: /skip/i });
    fireEvent.click(skipBreakButton);

    // Should now be in work session 2
    expect(screen.getByText('Work Session')).toBeInTheDocument();
    expect(screen.getByText('Session 2 of 4')).toBeInTheDocument();
  });
});