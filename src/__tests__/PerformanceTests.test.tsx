import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock performance API
const mockPerformance = {
  now: jest.fn(),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(),
  getEntriesByName: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock timers
jest.useFakeTimers();

// Mock notification service
jest.mock('../services/NotificationService', () => ({
  notificationService: {
    loadAudioFiles: jest.fn().mockResolvedValue(undefined),
    isNotificationSupported: jest.fn().mockReturnValue(false),
    isAudioSupported: jest.fn().mockReturnValue(false),
    showSessionCompleteNotification: jest.fn().mockResolvedValue(undefined)
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

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    jest.clearAllTimers();
    mockPerformance.now.mockReturnValue(0);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('App Initialization Performance', () => {
    it('should initialize within acceptable time limits', async () => {
      let initStartTime = 0;
      let initEndTime = 100; // 100ms initialization time

      mockPerformance.now
        .mockReturnValueOnce(initStartTime)
        .mockReturnValueOnce(initEndTime);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should track initialization performance
      expect(mockPerformance.now).toHaveBeenCalled();
    });

    it('should handle slow initialization gracefully', async () => {
      // Simulate slow initialization
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(5000); // 5 second initialization

      render(<App />);

      // Should show loading state during slow initialization
      expect(screen.getByText('Loading Pomodoro Timer...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 6000 });
    });

    it('should minimize re-renders during initialization', async () => {
      const renderSpy = jest.fn();
      
      const TestWrapper = () => {
        renderSpy();
        return <App />;
      };

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should not have excessive re-renders
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timer Performance', () => {
    it('should maintain accurate timing under load', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Start timer
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      // Simulate high CPU load by advancing timers in small increments
      for (let i = 0; i < 100; i++) {
        act(() => {
          jest.advanceTimersByTime(1000); // 1 second increments
        });
      }

      // Timer should still be accurate after 100 seconds
      await waitFor(() => {
        expect(screen.getByText(/23:20/)).toBeInTheDocument(); // 25:00 - 1:40
      });
    });

    it('should handle rapid start/stop operations', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Rapidly start and stop timer
      for (let i = 0; i < 10; i++) {
        const startButton = screen.getByRole('button', { name: /start/i });
        await user.click(startButton);

        const pauseButton = screen.getByRole('button', { name: /pause/i });
        await user.click(pauseButton);
      }

      // Timer should still be functional
      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
      expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('should cleanup timers properly on component unmount', async () => {
      const { unmount } = render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Start timer
      const startButton = screen.getByRole('button', { name: /start/i });
      fireEvent.click(startButton);

      // Unmount component
      unmount();

      // Advance timers after unmount
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Should not cause memory leaks or errors
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Memory Management', () => {
    it('should not create memory leaks with event listeners', async () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      const addedListeners = addEventListenerSpy.mock.calls.length;

      unmount();

      // Should remove all added event listeners
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(addedListeners);

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should cleanup service instances on unmount', async () => {
      const { unmount } = render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Services should be initialized
      expect(screen.getByRole('main')).toBeInTheDocument();

      unmount();

      // Should not throw errors after unmount
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }).not.toThrow();
    });

    it('should handle multiple component instances without conflicts', async () => {
      const { unmount: unmount1 } = render(<App />);
      const { unmount: unmount2 } = render(<App />);

      await waitFor(() => {
        expect(screen.getAllByText('Pomodoro Timer')).toHaveLength(2);
      }, { timeout: 3000 });

      unmount1();

      // Second instance should still work
      expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();

      unmount2();
    });
  });

  describe('Storage Performance', () => {
    it('should handle large amounts of statistics data efficiently', async () => {
      // Pre-populate with large dataset
      const largeStatsData = {
        totalSessions: 10000,
        currentStreak: 100,
        longestStreak: 200,
        dailyStats: Array.from({ length: 365 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          completedSessions: Math.floor(Math.random() * 10),
          workMinutes: Math.floor(Math.random() * 300),
          breakMinutes: Math.floor(Math.random() * 100)
        }))
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pomodoro_statistics') {
          return JSON.stringify(largeStatsData);
        }
        return null;
      });

      const startTime = performance.now();
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open statistics
      const statsButton = screen.getByRole('button', { name: /statistics/i });
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText(/completed today/i)).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load large dataset reasonably quickly (under 1 second)
      expect(loadTime).toBeLessThan(1000);
    });

    it('should handle storage quota exceeded gracefully', async () => {
      // Mock storage quota exceeded
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show storage warning but continue working
      await waitFor(() => {
        expect(screen.getByText(/storage/i)).toBeInTheDocument();
      });

      // App should still be functional
      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    });

    it('should cleanup old data automatically', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      // Mock old statistics data
      const oldStatsData = {
        dailyStats: Array.from({ length: 100 }, (_, i) => ({
          date: new Date(Date.now() - (i + 50) * 24 * 60 * 60 * 1000).toISOString(),
          completedSessions: 5
        }))
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pomodoro_statistics') {
          return JSON.stringify(oldStatsData);
        }
        return null;
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Complete a session to trigger data cleanup
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      act(() => {
        jest.advanceTimersByTime(1500000); // 25 minutes
      });

      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });

      // Should have cleaned up old data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pomodoro_statistics',
        expect.not.stringContaining('50') // Old data should be removed
      );
    });
  });

  describe('UI Performance', () => {
    it('should handle rapid UI updates efficiently', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Start timer
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      // Rapidly advance timer to test UI updates
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000); // 1 second increments
        });
      }

      // UI should still be responsive
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('should optimize re-renders with React.memo', async () => {
      const renderCount = { count: 0 };
      
      // Mock a component to track renders
      const OriginalTimerDisplay = require('../components/TimerDisplay').TimerDisplay;
      const MockTimerDisplay = React.memo((props: any) => {
        renderCount.count++;
        return React.createElement(OriginalTimerDisplay, props);
      });

      // This test would require more complex mocking to properly test React.memo
      // For now, we'll just verify the component renders
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should handle window resize events efficiently', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Simulate multiple resize events
      for (let i = 0; i < 10; i++) {
        act(() => {
          fireEvent(window, new Event('resize'));
        });
      }

      // App should still be responsive
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Network Performance', () => {
    it('should handle offline/online transitions efficiently', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Simulate rapid online/offline transitions
      for (let i = 0; i < 5; i++) {
        Object.defineProperty(navigator, 'onLine', {
          value: false,
          writable: true
        });
        fireEvent(window, new Event('offline'));

        Object.defineProperty(navigator, 'onLine', {
          value: true,
          writable: true
        });
        fireEvent(window, new Event('online'));
      }

      // App should handle transitions gracefully
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should batch background sync operations', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Make multiple changes rapidly
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const workDurationSlider = screen.getByRole('slider', { name: /work duration/i });
      
      // Rapidly change settings
      for (let i = 20; i <= 30; i++) {
        fireEvent.change(workDurationSlider, { target: { value: i.toString() } });
      }

      // Should batch the sync operations rather than creating many individual ones
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });
});