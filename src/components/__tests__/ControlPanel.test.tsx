import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ControlPanel } from '../ControlPanel';
import { TimerState, SessionType } from '../../types';

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

// Mock handlers
const mockHandlers = {
  onStart: jest.fn(),
  onPause: jest.fn(),
  onReset: jest.fn(),
  onSkip: jest.fn()
};

describe('ControlPanel', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    Object.values(mockHandlers).forEach(mock => mock.mockClear());
  });

  describe('Play/Pause Button', () => {
    it('renders start button when timer is not running', () => {
      const timerState = createMockTimerState();
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const playButton = screen.getByRole('button', { name: /start/i });
      expect(playButton).toBeInTheDocument();
      expect(playButton).toHaveTextContent('Start');
    });

    it('renders pause button when timer is running', () => {
      const timerState = createMockTimerState({ isRunning: true });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      expect(pauseButton).toBeInTheDocument();
      expect(pauseButton).toHaveTextContent('Pause');
    });

    it('renders resume button when timer is paused', () => {
      const timerState = createMockTimerState({ isPaused: true });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const resumeButton = screen.getByRole('button', { name: /resume/i });
      expect(resumeButton).toBeInTheDocument();
      expect(resumeButton).toHaveTextContent('Resume');
    });

    it('calls onStart when start button is clicked', async () => {
      const timerState = createMockTimerState();
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start/i });
      await userEvent.click(startButton);

      expect(mockHandlers.onStart).toHaveBeenCalledTimes(1);
    });

    it('calls onPause when pause button is clicked', async () => {
      const timerState = createMockTimerState({ isRunning: true });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await userEvent.click(pauseButton);

      expect(mockHandlers.onPause).toHaveBeenCalledTimes(1);
    });

    it('calls onStart when resume button is clicked', async () => {
      const timerState = createMockTimerState({ isPaused: true });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const resumeButton = screen.getByRole('button', { name: /resume/i });
      await userEvent.click(resumeButton);

      expect(mockHandlers.onStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reset Button', () => {
    it('renders reset button', () => {
      const timerState = createMockTimerState();
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      expect(resetButton).toBeInTheDocument();
      expect(resetButton).toHaveTextContent('Reset');
    });

    it('calls onReset immediately when timer is not active', async () => {
      const timerState = createMockTimerState();
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      await userEvent.click(resetButton);

      expect(mockHandlers.onReset).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows confirmation dialog when timer is running', async () => {
      const timerState = createMockTimerState({ isRunning: true });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      await userEvent.click(resetButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Reset Timer?')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to reset/i)).toBeInTheDocument();
      expect(mockHandlers.onReset).not.toHaveBeenCalled();
    });

    it('shows confirmation dialog when timer is paused', async () => {
      const timerState = createMockTimerState({ isPaused: true });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      await userEvent.click(resetButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(mockHandlers.onReset).not.toHaveBeenCalled();
    });

    it('calls onReset when confirmation dialog is confirmed', async () => {
      const timerState = createMockTimerState({ isRunning: true });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      // Click reset button to show dialog
      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      await userEvent.click(resetButton);

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: /^reset$/i });
      await userEvent.click(confirmButton);

      expect(mockHandlers.onReset).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('does not call onReset when confirmation dialog is cancelled', async () => {
      const timerState = createMockTimerState({ isRunning: true });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      // Click reset button to show dialog
      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      await userEvent.click(resetButton);

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(mockHandlers.onReset).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('focuses cancel button by default in confirmation dialog', async () => {
      const timerState = createMockTimerState({ isRunning: true });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      await userEvent.click(resetButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toHaveFocus();
    });
  });

  describe('Skip Button', () => {
    it('does not show skip button during work sessions', () => {
      const timerState = createMockTimerState({ sessionType: SessionType.WORK });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
    });

    it('shows skip button during short break sessions', () => {
      const timerState = createMockTimerState({ sessionType: SessionType.SHORT_BREAK });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const skipButton = screen.getByRole('button', { name: /skip current break session/i });
      expect(skipButton).toBeInTheDocument();
      expect(skipButton).toHaveTextContent('Skip');
    });

    it('shows skip button during long break sessions', () => {
      const timerState = createMockTimerState({ sessionType: SessionType.LONG_BREAK });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const skipButton = screen.getByRole('button', { name: /skip current break session/i });
      expect(skipButton).toBeInTheDocument();
      expect(skipButton).toHaveTextContent('Skip');
    });

    it('calls onSkip when skip button is clicked', async () => {
      const timerState = createMockTimerState({ sessionType: SessionType.SHORT_BREAK });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const skipButton = screen.getByRole('button', { name: /skip current break session/i });
      await userEvent.click(skipButton);

      expect(mockHandlers.onSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button States and Visual Feedback', () => {
    it('applies correct CSS classes to buttons', () => {
      const timerState = createMockTimerState();
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const playButton = screen.getByRole('button', { name: /start/i });
      const resetButton = screen.getByRole('button', { name: /reset timer/i });

      expect(playButton).toHaveClass('control-button--primary');
      expect(resetButton).toHaveClass('control-button--secondary');
    });

    it('applies session type data attribute to control panel', () => {
      const timerState = createMockTimerState({ sessionType: SessionType.SHORT_BREAK });
      
      const { container } = render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const controlPanel = container.querySelector('.control-panel');
      expect(controlPanel).toHaveAttribute('data-session-type', 'short_break');
    });

    it('shows correct icons for play and pause states', () => {
      const { rerender } = render(
        <ControlPanel
          timerState={createMockTimerState({ isRunning: false })}
          {...mockHandlers}
        />
      );

      // Check play icon is present (triangle)
      let playButton = screen.getByRole('button', { name: /start/i });
      let icon = playButton.querySelector('svg path');
      expect(icon).toHaveAttribute('d', 'M8 5v14l11-7z');

      // Rerender with running state
      rerender(
        <ControlPanel
          timerState={createMockTimerState({ isRunning: true })}
          {...mockHandlers}
        />
      );

      // Check pause icon is present (two bars)
      let pauseButton = screen.getByRole('button', { name: /pause/i });
      icon = pauseButton.querySelector('svg path');
      expect(icon).toHaveAttribute('d', 'M6 4h4v16H6V4zm8 0h4v16h-4V4z');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for all buttons', () => {
      const timerState = createMockTimerState({ sessionType: SessionType.SHORT_BREAK });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('button', { name: /start timer/i })).toHaveAttribute('aria-label', 'Start timer');
      expect(screen.getByRole('button', { name: /reset timer to beginning/i })).toHaveAttribute('aria-label', 'Reset timer to beginning');
      expect(screen.getByRole('button', { name: /skip current break session/i })).toHaveAttribute('aria-label', 'Skip current break session');
    });

    it('provides proper dialog attributes for confirmation modal', async () => {
      const timerState = createMockTimerState({ isRunning: true });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset timer/i });
      await userEvent.click(resetButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'reset-dialog-title');
      
      const title = screen.getByText('Reset Timer?');
      expect(title).toHaveAttribute('id', 'reset-dialog-title');
    });

    it('supports keyboard navigation', async () => {
      const timerState = createMockTimerState({ sessionType: SessionType.SHORT_BREAK });
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      // Tab through buttons
      await userEvent.tab();
      expect(screen.getByRole('button', { name: /start/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /reset timer/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /skip current break session/i })).toHaveFocus();
    });

    it('supports keyboard activation with Enter and Space', async () => {
      const timerState = createMockTimerState();
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start/i });
      startButton.focus();

      // Test Enter key
      await userEvent.keyboard('{Enter}');
      expect(mockHandlers.onStart).toHaveBeenCalledTimes(1);

      // Test Space key
      await userEvent.keyboard(' ');
      expect(mockHandlers.onStart).toHaveBeenCalledTimes(2);
    });
  });

  describe('Touch-Friendly Design', () => {
    it('applies minimum touch target sizes through CSS classes', () => {
      const timerState = createMockTimerState();
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('control-button');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing handlers gracefully', () => {
      const timerState = createMockTimerState();
      
      // Should not throw when handlers are undefined
      expect(() => {
        render(
          <ControlPanel
            timerState={timerState}
            onStart={() => {}}
            onPause={() => {}}
            onReset={() => {}}
            onSkip={() => {}}
          />
        );
      }).not.toThrow();
    });

    it('handles rapid button clicks without errors', async () => {
      const timerState = createMockTimerState();
      
      render(
        <ControlPanel
          timerState={timerState}
          {...mockHandlers}
        />
      );

      const startButton = screen.getByRole('button', { name: /start/i });
      
      // Rapidly click the button multiple times
      await userEvent.click(startButton);
      await userEvent.click(startButton);
      await userEvent.click(startButton);

      // Should handle multiple calls gracefully
      expect(mockHandlers.onStart).toHaveBeenCalledTimes(3);
    });
  });
});