import BackgroundSyncService from '../BackgroundSyncService';

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

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock service worker
const mockServiceWorker = {
  ready: Promise.resolve({
    sync: {
      register: jest.fn().mockResolvedValue(undefined)
    }
  })
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true
});

// Mock ServiceWorkerRegistration
Object.defineProperty(window, 'ServiceWorkerRegistration', {
  value: {
    prototype: {
      sync: true
    }
  }
});

describe('BackgroundSyncService', () => {
  let service: BackgroundSyncService;

  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
    service = BackgroundSyncService.getInstance();
    service.clearSyncQueue(); // Clear any existing queue
  });

  afterEach(() => {
    service.clearSyncQueue();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BackgroundSyncService.getInstance();
      const instance2 = BackgroundSyncService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('addToSyncQueue', () => {
    it('should add session data to sync queue', () => {
      const sessionData = {
        id: 'session-1',
        type: 'work',
        startTime: new Date(),
        completed: true
      };

      service.addToSyncQueue('session', sessionData);

      expect(service.getPendingSyncCount()).toBe(1);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pomodoro_sync_queue',
        expect.stringContaining('session')
      );
    });

    it('should add settings data to sync queue', () => {
      const settingsData = {
        workDuration: 25,
        shortBreakDuration: 5,
        soundEnabled: true
      };

      service.addToSyncQueue('settings', settingsData);

      expect(service.getPendingSyncCount()).toBe(1);
    });

    it('should add statistics data to sync queue', () => {
      const statsData = {
        totalSessions: 10,
        currentStreak: 3
      };

      service.addToSyncQueue('statistics', statsData);

      expect(service.getPendingSyncCount()).toBe(1);
    });

    it('should register for background sync when offline', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      service.addToSyncQueue('session', { test: 'data' });

      expect(mockServiceWorker.ready).toHaveBeenCalled;
    });
  });

  describe('sync queue persistence', () => {
    it('should load sync queue from localStorage on initialization', () => {
      const existingQueue = [
        {
          id: 'test-1',
          type: 'session',
          data: { test: 'data' },
          timestamp: Date.now()
        }
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingQueue));

      const newService = BackgroundSyncService.getInstance();
      
      expect(newService.getPendingSyncCount()).toBe(1);
    });

    it('should handle corrupted sync queue data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const newService = BackgroundSyncService.getInstance();
      
      expect(newService.getPendingSyncCount()).toBe(0);
    });

    it('should save sync queue to localStorage', () => {
      service.addToSyncQueue('session', { test: 'data' });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pomodoro_sync_queue',
        expect.any(String)
      );
    });
  });

  describe('online event handling', () => {
    it('should process sync queue when coming online', () => {
      // Add items to queue while offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      service.addToSyncQueue('session', { id: 'test-session' });
      expect(service.getPendingSyncCount()).toBe(1);

      // Mock localStorage for session sync
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pomodoro_sessions') {
          return JSON.stringify([]);
        }
        return null;
      });

      // Simulate coming online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      });

      // Trigger online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      // Give time for async processing
      setTimeout(() => {
        expect(service.getPendingSyncCount()).toBe(0);
      }, 100);
    });
  });

  describe('data synchronization', () => {
    beforeEach(() => {
      // Mock localStorage responses for sync operations
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'pomodoro_sessions':
            return JSON.stringify([]);
          case 'pomodoro_settings':
            return JSON.stringify({});
          case 'pomodoro_statistics':
            return JSON.stringify({});
          default:
            return null;
        }
      });
    });

    it('should sync session data to localStorage', async () => {
      const sessionData = {
        id: 'session-1',
        type: 'work',
        completed: true
      };

      service.addToSyncQueue('session', sessionData);

      // Wait for sync processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pomodoro_sessions',
        expect.stringContaining('session-1')
      );
    });

    it('should update existing session data', async () => {
      const existingSession = {
        id: 'session-1',
        type: 'work',
        completed: false
      };

      const updatedSession = {
        id: 'session-1',
        type: 'work',
        completed: true
      };

      // Mock existing sessions
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pomodoro_sessions') {
          return JSON.stringify([existingSession]);
        }
        return null;
      });

      service.addToSyncQueue('session', updatedSession);

      // Wait for sync processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pomodoro_sessions',
        expect.stringContaining('"completed":true')
      );
    });

    it('should sync settings data', async () => {
      const settingsData = {
        workDuration: 30,
        soundEnabled: false
      };

      service.addToSyncQueue('settings', settingsData);

      // Wait for sync processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pomodoro_settings',
        JSON.stringify(settingsData)
      );
    });

    it('should sync statistics data', async () => {
      const statsData = {
        totalSessions: 15,
        currentStreak: 5
      };

      service.addToSyncQueue('statistics', statsData);

      // Wait for sync processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pomodoro_statistics',
        JSON.stringify(statsData)
      );
    });
  });

  describe('error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => {
        service.addToSyncQueue('session', { test: 'data' });
      }).not.toThrow();
    });

    it('should handle sync errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      service.addToSyncQueue('session', { test: 'data' });

      // Should not throw error
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(service.getPendingSyncCount()).toBe(1);
    });

    it('should handle background sync registration errors', () => {
      const mockFailingServiceWorker = {
        ready: Promise.reject(new Error('Service worker not available'))
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockFailingServiceWorker,
        writable: true
      });

      expect(() => {
        service.addToSyncQueue('session', { test: 'data' });
      }).not.toThrow();
    });
  });

  describe('utility methods', () => {
    it('should return correct pending sync count', () => {
      expect(service.getPendingSyncCount()).toBe(0);

      service.addToSyncQueue('session', { test: 'data1' });
      expect(service.getPendingSyncCount()).toBe(1);

      service.addToSyncQueue('settings', { test: 'data2' });
      expect(service.getPendingSyncCount()).toBe(2);
    });

    it('should clear sync queue', () => {
      service.addToSyncQueue('session', { test: 'data' });
      expect(service.getPendingSyncCount()).toBe(1);

      service.clearSyncQueue();
      expect(service.getPendingSyncCount()).toBe(0);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('pomodoro_sync_queue');
    });
  });
});