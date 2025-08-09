import React from 'react';
import { render, screen } from '@testing-library/react';
import { SessionInfo } from '../SessionInfo';
import { SessionType, TimerState } from '../../types';

// Mock timer state factory
const createMockTimerState = (overrides: Partial<TimerState> = {}): TimerState => ({
  isRunning: false,
  isPaused: false,
  currentTime: 1500, // 25 minutes in seconds
  totalTime: 1500,
  sessionType: SessionType.WORK,
  sessionCount: 1,
  cycleCount: 0,
  ...overrides
});

describe('SessionInfo Component', () => {
  describe('Session Display', () => {
    it('displays work session information correctly', () => {
      const timerState = createMockTimerState({
        sessionType: SessionType.WORK,
        sessionCount: 1,
        cycleCount: 0
      });

      render(<SessionInfo timerState={timerState} />);

      expect(screen.getByText('Work Session')).toBeInTheDocument();
      expect(screen.getByText('Cycle 1')).toBeInTheDocument();
      expect(screen.getByText('Session 1 of 4')).toBeInTheDocument();
      expect(screen.getByText('Next: Short Break')).toBeInTheDocument();
    });

    it('displays short break session information correctly', () => {
      const timerState = createMockTimerState({
        sessionType: SessionType.SHORT_BREAK,
        sessionCount: 2,
        cycleCount: 0
      });

      render(<SessionInfo timerState={timerState} />);

      expect(screen.getByText('Short Break')).toBeInTheDocument();
      expect(screen.getByText('Cycle 1')).toBeInTheDocument();
      expect(screen.getByText('Break after session 1')).toBeInTheDocument();
      expect(screen.getByText('Next: Work Session')).toBeInTheDocument();
    });

    it('displays long break session information correctly', () => {
      const timerState = createMockTimerState({
        sessionType: SessionType.LONG_BREAK,
        sessionCount: 1,
        cycleCount: 1
      });

      render(<SessionInfo timerState={timerState} />);

      expect(screen.getByText('Long Break')).toBeInTheDocument();
      expect(screen.getByText('Cycle 2')).toBeInTheDocument();
      expect(screen.getByText('Break after session 0')).toBeInTheDocument();
      expect(screen.getByText('Next: Work Session')).toBeInTheDocument();
    });
  });

  describe('Cycle Progress Indicators', () => {
    it('shows correct cycle indicators for first work session', () => {
      const timerState = createMockTimerState({
        sessionType: SessionType.WORK,
        sessionCount: 1,
        cycleCount: 0
      });

      render(<SessionInfo timerState={timerState} />);

      const indicators = screen.getAllByLabelText(/Session \d/);
      expect(indicators).toHaveLength(4);

      // First session should be current
      expect(screen.getByLabelText('Session 1 current')).toBeInTheDocument();
      
      // Others should be pending
      expect(screen.getByLabelText('Session 2 pending')).toBeInTheDocument();
      expect(screen.getByLabelText('Session 3 pending')).toBeInTheDocument();
      expect(screen.getByLabelText('Session 4 pending')).toBeInTheDocument();
    });

    it('shows correct cycle indicators for third work session', () => {
      const timerState = createMockTimerState({
        sessionType: SessionType.WORK,
        sessionCount: 3,
        cycleCount: 0
      });

      render(<SessionInfo timerState={timerState} />);

      // First two should be completed
      expect(screen.getByLabelText('Session 1 completed')).toBeInTheDocument();
      expect(screen.getByLabelText('Session 2 completed')).toBeInTheDocument();
      
      // Third should be current
      expect(screen.getByLabelText('Session 3 current')).toBeInTheDocument();
      
      // Fourth should be pending
      expect(screen.getByLabelText('Session 4 pending')).toBeInTheDocument();
    });

    it('shows correct cycle indicators during short break', () => {
      const timerState = createMockTimerState({
        sessionType: SessionType.SHORT_BREAK,
        sessionCount: 3,
        cycleCount: 0
      });

      render(<SessionInfo timerState={timerState} />);

      // First two should be completed (we're on break after session 2)
      expect(screen.getByLabelText('Session 1 completed')).toBeInTheDocument();
      expect(screen.getByLabelText('Session 2 completed')).toBeInTheDocument();
      
      // Third and fourth should be pending
      expect(screen.getByLabelText('Session 3 pending')).toBeInTheDocument();
      expect(screen.getByLabelText('Session 4 pending')).toBeInTheDocument();
    });

    it('shows correct cycle indicators for fourth work session (before long break)', () => {
      const timerState = createMockTimerState({
        sessionType: SessionType.WORK,
        sessionCount: 4,
        cycleCount: 0
      });

      render(<SessionInfo timerState={timerState} />);

      expect(screen.getByText('Next: Long Break')).toBeInTheDocument();
      
      // First three should be completed
      expect(screen.getByLabelText('Session 1 completed')).toBeInTheDocument();
      expect(screen.getByLabelText('Session 2 completed')).toBeInTheDocument();
      expect(screen.getByLabelText('Session 3 completed')).toBeInTheDocument();
      
      // Fourth should be current
      expect(screen.getByLabelText('Session 4 current')).toBeInTheDocument();
    });
  });

  describe('Cycle Counter', () => {
    it('displays correct cycle number', () => {
      const timerState = createMockTimerState({
        cycleCount: 2
      });

      render(<SessionInfo timerState={timerState} />);

      expect(screen.getByText('Cycle 3')).toBeInTheDocument();
    });

    it('starts with cycle 1', () => {
      const timerState = createMockTimerState({
        cycleCount: 0
      });

      render(<SessionInfo timerState={timerState} />);

      expect(screen.getByText('Cycle 1')).toBeInTheDocument();
    });
  });

  describe('Next Session Information', () => {
    it('shows "Next: Short Break" for sessions 1-3', () => {
      [1, 2, 3].forEach(sessionCount => {
        const timerState = createMockTimerState({
          sessionType: SessionType.WORK,
          sessionCount
        });

        const { rerender } = render(<SessionInfo timerState={timerState} />);
        expect(screen.getByText('Next: Short Break')).toBeInTheDocument();
        
        // Clean up for next iteration
        rerender(<div />);
      });
    });

    it('shows "Next: Long Break" for session 4', () => {
      const timerState = createMockTimerState({
        sessionType: SessionType.WORK,
        sessionCount: 4
      });

      render(<SessionInfo timerState={timerState} />);
      expect(screen.getByText('Next: Long Break')).toBeInTheDocument();
    });

    it('shows "Next: Work Session" for all break types', () => {
      [SessionType.SHORT_BREAK, SessionType.LONG_BREAK].forEach(sessionType => {
        const timerState = createMockTimerState({
          sessionType,
          sessionCount: 2
        });

        const { rerender } = render(<SessionInfo timerState={timerState} />);
        expect(screen.getByText('Next: Work Session')).toBeInTheDocument();
        
        // Clean up for next iteration
        rerender(<div />);
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for cycle indicators', () => {
      const timerState = createMockTimerState({
        sessionType: SessionType.WORK,
        sessionCount: 2
      });

      render(<SessionInfo timerState={timerState} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '2');
      expect(progressbar).toHaveAttribute('aria-valuemax', '4');
    });

    it('has proper heading structure', () => {
      const timerState = createMockTimerState();

      render(<SessionInfo timerState={timerState} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Work Session');
    });
  });

  describe('Visual States', () => {
    it('applies correct CSS custom property for session color', () => {
      const timerState = createMockTimerState({
        sessionType: SessionType.WORK
      });

      render(<SessionInfo timerState={timerState} />);

      const sessionInfo = screen.getByText('Work Session').closest('.session-info');
      expect(sessionInfo).toHaveStyle('--session-color: #e53e3e');
    });

    it('applies correct CSS custom property for short break color', () => {
      const timerState = createMockTimerState({
        sessionType: SessionType.SHORT_BREAK
      });

      render(<SessionInfo timerState={timerState} />);

      const sessionInfo = screen.getByText('Short Break').closest('.session-info');
      expect(sessionInfo).toHaveStyle('--session-color: #38a169');
    });

    it('applies correct CSS custom property for long break color', () => {
      const timerState = createMockTimerState({
        sessionType: SessionType.LONG_BREAK
      });

      render(<SessionInfo timerState={timerState} />);

      const sessionInfo = screen.getByText('Long Break').closest('.session-info');
      expect(sessionInfo).toHaveStyle('--session-color: #3182ce');
    });
  });
});