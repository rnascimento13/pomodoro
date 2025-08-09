// Core type definitions for the Pomodoro PWA

export enum SessionType {
  WORK = 'work',
  SHORT_BREAK = 'short_break',
  LONG_BREAK = 'long_break'
}

export interface Settings {
  workDuration: number; // minutes (5-60)
  shortBreakDuration: number; // minutes (1-15)
  longBreakDuration: number; // minutes (5-30)
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
}

export interface Session {
  id: string;
  type: SessionType;
  startTime: Date;
  endTime: Date;
  completed: boolean;
  duration: number; // actual duration in minutes
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number; // seconds remaining
  totalTime: number; // total session duration in seconds
  sessionType: SessionType;
  sessionCount: number; // current session in cycle (1-4)
  cycleCount: number; // completed cycles
}

export interface DailyStats {
  date: string;
  completedSessions: number;
  workMinutes: number;
  breakMinutes: number;
}

export interface UserStats {
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
  dailyStats: DailyStats[];
}

export enum SoundType {
  WORK_COMPLETE = 'work_complete',
  BREAK_COMPLETE = 'break_complete',
  TICK = 'tick'
}