import { Settings } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

/**
 * Service for managing user settings with local storage persistence
 */
export class SettingsService {
  private settings: Settings;
  private changeCallbacks: ((settings: Settings) => void)[] = [];

  constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * Get current settings
   */
  public getSettings(): Settings {
    return { ...this.settings };
  }

  /**
   * Update settings with validation and persistence
   */
  public updateSettings(newSettings: Partial<Settings>): void {
    const validatedSettings = this.validateSettings({ ...this.settings, ...newSettings });
    this.settings = validatedSettings;
    this.saveSettings();
    this.notifyChange();
  }

  /**
   * Reset settings to default values
   */
  public resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    this.notifyChange();
  }

  /**
   * Subscribe to settings changes
   * @param callback Function to call when settings change
   * @returns Unsubscribe function
   */
  public onSettingsChange(callback: (settings: Settings) => void): () => void {
    this.changeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.changeCallbacks.indexOf(callback);
      if (index > -1) {
        this.changeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Load settings from local storage
   */
  private loadSettings(): Settings {
    const stored = storage.get(STORAGE_KEYS.SETTINGS, null);
    if (stored) {
      return this.validateSettings(stored);
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Save settings to local storage
   */
  private saveSettings(): void {
    storage.set(STORAGE_KEYS.SETTINGS, this.settings);
  }

  /**
   * Validate settings and apply bounds checking
   */
  private validateSettings(settings: Partial<Settings>): Settings {
    const validated: Settings = {
      workDuration: this.validateDuration(settings.workDuration, 5, 60, DEFAULT_SETTINGS.workDuration),
      shortBreakDuration: this.validateDuration(settings.shortBreakDuration, 1, 15, DEFAULT_SETTINGS.shortBreakDuration),
      longBreakDuration: this.validateDuration(settings.longBreakDuration, 5, 30, DEFAULT_SETTINGS.longBreakDuration),
      soundEnabled: typeof settings.soundEnabled === 'boolean' ? settings.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
      notificationsEnabled: typeof settings.notificationsEnabled === 'boolean' ? settings.notificationsEnabled : DEFAULT_SETTINGS.notificationsEnabled,
      autoStartBreaks: typeof settings.autoStartBreaks === 'boolean' ? settings.autoStartBreaks : DEFAULT_SETTINGS.autoStartBreaks,
      autoStartWork: typeof settings.autoStartWork === 'boolean' ? settings.autoStartWork : DEFAULT_SETTINGS.autoStartWork
    };

    return validated;
  }

  /**
   * Validate duration with bounds checking
   */
  private validateDuration(value: unknown, min: number, max: number, defaultValue: number): number {
    if (typeof value === 'number' && !isNaN(value) && value >= min && value <= max) {
      return Math.round(value);
    }
    return defaultValue;
  }

  /**
   * Notify all subscribers of settings changes
   */
  private notifyChange(): void {
    this.changeCallbacks.forEach(callback => callback(this.getSettings()));
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.changeCallbacks = [];
  }
}

// Export singleton instance
export const settingsService = new SettingsService();