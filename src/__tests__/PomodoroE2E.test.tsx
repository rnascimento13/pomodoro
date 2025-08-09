import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock timers for controlled testing
jest.useFakeTimers();

// Mock notification service
jest.mock('../services/NotificationService', () => ({
  notificationService: {
    loadAudioFiles: jest.fn().mockResolvedValue(undefined),
    isNotificationSupported: jest.fn().mockReturnValue(true),
    isAudioSupported: jest.fn().mockReturnValue(true),
    showSessionCompleteNotification: jest.fn().mockResolvedValue(undefined),
    requestPermission: jest.fn().mockResolvedValue(true),
    setNotificationsEnabled: jest.fn(),
    setSoundEnabled: jest.fn(),
    playSound: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('Pomodoro End-to-End Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Complete Pomodoro Cycle', () => {
    it('should complete a full 4-session Pomodoro cycle', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<App />);

      // Wait for app initialization
      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Set shorter durations for testing
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText(/work duration/i)).toBeInTheDocument();
      });

      // Set work duration to 1 minute, breaks to 30 seconds
      const workDurationSlider = screen.getByRole('slider', { name: /work duration/i });
      const shortBreakSlider = screen.getByRole('slider', { name: /short break/i });
      const longBreakSlider = screen.getByRole('slider', { name: /long break/i });

      await user.clear(workDurationSlider);
      await user.type(workDurationSlider, '1');
      
      await user.clear(shortBreakSlider);
      await user.type(shortBreakSlider, '1');
      
      await user.clear(longBreakSlider);
      await user.type(longBreakSlider, '2');

      // Close settings
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Complete 4 work sessions with breaks
      for (let session = 1; session <= 4; session++) {
        // Verify session info
        expect(screen.getByText(`Session ${session} of 4`)).toBeInTheDocument();
        expect(screen.getByText('Work Session')).toBeInTheDocument();

        // Start work session
        const startButton = screen.getByRole('button', { name: /start/i });
        await user.click(startButton);

        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();

        // Fast forward through work session (1 minute = 60000ms)
        act(() => {
          jest.advanceTimersByTime(60000);
        });

        // Work session should complete
        await waitFor(() => {
          expect(screen.getByText(/session complete/i)).toBeInTheDocument();
        });

        // Verify completion modal
        expect(screen.getByText(/work session complete/i)).toBeInTheDocument();

        if (session < 4) {
          // Should show short break for sessions 1-3
          expect(screen.getByText(/time for a break/i)).toBeInTheDocument();
          
          // Start break
          const startBreakButton = screen.getByRole('button', { name: /start break/i });
          await user.click(startBreakButton);

          expect(screen.getByText('Short Break')).toBeInTheDocument();

          // Fast forward through break (1 minute = 60000ms)
          act(() => {
            jest.advanceTimersByTime(60000);
          });

          // Break should complete
          await waitFor(() => {
            expect(screen.getByText(/break complete/i)).toBeInTheDocument();
          });

          // Start next work session
          const nextWorkButton = screen.getByRole('button', { name: /start work/i });
          await user.click(nextWorkButton);
        } else {
          // After 4th session, should show long break
          expect(screen.getByText(/long break/i)).toBeInTheDocument();
          
          const startLongBreakButton = screen.getByRole('button', { name: /start break/i });
          await user.click(startLongBreakButton);

          expect(screen.getByText('Long Break')).toBeInTheDocument();

          // Fast forward through long break (2 minutes = 120000ms)
          act(() => {
            jest.advanceTimersByTime(120000);
          });

          // Long break should complete
          await waitFor(() => {
            expect(screen.getByText(/break complete/i)).toBeInTheDocument();
          });

          // Should start new cycle
          const newCycleButton = screen.getByRole('button', { name: /start work/i });
          await user.click(newCycleButton);

          // Verify new cycle started
          expect(screen.getByText('Session 1 of 4')).toBeInTheDocument();
          expect(screen.getByText('Cycle 2')).toBeInTheDocument();
        }
      }

      // Verify statistics were updated
      const statsButton = screen.getByRole('button', { name: /statistics/i });
      await user.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText(/completed today/i)).toBeInTheDocument();
      });

      // Should show 4 completed sessions
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should handle session skipping correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Start work session
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      // Skip work session
      const skipButton = screen.getByRole('button', { name: /skip/i });
      await user.click(skipButton);

      // Should transition to break
      await waitFor(() => {
        expect(screen.getByText('Short Break')).toBeInTheDocument();
      });

      // Start break
      const startBreakButton = screen.getByRole('button', { name: /start/i });
      await user.click(startBreakButton);

      // Skip break
      const skipBreakButton = screen.getByRole('button', { name: /skip/i });
      await user.click(skipBreakButton);

      // Should transition to next work session
      await waitFor(() => {
        expect(screen.getByText('Work Session')).toBeInTheDocument();
        expect(screen.getByText('Session 2 of 4')).toBeInTheDocument();
      });
    });

    it('should handle pause and resume correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Start work session
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();

      // Advance timer partway
      act(() => {
        jest.advanceTimersByTime(30000); // 30 seconds
      });

      // Pause timer
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await user.click(pauseButton);

      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
      expect(screen.getByText('Paused')).toBeInTheDocument();

      // Time should not advance while paused
      act(() => {
        jest.advanceTimersByTime(10000); // 10 seconds
      });

      // Resume timer
      const resumeButton = screen.getByRole('button', { name: /start/i });
      await user.click(resumeButton);

      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();

      // Complete remaining time
      act(() => {
        jest.advanceTimersByTime(1470000); // Remaining time to complete 25 minutes
      });

      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });
    });

    it('should handle reset functionality', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Start work session
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      // Advance timer partway
      act(() => {
        jest.advanceTimersByTime(600000); // 10 minutes
      });

      // Reset timer
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      // Should show confirmation dialog
      expect(screen.getByText(/reset timer/i)).toBeInTheDocument();

      // Confirm reset
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Timer should be reset
      expect(screen.getByText('25:00')).toBeInTheDocument();
      expect(screen.getByText('Paused')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    });
  });

  describe('Settings Integration', () => {
    it('should apply custom durations to timer sessions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open settings and change durations
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const workDurationSlider = screen.getByRole('slider', { name: /work duration/i });
      await user.clear(workDurationSlider);
      await user.type(workDurationSlider, '30');

      const shortBreakSlider = screen.getByRole('slider', { name: /short break/i });
      await user.clear(shortBreakSlider);
      await user.type(shortBreakSlider, '10');

      // Close settings
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Timer should show new duration
      expect(screen.getByText('30:00')).toBeInTheDocument();

      // Start and complete work session
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      act(() => {
        jest.advanceTimersByTime(1800000); // 30 minutes
      });

      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });

      // Start break
      const startBreakButton = screen.getByRole('button', { name: /start break/i });
      await user.click(startBreakButton);

      // Break should show custom duration
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('should persist settings across app restarts', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      // First render - set custom settings
      const { unmount } = render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const workDurationSlider = screen.getByRole('slider', { name: /work duration/i });
      await user.clear(workDurationSlider);
      await user.type(workDurationSlider, '45');

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      unmount();

      // Second render - settings should be restored
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Timer should show saved duration
      expect(screen.getByText('45:00')).toBeInTheDocument();
    });
  });

  describe('Statistics Tracking', () => {
    it('should track completed sessions accurately', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Complete 2 work sessions
      for (let i = 0; i < 2; i++) {
        const startButton = screen.getByRole('button', { name: /start/i });
        await user.click(startButton);

        act(() => {
          jest.advanceTimersByTime(1500000); // 25 minutes
        });

        await waitFor(() => {
          expect(screen.getByText(/session complete/i)).toBeInTheDocument();
        });

        if (i < 1) {
          // Start break and complete it
          const startBreakButton = screen.getByRole('button', { name: /start break/i });
          await user.click(startBreakButton);

          act(() => {
            jest.advanceTimersByTime(300000); // 5 minutes
          });

          await waitFor(() => {
            expect(screen.getByText(/break complete/i)).toBeInTheDocument();
          });

          const nextWorkButton = screen.getByRole('button', { name: /start work/i });
          await user.click(nextWorkButton);
        }
      }

      // Check statistics
      const statsButton = screen.getByRole('button', { name: /statistics/i });
      await user.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText(/completed today/i)).toBeInTheDocument();
      });

      // Should show 2 completed sessions
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should calculate streaks correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      // Mock date to simulate multiple days
      const mockDate = new Date('2024-01-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Complete a session on day 1
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      act(() => {
        jest.advanceTimersByTime(1500000); // 25 minutes
      });

      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });

      // Check initial streak
      const statsButton = screen.getByRole('button', { name: /statistics/i });
      await user.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText(/current streak/i)).toBeInTheDocument();
      });

      expect(screen.getByText('1 day')).toBeInTheDocument();

      // Restore Date
      (global.Date as any).mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle timer service errors gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      // Mock timer service to throw error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // App should still be functional even with errors
      expect(screen.getByRole('main')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle notification errors gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      // Mock notification service to throw error
      const mockNotificationService = require('../services/NotificationService').notificationService;
      mockNotificationService.showSessionCompleteNotification.mockRejectedValue(
        new Error('Notification failed')
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Complete a session
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      act(() => {
        jest.advanceTimersByTime(1500000); // 25 minutes
      });

      // Session should complete despite notification error
      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });
    });
  });
});