import { SettingsService } from '../SettingsService';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../../utils/constants';
import { Settings } from '../../types';

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

describe('SettingsService', () => {
  let settingsService: SettingsService;

  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
    settingsService = new SettingsService();
  });

  afterEach(() => {
    settingsService.destroy();
  });

  describe('initialization', () => {
    it('should initialize with default settings when localStorage is empty', () => {
      const settings = settingsService.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should load settings from localStorage when available', () => {
      const savedSettings: Settings = {
        ...DEFAULT_SETTINGS,
        workDuration: 30,
        soundEnabled: false
      };
      
      // Set up localStorage before creating service
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings));
      
      const newService = new SettingsService();
      const settings = newService.getSettings();
      
      expect(settings.workDuration).toBe(30);
      expect(settings.soundEnabled).toBe(false);
      
      newService.destroy();
    });

    it('should use default settings when localStorage contains invalid data', () => {
      mockLocalStorage.setItem(STORAGE_KEYS.SETTINGS, 'invalid json');
      
      const newService = new SettingsService();
      const settings = newService.getSettings();
      
      expect(settings).toEqual(DEFAULT_SETTINGS);
      
      newService.destroy();
    });
  });

  describe('getSettings', () => {
    it('should return a copy of settings to prevent mutation', () => {
      const settings1 = settingsService.getSettings();
      const settings2 = settingsService.getSettings();
      
      expect(settings1).toEqual(settings2);
      expect(settings1).not.toBe(settings2);
    });
  });

  describe('updateSettings', () => {
    it('should update settings and save to localStorage', () => {
      const updates = { workDuration: 30, soundEnabled: false };
      
      settingsService.updateSettings(updates);
      
      const settings = settingsService.getSettings();
      expect(settings.workDuration).toBe(30);
      expect(settings.soundEnabled).toBe(false);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settings)
      );
    });

    it('should validate work duration bounds (5-60 minutes)', () => {
      settingsService.updateSettings({ workDuration: 3 }); // Below minimum
      expect(settingsService.getSettings().workDuration).toBe(DEFAULT_SETTINGS.workDuration);
      
      settingsService.updateSettings({ workDuration: 70 }); // Above maximum
      expect(settingsService.getSettings().workDuration).toBe(DEFAULT_SETTINGS.workDuration);
      
      settingsService.updateSettings({ workDuration: 30 }); // Valid
      expect(settingsService.getSettings().workDuration).toBe(30);
    });

    it('should validate short break duration bounds (1-15 minutes)', () => {
      settingsService.updateSettings({ shortBreakDuration: 0 }); // Below minimum
      expect(settingsService.getSettings().shortBreakDuration).toBe(DEFAULT_SETTINGS.shortBreakDuration);
      
      settingsService.updateSettings({ shortBreakDuration: 20 }); // Above maximum
      expect(settingsService.getSettings().shortBreakDuration).toBe(DEFAULT_SETTINGS.shortBreakDuration);
      
      settingsService.updateSettings({ shortBreakDuration: 10 }); // Valid
      expect(settingsService.getSettings().shortBreakDuration).toBe(10);
    });

    it('should validate long break duration bounds (5-30 minutes)', () => {
      settingsService.updateSettings({ longBreakDuration: 3 }); // Below minimum
      expect(settingsService.getSettings().longBreakDuration).toBe(DEFAULT_SETTINGS.longBreakDuration);
      
      settingsService.updateSettings({ longBreakDuration: 40 }); // Above maximum
      expect(settingsService.getSettings().longBreakDuration).toBe(DEFAULT_SETTINGS.longBreakDuration);
      
      settingsService.updateSettings({ longBreakDuration: 20 }); // Valid
      expect(settingsService.getSettings().longBreakDuration).toBe(20);
    });

    it('should round duration values to integers', () => {
      settingsService.updateSettings({ workDuration: 25.7 });
      expect(settingsService.getSettings().workDuration).toBe(26);
    });

    it('should validate boolean settings', () => {
      settingsService.updateSettings({ soundEnabled: 'true' as any });
      expect(settingsService.getSettings().soundEnabled).toBe(DEFAULT_SETTINGS.soundEnabled);
      
      settingsService.updateSettings({ soundEnabled: false });
      expect(settingsService.getSettings().soundEnabled).toBe(false);
    });

    it('should handle invalid duration types', () => {
      settingsService.updateSettings({ workDuration: 'invalid' as any });
      expect(settingsService.getSettings().workDuration).toBe(DEFAULT_SETTINGS.workDuration);
      
      settingsService.updateSettings({ workDuration: NaN });
      expect(settingsService.getSettings().workDuration).toBe(DEFAULT_SETTINGS.workDuration);
    });

    it('should notify subscribers of changes', () => {
      const callback = jest.fn();
      settingsService.onSettingsChange(callback);
      
      settingsService.updateSettings({ workDuration: 30 });
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ workDuration: 30 })
      );
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all settings to default values', () => {
      // First modify some settings
      settingsService.updateSettings({
        workDuration: 30,
        soundEnabled: false,
        autoStartBreaks: true
      });
      
      // Then reset
      settingsService.resetToDefaults();
      
      const settings = settingsService.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should save default settings to localStorage', () => {
      settingsService.resetToDefaults();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(DEFAULT_SETTINGS)
      );
    });

    it('should notify subscribers of reset', () => {
      const callback = jest.fn();
      settingsService.onSettingsChange(callback);
      
      settingsService.resetToDefaults();
      
      expect(callback).toHaveBeenCalledWith(DEFAULT_SETTINGS);
    });
  });

  describe('onSettingsChange', () => {
    it('should subscribe to settings changes', () => {
      const callback = jest.fn();
      const unsubscribe = settingsService.onSettingsChange(callback);
      
      settingsService.updateSettings({ workDuration: 30 });
      expect(callback).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      settingsService.updateSettings({ workDuration: 35 });
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called after unsubscribe
    });

    it('should handle multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      settingsService.onSettingsChange(callback1);
      settingsService.onSettingsChange(callback2);
      
      settingsService.updateSettings({ workDuration: 30 });
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage setItem errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      expect(() => {
        settingsService.updateSettings({ workDuration: 30 });
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should handle localStorage getItem errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });
      
      expect(() => {
        new SettingsService();
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('destroy', () => {
    it('should clean up all subscribers', () => {
      const callback = jest.fn();
      settingsService.onSettingsChange(callback);
      
      settingsService.destroy();
      settingsService.updateSettings({ workDuration: 30 });
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
});