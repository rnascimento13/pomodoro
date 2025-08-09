import { SessionType, TimerState, Settings, Session } from '../types';
import { DEFAULT_SETTINGS, SESSIONS_UNTIL_LONG_BREAK, TIMER_TICK_INTERVAL } from '../utils/constants';
import { statisticsService } from './StatisticsService';
import { notificationService } from './NotificationService';

export class TimerService {
  private timerState: TimerState;
  private settings: Settings;
  private intervalId: NodeJS.Timeout | null = null;
  private tickCallbacks: ((time: number) => void)[] = [];
  private completeCallbacks: ((sessionType: SessionType) => void)[] = [];
  private currentSessionStartTime: Date | null = null;

  constructor(settings: Settings = DEFAULT_SETTINGS) {
    this.settings = settings;
    this.timerState = this.getInitialState();
    
    // Initialize notification service with current settings
    notificationService.setSoundEnabled(settings.soundEnabled);
    notificationService.setNotificationsEnabled(settings.notificationsEnabled);
    
    // Load audio files asynchronously
    notificationService.loadAudioFiles().catch(error => {
      console.warn('Failed to load audio files:', error);
    });
  }

  private getInitialState(): TimerState {
    return {
      isRunning: false,
      isPaused: false,
      currentTime: this.settings.workDuration * 60, // Convert minutes to seconds
      totalTime: this.settings.workDuration * 60,
      sessionType: SessionType.WORK,
      sessionCount: 1,
      cycleCount: 0
    };
  }

  public start(): void {
    if (this.timerState.isPaused) {
      // Resume from pause
      this.timerState.isPaused = false;
      this.timerState.isRunning = true;
    } else if (!this.timerState.isRunning) {
      // Start new session
      this.timerState.isRunning = true;
      this.timerState.isPaused = false;
      // Record session start time
      this.currentSessionStartTime = new Date();
    }

    this.startInterval();
  }

  public pause(): void {
    if (this.timerState.isRunning) {
      this.timerState.isRunning = false;
      this.timerState.isPaused = true;
      this.stopInterval();
    }
  }

  public reset(): void {
    this.stopInterval();
    // Clear session start time since we're resetting
    this.currentSessionStartTime = null;
    const duration = this.getDurationForSessionType(this.timerState.sessionType);
    this.timerState = {
      ...this.timerState,
      isRunning: false,
      isPaused: false,
      currentTime: duration * 60,
      totalTime: duration * 60
    };
    this.notifyTick();
  }

  public skip(): void {
    this.stopInterval();
    
    const completedSessionType = this.timerState.sessionType;
    
    // Clear session start time since we're skipping (don't record as completed in statistics)
    this.currentSessionStartTime = null;
    
    // Notify completion for UI purposes (but don't record in statistics)
    this.completeCallbacks.forEach(callback => callback(completedSessionType));
    
    // Move to next session
    this.moveToNextSession();
  }

  public getCurrentTime(): number {
    return this.timerState.currentTime;
  }

  public getSessionType(): SessionType {
    return this.timerState.sessionType;
  }

  public getTimerState(): TimerState {
    return { ...this.timerState };
  }

  public updateSettings(newSettings: Settings): void {
    this.settings = newSettings;
    
    // Update notification service settings
    notificationService.setSoundEnabled(newSettings.soundEnabled);
    notificationService.setNotificationsEnabled(newSettings.notificationsEnabled);
    
    // If timer is not running, update current time to match new duration
    if (!this.timerState.isRunning && !this.timerState.isPaused) {
      const duration = this.getDurationForSessionType(this.timerState.sessionType);
      this.timerState.currentTime = duration * 60;
      this.timerState.totalTime = duration * 60;
      this.notifyTick();
    }
  }

  public onTick(callback: (time: number) => void): () => void {
    this.tickCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.tickCallbacks.indexOf(callback);
      if (index > -1) {
        this.tickCallbacks.splice(index, 1);
      }
    };
  }

  public onComplete(callback: (sessionType: SessionType) => void): () => void {
    this.completeCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.completeCallbacks.indexOf(callback);
      if (index > -1) {
        this.completeCallbacks.splice(index, 1);
      }
    };
  }

  private startInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.timerState.currentTime--;
      this.notifyTick();
      
      if (this.timerState.currentTime <= 0) {
        this.completeCurrentSession();
      }
    }, TIMER_TICK_INTERVAL);
  }

  private stopInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private completeCurrentSession(): void {
    this.stopInterval();
    
    const completedSessionType = this.timerState.sessionType;
    const endTime = new Date();
    
    // Record the completed session in statistics if we have a start time
    if (this.currentSessionStartTime) {
      const duration = Math.round((endTime.getTime() - this.currentSessionStartTime.getTime()) / (1000 * 60)); // Duration in minutes
      
      const session: Session = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: completedSessionType,
        startTime: this.currentSessionStartTime,
        endTime: endTime,
        completed: true,
        duration: duration
      };
      
      statisticsService.recordSession(session);
      this.currentSessionStartTime = null;
    }
    
    // Show notification for session completion
    notificationService.showSessionCompleteNotification(completedSessionType);
    
    // Notify completion
    this.completeCallbacks.forEach(callback => callback(completedSessionType));
    
    // Move to next session
    this.moveToNextSession();
  }

  private moveToNextSession(): void {
    const currentType = this.timerState.sessionType;
    
    if (currentType === SessionType.WORK) {
      // After work session, determine break type
      const isLongBreak = this.timerState.sessionCount >= SESSIONS_UNTIL_LONG_BREAK;
      
      if (isLongBreak) {
        this.timerState.sessionType = SessionType.LONG_BREAK;
        this.timerState.sessionCount = 1; // Reset session count
        this.timerState.cycleCount++; // Increment cycle count
      } else {
        this.timerState.sessionType = SessionType.SHORT_BREAK;
      }
    } else {
      // After any break, go to work session
      this.timerState.sessionType = SessionType.WORK;
      if (currentType === SessionType.SHORT_BREAK) {
        this.timerState.sessionCount++; // Increment session count only after short breaks
      }
    }

    // Set up timer for new session
    const duration = this.getDurationForSessionType(this.timerState.sessionType);
    this.timerState.currentTime = duration * 60;
    this.timerState.totalTime = duration * 60;
    this.timerState.isRunning = false;
    this.timerState.isPaused = false;

    this.notifyTick();
  }

  private getDurationForSessionType(sessionType: SessionType): number {
    switch (sessionType) {
      case SessionType.WORK:
        return this.settings.workDuration;
      case SessionType.SHORT_BREAK:
        return this.settings.shortBreakDuration;
      case SessionType.LONG_BREAK:
        return this.settings.longBreakDuration;
      default:
        return this.settings.workDuration;
    }
  }

  private notifyTick(): void {
    this.tickCallbacks.forEach(callback => callback(this.timerState.currentTime));
  }

  public destroy(): void {
    this.stopInterval();
    this.tickCallbacks = [];
    this.completeCallbacks = [];
  }
}