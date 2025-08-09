import { storage, StorageError } from '../storage';

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
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null)
  };
})();

// Mock BackgroundSyncService
jest.mock('../../services/BackgroundSyncService', () => ({
  default: {
    getInstance: jest.fn(() => ({
      addToSyncQueue: jest.fn()
    }))
  }
}));

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('storage utility', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
    storage.errorHandlers.clear();
  });

  describe('error handling', () => {
    it('should add and remove error handlers', () => {
      const handler = jest.fn();
      const removeHandler = storage.onError(handler);

      expect(storage.errorHandlers.has(handler)).toBe(true);

      removeHandler();
      expect(storage.errorHandlers.has(handler)).toBe(false);
    });

    it('should handle quota exceeded errors', () => {
      const handler = jest.fn();
      storage.onError(handler);

      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';

      const storageError = storage.handleError(error, 'test-key');

      expect(storageError.type).toBe('quota_exceeded');
      expect(storageError.key).toBe('test-key');
      expect(handler).toHaveBeenCalledWith(storageError);
    });

    it('should handle access denied errors', () => {
      const handler = jest.fn();
      storage.onError(handler);

      const error = new Error('Storage access denied');
      const storageError = storage.handleError(error, 'test-key');

      expect(storageError.type).toBe('access_denied');
      expect(handler).toHaveBeenCalledWith(storageError);
    });

    it('should handle parse errors', () => {
      const handler = jest.fn();
      storage.onError(handler);

      const error = new SyntaxError('Unexpected token');
      const storageError = storage.handleError(error, 'test-key');

      expect(storageError.type).toBe('parse_error');
      expect(handler).toHaveBeenCalledWith(storageError);
    });

    it('should handle unknown errors', () => {
      const handler = jest.fn();
      storage.onError(handler);

      const error = new Error('Unknown error');
      const storageError = storage.handleError(error, 'test-key');

      expect(storageError.type).toBe('unknown');
      expect(handler).toHaveBeenCalledWith(storageError);
    });

    it('should handle errors in error handlers gracefully', () => {
      const faultyHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      storage.onError(faultyHandler);
      storage.handleError(new Error('Test error'));

      expect(consoleSpy).toHaveBeenCalledWith('Error in storage error handler:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('get method', () => {
    it('should get item from localStorage', () => {
      mockLocalStorage.setItem('test-key', JSON.stringify({ value: 'test' }));

      const result = storage.get('test-key', { value: 'default' });

      expect(result).toEqual({ value: 'test' });
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should return default value when item does not exist', () => {
      const result = storage.get('non-existent', { value: 'default' });

      expect(result).toEqual({ value: 'default' });
    });

    it('should fallback to memory storage when localStorage fails', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const result = storage.get('test-key', { value: 'default' });

      expect(result).toEqual({ value: 'default' });
    });

    it('should handle corrupted data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = storage.get('test-key', { value: 'default' });

      expect(result).toEqual({ value: 'default' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('set method', () => {
    it('should set item in localStorage', () => {
      const result = storage.set('test-key', { value: 'test' });

      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify({ value: 'test' }));
    });

    it('should handle quota exceeded error with cleanup', () => {
      let callCount = 0;
      mockLocalStorage.setItem.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }
      });

      const result = storage.set('test-key', { value: 'test' });

      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2); // First fails, second succeeds
    });

    it('should fallback to memory storage when localStorage fails', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const result = storage.set('test-key', { value: 'test' });

      expect(result).toBe(true);
    });

    it('should handle complete storage failure', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      // Mock memory storage failure too
      const originalMap = Map.prototype.set;
      Map.prototype.set = jest.fn(() => {
        throw new Error('Memory error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = storage.set('test-key', { value: 'test' });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      // Restore
      Map.prototype.set = originalMap;
      consoleSpy.mockRestore();
    });
  });

  describe('remove method', () => {
    it('should remove item from localStorage', () => {
      const result = storage.remove('test-key');

      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should handle removal errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Removal failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = storage.remove('test-key');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('clear method', () => {
    it('should clear all storage', () => {
      const result = storage.clear();

      expect(result).toBe(true);
      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });

    it('should handle clear errors gracefully', () => {
      mockLocalStorage.clear.mockImplementation(() => {
        throw new Error('Clear failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = storage.clear();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('availability checks', () => {
    it('should detect localStorage availability', () => {
      expect(storage.isAvailable()).toBe(true);
    });

    it('should detect localStorage unavailability', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Not available');
      });

      expect(storage.isAvailable()).toBe(false);
    });

    it('should report fallback usage correctly', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Not available');
      });

      expect(storage.isUsingFallback()).toBe(true);
    });
  });

  describe('storage usage', () => {
    it('should calculate storage usage', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'test1') return 'value1';
        if (key === 'test2') return 'value2';
        return null;
      });

      // Mock hasOwnProperty to simulate localStorage keys
      Object.defineProperty(mockLocalStorage, 'test1', { value: 'value1', enumerable: true });
      Object.defineProperty(mockLocalStorage, 'test2', { value: 'value2', enumerable: true });

      const usage = storage.getUsage();

      expect(usage.used).toBeGreaterThan(0);
      expect(usage.available).toBeGreaterThan(0);
      expect(usage.percentage).toBeGreaterThanOrEqual(0);
    });

    it('should handle usage calculation errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Not available');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const usage = storage.getUsage();

      expect(usage).toEqual({ used: 0, available: 0, percentage: 0 });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('data cleanup', () => {
    it('should clear old statistics data', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40); // 40 days ago

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10); // 10 days ago

      const statsData = {
        dailyStats: [
          { date: oldDate.toISOString(), completedSessions: 5 },
          { date: recentDate.toISOString(), completedSessions: 3 }
        ]
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pomodoro_statistics') {
          return JSON.stringify(statsData);
        }
        return null;
      });

      storage.clearOldData();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pomodoro_statistics',
        expect.stringContaining(recentDate.toISOString().split('T')[0])
      );
    });

    it('should remove corrupted data during cleanup', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pomodoro_statistics') {
          return 'invalid json';
        }
        return null;
      });

      storage.clearOldData();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('pomodoro_statistics');
    });

    it('should handle cleanup errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Access denied');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => storage.clearOldData()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('sync queue integration', () => {
    it('should add syncable data to background sync queue', async () => {
      const BackgroundSyncService = require('../../services/BackgroundSyncService').default;
      const mockSyncService = BackgroundSyncService.getInstance();

      storage.set('pomodoro_settings', { workDuration: 25 });

      // Wait for async sync queue addition
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockSyncService.addToSyncQueue).toHaveBeenCalledWith('settings', { workDuration: 25 });
    });

    it('should handle sync queue errors gracefully', async () => {
      const BackgroundSyncService = require('../../services/BackgroundSyncService').default;
      BackgroundSyncService.getInstance.mockImplementation(() => {
        throw new Error('Sync service error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      storage.set('pomodoro_sessions', { id: 'test' });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith('Failed to add to sync queue:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should not sync non-syncable data', async () => {
      const BackgroundSyncService = require('../../services/BackgroundSyncService').default;
      const mockSyncService = BackgroundSyncService.getInstance();

      storage.set('random_key', { value: 'test' });

      // Wait for potential async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockSyncService.addToSyncQueue).not.toHaveBeenCalled();
    });
  });
});