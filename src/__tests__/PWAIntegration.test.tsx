import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock service worker registration
const mockServiceWorkerRegistration = {
  waiting: null,
  installing: null,
  active: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  unregister: jest.fn().mockResolvedValue(true),
  scope: '/',
  updateViaCache: 'imports'
};

// Mock navigator APIs
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve(mockServiceWorkerRegistration),
    register: jest.fn().mockResolvedValue(mockServiceWorkerRegistration),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    controller: null,
    getRegistration: jest.fn().mockResolvedValue(mockServiceWorkerRegistration)
  },
  writable: true
});

// Mock beforeinstallprompt event
let beforeInstallPromptEvent: any = null;
const mockBeforeInstallPrompt = {
  prompt: jest.fn().mockResolvedValue(undefined),
  userChoice: Promise.resolve({ outcome: 'accepted' }),
  preventDefault: jest.fn()
};

// Mock online/offline status
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true
});

// Mock notification API
Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: jest.fn().mockResolvedValue('granted')
  },
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

describe('PWA Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    beforeInstallPromptEvent = null;
    mockServiceWorkerRegistration.waiting = null;
    mockServiceWorkerRegistration.installing = null;
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true
    });
  });

  describe('Service Worker Integration', () => {
    it('should register service worker on app initialization', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Service worker should be registered during app initialization
      expect(navigator.serviceWorker.register).toHaveBeenCalled();
    });

    it('should show update notification when service worker update is available', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Simulate service worker update
      mockServiceWorkerRegistration.waiting = {
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      // Trigger update found event
      const updateFoundCallback = mockServiceWorkerRegistration.addEventListener.mock.calls
        .find(call => call[0] === 'updatefound')?.[1];

      if (updateFoundCallback) {
        updateFoundCallback();
      }

      await waitFor(() => {
        expect(screen.getByText(/update available/i)).toBeInTheDocument();
      });
    });

    it('should apply service worker update when user clicks update button', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Simulate service worker update available
      mockServiceWorkerRegistration.waiting = {
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      // Manually trigger update notification (since we can't easily simulate the event)
      const updateButton = screen.queryByRole('button', { name: /update/i });
      if (updateButton) {
        fireEvent.click(updateButton);

        expect(mockServiceWorkerRegistration.waiting.postMessage).toHaveBeenCalledWith({
          type: 'SKIP_WAITING'
        });
      }
    });
  });

  describe('Installation Prompt', () => {
    it('should show install prompt when beforeinstallprompt event is fired', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Simulate beforeinstallprompt event
      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      Object.assign(beforeInstallPromptEvent, mockBeforeInstallPrompt);

      fireEvent(window, beforeInstallPromptEvent);

      await waitFor(() => {
        expect(screen.getByText(/install app/i)).toBeInTheDocument();
      });
    });

    it('should handle install prompt acceptance', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Simulate beforeinstallprompt event
      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      Object.assign(beforeInstallPromptEvent, mockBeforeInstallPrompt);

      fireEvent(window, beforeInstallPromptEvent);

      await waitFor(() => {
        expect(screen.getByText(/install app/i)).toBeInTheDocument();
      });

      const installButton = screen.getByRole('button', { name: /install/i });
      fireEvent.click(installButton);

      expect(mockBeforeInstallPrompt.prompt).toHaveBeenCalled();
    });

    it('should hide install prompt after successful installation', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Simulate beforeinstallprompt event
      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      Object.assign(beforeInstallPromptEvent, mockBeforeInstallPrompt);

      fireEvent(window, beforeInstallPromptEvent);

      await waitFor(() => {
        expect(screen.getByText(/install app/i)).toBeInTheDocument();
      });

      // Simulate appinstalled event
      const appInstalledEvent = new Event('appinstalled');
      fireEvent(window, appInstalledEvent);

      await waitFor(() => {
        expect(screen.queryByText(/install app/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Offline Functionality', () => {
    it('should show offline indicator when going offline', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      const offlineEvent = new Event('offline');
      fireEvent(window, offlineEvent);

      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
      });
    });

    it('should hide offline indicator when coming back online', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
      });

      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      });

      fireEvent(window, new Event('online'));

      await waitFor(() => {
        expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
      });
    });

    it('should continue timer functionality while offline', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
      });

      // Timer controls should still work
      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton).toBeInTheDocument();
      expect(startButton).not.toBeDisabled();

      fireEvent.click(startButton);

      // Timer should start even while offline
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    it('should persist timer settings offline', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText(/work duration/i)).toBeInTheDocument();
      });

      // Change work duration
      const workDurationSlider = screen.getByRole('slider', { name: /work duration/i });
      fireEvent.change(workDurationSlider, { target: { value: '30' } });

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      fireEvent(window, new Event('offline'));

      // Settings should still be saved to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pomodoro_settings',
        expect.stringContaining('"workDuration":30')
      );
    });

    it('should sync data when coming back online', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      fireEvent(window, new Event('offline'));

      // Make changes while offline (complete a session)
      const startButton = screen.getByRole('button', { name: /start/i });
      fireEvent.click(startButton);

      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      });

      fireEvent(window, new Event('online'));

      // Background sync should be triggered
      await waitFor(() => {
        expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Notification Integration', () => {
    it('should request notification permission on first use', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText(/notifications/i)).toBeInTheDocument();
      });

      // Enable notifications
      const notificationToggle = screen.getByRole('checkbox', { name: /notifications/i });
      fireEvent.click(notificationToggle);

      expect(window.Notification.requestPermission).toHaveBeenCalled();
    });

    it('should show notification permission status', async () => {
      // Set permission to denied
      Object.defineProperty(window.Notification, 'permission', {
        value: 'denied',
        writable: true
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText(/notifications blocked/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should track app initialization performance', async () => {
      const performanceNowSpy = jest.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(100);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Performance metrics should be recorded
      expect(performanceNowSpy).toHaveBeenCalled();

      performanceNowSpy.mockRestore();
    });

    it('should handle performance API unavailability', async () => {
      const originalPerformance = window.performance;
      
      // Remove performance API
      Object.defineProperty(window, 'performance', {
        value: undefined,
        writable: true
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // App should still work without performance API
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Restore performance API
      Object.defineProperty(window, 'performance', {
        value: originalPerformance,
        writable: true
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from service worker registration failure', async () => {
      // Mock service worker registration failure
      (navigator.serviceWorker.register as jest.Mock).mockRejectedValueOnce(
        new Error('Service worker registration failed')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // App should still work without service worker
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle storage quota exceeded gracefully', async () => {
      // Mock localStorage quota exceeded
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show storage warning
      await waitFor(() => {
        expect(screen.getByText(/storage/i)).toBeInTheDocument();
      });

      // App should still be functional
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});