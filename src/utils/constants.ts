import { Settings, SessionType } from '../types';

// Default timer durations and settings
export const DEFAULT_SETTINGS: Settings = {
  workDuration: 25, // 25 minutes
  shortBreakDuration: 5, // 5 minutes
  longBreakDuration: 15, // 15 minutes
  soundEnabled: true,
  notificationsEnabled: false, // Will be enabled after user grants permission
  autoStartBreaks: false,
  autoStartWork: false
};

// Timer configuration
export const SESSIONS_UNTIL_LONG_BREAK = 4;
export const TIMER_TICK_INTERVAL = 1000; // 1 second

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'pomodoro_settings',
  STATISTICS: 'pomodoro_statistics',
  CURRENT_SESSION: 'pomodoro_current_session'
} as const;

// Session type display names
export const SESSION_NAMES = {
  [SessionType.WORK]: 'Work Session',
  [SessionType.SHORT_BREAK]: 'Short Break',
  [SessionType.LONG_BREAK]: 'Long Break'
} as const;

// Color themes for different session types
export const SESSION_COLORS = {
  [SessionType.WORK]: '#e53e3e',
  [SessionType.SHORT_BREAK]: '#38a169',
  [SessionType.LONG_BREAK]: '#3182ce'
} as const;