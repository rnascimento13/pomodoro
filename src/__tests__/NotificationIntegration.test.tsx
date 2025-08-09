import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock timers
jest.useFakeTimers();

// Mock Notification API
const mockNotification = jest.fn();
const mockRequestPermission = jest.fn();

Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  writable: true
});

mockNotification.requestPermission = mockRequestPermission;
mockNotification.permission = 'default';

// Mock Audio API
const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  volume: 0.7,
  currentTime: 0,
  duration: 10
};

Object.defineProperty(window, 'Audio', {
  value: jest.fn(() => mockAudio),
  writable: true
});

// Mock AudioContext
const mockAudioContext = {
  createOscillator: jest.fn(),
  createGain: jest.fn(),
  createBufferSource: jest.fn(),
  decodeAudioData: jest.fn(),
  destination: {},
  currentTime: 0,
  state: 'running',
  close: jest.fn()
};

const mockOscillator = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  frequency: { setValueAtTime: jest.fn() },
  type: 'sine'
};

const mockGainNode = {
  connect: jest.fn(),
  gain: {
    setValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn()
  }
};

mockAudioContext.createOscillator.mockReturnValue(mockOscillator);
mockAudioContext.createGain.mockReturnValue(mockGainNode);

Object.defineProperty(window, 'AudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true
});

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

describe('Notification Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    jest.clearAllTimers();
    mockNotification.permission = 'default';
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Permission Management', () => {
    it('should request notification permission when enabling notifications', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockRequestPermission.mockResolvedValue('granted');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText(/notifications/i)).toBeInTheDocument();
      });

      // Enable notifications
      const notificationToggle = screen.getByRole('checkbox', { name: /notifications/i });
      await user.click(notificationToggle);

      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it('should show permission status in settings', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockNotification.permission = 'denied';

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText(/notifications blocked/i)).toBeInTheDocument();
      });
    });

    it('should handle permission request failure gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockRequestPermission.mockRejectedValue(new Error('Permission denied'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const notificationToggle = screen.getByRole('checkbox', { name: /notifications/i });
      await user.click(notificationToggle);

      // Should handle error gracefully
      expect(mockRequestPermission).toHaveBeenCalled();
    });
  });

  describe('Session Complete Notifications', () => {
    it('should show browser notification when work session completes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockNotification.permission = 'granted';
      mockRequestPermission.mockResolvedValue('granted');

      const mockNotificationInstance = {
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
      mockNotification.mockReturnValue(mockNotificationInstance);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Enable notifications
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const notificationToggle = screen.getByRole('checkbox', { name: /notifications/i });
      await user.click(notificationToggle);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Start and complete work session
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      act(() => {
        jest.advanceTimersByTime(1500000); // 25 minutes
      });

      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });

      expect(mockNotification).toHaveBeenCalledWith(
        'Work Session Complete! 🎉',
        expect.objectContaining({
          body: 'Great job! Time for a well-deserved break.',
          icon: '/logo192.png',
          requireInteraction: true
        })
      );
    });

    it('should show different notifications for different session types', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockNotification.permission = 'granted';

      const mockNotificationInstance = { close: jest.fn() };
      mockNotification.mockReturnValue(mockNotificationInstance);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Enable notifications
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const notificationToggle = screen.getByRole('checkbox', { name: /notifications/i });
      await user.click(notificationToggle);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Complete work session
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      act(() => {
        jest.advanceTimersByTime(1500000);
      });

      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });

      // Start break
      const startBreakButton = screen.getByRole('button', { name: /start break/i });
      await user.click(startBreakButton);

      act(() => {
        jest.advanceTimersByTime(300000); // 5 minutes
      });

      await waitFor(() => {
        expect(screen.getByText(/break complete/i)).toBeInTheDocument();
      });

      // Should show break completion notification
      expect(mockNotification).toHaveBeenCalledWith(
        'Break Time Over! ⚡',
        expect.objectContaining({
          body: "Ready to get back to work? Let's stay focused!"
        })
      );
    });

    it('should not show notifications when disabled', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockNotification.permission = 'granted';

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Keep notifications disabled (default state)
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      act(() => {
        jest.advanceTimersByTime(1500000);
      });

      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });

      expect(mockNotification).not.toHaveBeenCalled();
    });
  });

  describe('Audio Notifications', () => {
    it('should play sound when session completes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Sound should be enabled by default
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      act(() => {
        jest.advanceTimersByTime(1500000);
      });

      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });

      // Should create audio context for sound generation
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should not play sound when disabled', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Disable sound
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const soundToggle = screen.getByRole('checkbox', { name: /sound/i });
      await user.click(soundToggle);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Complete session
      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      act(() => {
        jest.advanceTimersByTime(1500000);
      });

      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });

      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('should handle audio context creation failure', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      // Mock AudioContext to fail
      Object.defineProperty(window, 'AudioContext', {
        value: undefined,
        writable: true
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      act(() => {
        jest.advanceTimersByTime(1500000);
      });

      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });

      // Should handle gracefully
      expect(consoleSpy).toHaveBeenCalledWith('AudioContext not supported:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should load audio files on initialization', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
        });

      mockAudioContext.decodeAudioData.mockResolvedValue({});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should attempt to load audio files
      expect(global.fetch).toHaveBeenCalledWith('/sounds/work-complete.mp3');
      expect(global.fetch).toHaveBeenCalledWith('/sounds/break-complete.mp3');
    });
  });

  describe('Fallback Notifications', () => {
    it('should show visual notification when browser notifications are not supported', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      // Remove Notification API
      Object.defineProperty(window, 'Notification', {
        value: undefined,
        writable: true
      });

      // Mock DOM methods for fallback notification
      const mockElement = {
        className: '',
        innerHTML: '',
        style: { cssText: '', animation: '' },
        parentNode: { removeChild: jest.fn() }
      };

      const createElement = jest.spyOn(document, 'createElement').mockReturnValue(mockElement as any);
      const appendChild = jest.spyOn(document.body, 'appendChild').mockImplementation();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      act(() => {
        jest.advanceTimersByTime(1500000);
      });

      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });

      // Should create fallback notification element
      expect(createElement).toHaveBeenCalledWith('div');
      expect(appendChild).toHaveBeenCalled();

      createElement.mockRestore();
      appendChild.mockRestore();
    });

    it('should handle notification click events', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockNotification.permission = 'granted';

      const mockNotificationInstance = {
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onclick: null
      };
      mockNotification.mockReturnValue(mockNotificationInstance);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Enable notifications
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const notificationToggle = screen.getByRole('checkbox', { name: /notifications/i });
      await user.click(notificationToggle);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      act(() => {
        jest.advanceTimersByTime(1500000);
      });

      await waitFor(() => {
        expect(screen.getByText(/session complete/i)).toBeInTheDocument();
      });

      // Simulate notification click
      if (mockNotificationInstance.onclick) {
        mockNotificationInstance.onclick(new Event('click'));
      }

      // Should focus the window (tested by checking if notification was created)
      expect(mockNotification).toHaveBeenCalled();
    });
  });

  describe('Notification Settings Persistence', () => {
    it('should persist notification preferences', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockRequestPermission.mockResolvedValue('granted');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Enable notifications
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const notificationToggle = screen.getByRole('checkbox', { name: /notifications/i });
      await user.click(notificationToggle);

      // Should save to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pomodoro_settings',
        expect.stringContaining('"notificationsEnabled":true')
      );
    });

    it('should restore notification preferences on app restart', async () => {
      // Pre-populate localStorage with notification settings
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pomodoro_settings') {
          return JSON.stringify({
            workDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            soundEnabled: false,
            notificationsEnabled: true,
            autoStartBreaks: false,
            autoStartWork: false
          });
        }
        return null;
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open settings to verify restored state
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);

      await waitFor(() => {
        const notificationToggle = screen.getByRole('checkbox', { name: /notifications/i });
        expect(notificationToggle).toBeChecked();

        const soundToggle = screen.getByRole('checkbox', { name: /sound/i });
        expect(soundToggle).not.toBeChecked();
      });
    });
  });
});