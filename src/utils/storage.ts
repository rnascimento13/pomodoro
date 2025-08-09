// In-memory fallback storage for when localStorage is unavailable
const memoryStorage = new Map<string, string>();

// Lazy import to avoid circular dependencies
let backgroundSyncService: any = null;
const getBackgroundSyncService = async () => {
  if (!backgroundSyncService) {
    const { default: BackgroundSyncService } = await import('../services/BackgroundSyncService');
    backgroundSyncService = BackgroundSyncService.getInstance();
  }
  return backgroundSyncService;
};

export interface StorageError {
  type: 'quota_exceeded' | 'access_denied' | 'parse_error' | 'unknown';
  message: string;
  key?: string;
}

export type StorageErrorHandler = (error: StorageError) => void;

/**
 * Safe localStorage wrapper with error handling and fallback mechanisms
 */
export const storage = {
  errorHandlers: new Set<StorageErrorHandler>(),

  /**
   * Add error handler for storage operations
   */
  onError: (handler: StorageErrorHandler): (() => void) => {
    storage.errorHandlers.add(handler);
    return () => storage.errorHandlers.delete(handler);
  },

  /**
   * Handle storage errors and notify handlers
   */
  handleError: (error: Error, key?: string): StorageError => {
    let storageError: StorageError;

    if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
      storageError = {
        type: 'quota_exceeded',
        message: 'Storage quota exceeded. Some data may not be saved.',
        key
      };
    } else if (error.message.includes('access') || error.message.includes('denied')) {
      storageError = {
        type: 'access_denied',
        message: 'Storage access denied. Using temporary storage.',
        key
      };
    } else if (error instanceof SyntaxError) {
      storageError = {
        type: 'parse_error',
        message: 'Failed to parse stored data. Using default values.',
        key
      };
    } else {
      storageError = {
        type: 'unknown',
        message: `Storage error: ${error.message}`,
        key
      };
    }

    // Notify error handlers
    storage.errorHandlers.forEach(handler => {
      try {
        handler(storageError);
      } catch (handlerError) {
        console.error('Error in storage error handler:', handlerError);
      }
    });

    return storageError;
  },

  /**
   * Get item from localStorage with error handling and fallback
   */
  get: <T>(key: string, defaultValue: T): T => {
    try {
      // Try localStorage first
      if (storage.isAvailable()) {
        const item = localStorage.getItem(key);
        if (item !== null) {
          return JSON.parse(item);
        }
      }

      // Fallback to memory storage
      const memoryItem = memoryStorage.get(key);
      if (memoryItem !== undefined) {
        return JSON.parse(memoryItem);
      }

      return defaultValue;
    } catch (error) {
      console.error(`Error reading from storage (key: ${key}):`, error);
      storage.handleError(error as Error, key);
      return defaultValue;
    }
  },

  /**
   * Set item in localStorage with error handling and fallback
   */
  set: (key: string, value: unknown): boolean => {
    try {
      const serialized = JSON.stringify(value);

      // Try localStorage first
      if (storage.isAvailable()) {
        localStorage.setItem(key, serialized);
        
        // Add to background sync queue for important data
        storage.addToSyncQueue(key, value);
        
        return true;
      }

      // Fallback to memory storage
      memoryStorage.set(key, serialized);
      
      // Still add to sync queue even with memory storage
      storage.addToSyncQueue(key, value);
      
      return true;
    } catch (error) {
      console.error(`Error writing to storage (key: ${key}):`, error);
      const storageError = storage.handleError(error as Error, key);

      // If quota exceeded, try to clear some space
      if (storageError.type === 'quota_exceeded') {
        storage.clearOldData();
        
        // Try again after cleanup
        try {
          const serialized = JSON.stringify(value);
          if (storage.isAvailable()) {
            localStorage.setItem(key, serialized);
            storage.addToSyncQueue(key, value);
            return true;
          }
          memoryStorage.set(key, serialized);
          storage.addToSyncQueue(key, value);
          return true;
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
        }
      }

      // Final fallback to memory storage
      try {
        memoryStorage.set(key, JSON.stringify(value));
        storage.addToSyncQueue(key, value);
        return true;
      } catch (memoryError) {
        console.error('Failed to save to memory storage:', memoryError);
        return false;
      }
    }
  },

  /**
   * Remove item from localStorage with error handling
   */
  remove: (key: string): boolean => {
    try {
      if (storage.isAvailable()) {
        localStorage.removeItem(key);
      }
      memoryStorage.delete(key);
      return true;
    } catch (error) {
      console.error(`Error removing from storage (key: ${key}):`, error);
      storage.handleError(error as Error, key);
      return false;
    }
  },

  /**
   * Clear all storage data
   */
  clear: (): boolean => {
    try {
      if (storage.isAvailable()) {
        localStorage.clear();
      }
      memoryStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      storage.handleError(error as Error);
      return false;
    }
  },

  /**
   * Get storage usage information
   */
  getUsage: (): { used: number; available: number; percentage: number } => {
    try {
      if (!storage.isAvailable()) {
        return { used: 0, available: 0, percentage: 0 };
      }

      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // Estimate available space (most browsers have ~5-10MB limit)
      const estimated = 5 * 1024 * 1024; // 5MB estimate
      const available = Math.max(0, estimated - used);
      const percentage = (used / estimated) * 100;

      return { used, available, percentage };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  },

  /**
   * Clear old data to free up space
   */
  clearOldData: (): void => {
    try {
      if (!storage.isAvailable()) return;

      const keysToCheck = ['pomodoro_statistics', 'pomodoro_sessions'];
      
      for (const key of keysToCheck) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            
            // If it's statistics data, clean up old entries
            if (parsed.dailyStats && Array.isArray(parsed.dailyStats)) {
              const cutoffDate = new Date();
              cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep only last 30 days
              
              parsed.dailyStats = parsed.dailyStats.filter((stat: any) => 
                new Date(stat.date) >= cutoffDate
              );
              
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          } catch (parseError) {
            // If we can't parse it, remove it
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error clearing old data:', error);
    }
  },

  /**
   * Check if localStorage is available
   */
  isAvailable: (): boolean => {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if we're using fallback storage
   */
  isUsingFallback: (): boolean => {
    return !storage.isAvailable();
  },

  /**
   * Add data to background sync queue
   */
  addToSyncQueue: (key: string, value: unknown): void => {
    // Only sync important data types
    const syncableKeys = ['pomodoro_settings', 'pomodoro_statistics', 'pomodoro_sessions'];
    
    if (syncableKeys.some(syncKey => key.includes(syncKey))) {
      getBackgroundSyncService().then(syncService => {
        let syncType: 'session' | 'settings' | 'statistics' = 'session';
        
        if (key.includes('settings')) {
          syncType = 'settings';
        } else if (key.includes('statistics')) {
          syncType = 'statistics';
        }
        
        syncService.addToSyncQueue(syncType, value);
      }).catch(error => {
        console.warn('Failed to add to sync queue:', error);
      });
    }
  }
};