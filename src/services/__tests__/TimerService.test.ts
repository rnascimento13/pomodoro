import { TimerService } from '../TimerService';
import { SessionType, Settings } from '../../types';
import { DEFAULT_SETTINGS } from '../../utils/constants';

// Mock timers
jest.useFakeTimers();

describe('TimerService', () => {
  let timerService: TimerService;
  let mockSettings: Settings;

  beforeEach(() => {
    mockSettings = {
      ...DEFAULT_SETTINGS,
      workDuration: 1, // 1 minute for faster testing
      shortBreakDuration: 1,
      longBreakDuration: 2
    };
    timerService = new TimerService(mockSettings);
  });

  afterEach(() => {
    timerService.destroy();
    jest.clearAllTimers();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const state = timerService.getTimerState();
      
      expect(state.isRunning).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.currentTime).toBe(60); // 1 minute in seconds
      expect(state.totalTime).toBe(60);
      expect(state.sessionType).toBe(SessionType.WORK);
      expect(state.sessionCount).toBe(1);
      expect(state.cycleCount).toBe(0);
    });
  });

  describe('Timer Controls', () => {
    it('should start timer correctly', () => {
      timerService.start();
      const state = timerService.getTimerState();
      
      expect(state.isRunning).toBe(true);
      expect(state.isPaused).toBe(false);
    });

    it('should pause timer correctly', () => {
      timerService.start();
      timerService.pause();
      const state = timerService.getTimerState();
      
      expect(state.isRunning).toBe(false);
      expect(state.isPaused).toBe(true);
    });

    it('should resume from pause correctly', () => {
      timerService.start();
      timerService.pause();
      timerService.start(); // Resume
      const state = timerService.getTimerState();
      
      expect(state.isRunning).toBe(true);
      expect(state.isPaused).toBe(false);
    });

    it('should reset timer correctly', () => {
      timerService.start();
      
      // Advance timer
      jest.advanceTimersByTime(30000); // 30 seconds
      
      timerService.reset();
      const state = timerService.getTimerState();
      
      expect(state.isRunning).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.currentTime).toBe(60); // Back to full duration
    });
  });

  describe('Timer Progression', () => {
    it('should tick down correctly', () => {
      const tickCallback = jest.fn();
      timerService.onTick(tickCallback);
      
      timerService.start();
      
      // Advance by 5 seconds
      jest.advanceTimersByTime(5000);
      
      expect(timerService.getCurrentTime()).toBe(55);
      expect(tickCallback).toHaveBeenCalledWith(55);
    });

    it('should complete session when timer reaches zero', () => {
      const completeCallback = jest.fn();
      timerService.onComplete(completeCallback);
      
      timerService.start();
      
      // Advance to completion
      jest.advanceTimersByTime(60000); // 1 minute
      
      expect(completeCallback).toHaveBeenCalledWith(SessionType.WORK);
    });
  });

  describe('Session Transitions', () => {
    it('should transition from work to short break', () => {
      const completeCallback = jest.fn();
      timerService.onComplete(completeCallback);
      
      timerService.start();
      jest.advanceTimersByTime(60000); // Complete work session
      
      const state = timerService.getTimerState();
      expect(state.sessionType).toBe(SessionType.SHORT_BREAK);
      expect(state.sessionCount).toBe(1); // Should not increment yet
      expect(state.currentTime).toBe(60); // Short break duration
    });

    it('should transition from short break to work', () => {
      // Complete work session first
      timerService.start();
      jest.advanceTimersByTime(60000);
      
      // Now complete short break
      timerService.start();
      jest.advanceTimersByTime(60000);
      
      const state = timerService.getTimerState();
      expect(state.sessionType).toBe(SessionType.WORK);
      expect(state.sessionCount).toBe(2); // Should increment after short break
    });

    it('should transition to long break after 4 work sessions', () => {
      // Complete 4 work sessions
      for (let i = 0; i < 4; i++) {
        // Complete work session
        timerService.start();
        jest.advanceTimersByTime(60000);
        
        if (i < 3) {
          // Complete short break (except for the last one)
          timerService.start();
          jest.advanceTimersByTime(60000);
        }
      }
      
      const state = timerService.getTimerState();
      expect(state.sessionType).toBe(SessionType.LONG_BREAK);
      expect(state.sessionCount).toBe(1); // Should reset to 1
      expect(state.cycleCount).toBe(1); // Should increment cycle
      expect(state.currentTime).toBe(120); // Long break duration (2 minutes)
    });
  });

  describe('Settings Updates', () => {
    it('should update timer duration when settings change', () => {
      const newSettings = {
        ...mockSettings,
        workDuration: 2 // Change to 2 minutes
      };
      
      timerService.updateSettings(newSettings);
      
      const state = timerService.getTimerState();
      expect(state.currentTime).toBe(120); // 2 minutes in seconds
      expect(state.totalTime).toBe(120);
    });

    it('should not update duration if timer is running', () => {
      timerService.start();
      
      const newSettings = {
        ...mockSettings,
        workDuration: 2
      };
      
      timerService.updateSettings(newSettings);
      
      const state = timerService.getTimerState();
      expect(state.currentTime).toBe(60); // Should remain unchanged
    });
  });

  describe('Skip Functionality', () => {
    it('should skip current session', () => {
      const completeCallback = jest.fn();
      timerService.onComplete(completeCallback);
      
      timerService.start();
      jest.advanceTimersByTime(30000); // Advance halfway
      
      timerService.skip();
      
      expect(completeCallback).toHaveBeenCalledWith(SessionType.WORK);
      
      const state = timerService.getTimerState();
      expect(state.sessionType).toBe(SessionType.SHORT_BREAK);
      expect(state.isRunning).toBe(false);
    });
  });

  describe('Callback Management', () => {
    it('should allow unsubscribing from callbacks', () => {
      const tickCallback = jest.fn();
      const unsubscribe = timerService.onTick(tickCallback);
      
      timerService.start();
      jest.advanceTimersByTime(1000);
      
      expect(tickCallback).toHaveBeenCalled();
      
      tickCallback.mockClear();
      unsubscribe();
      
      jest.advanceTimersByTime(1000);
      expect(tickCallback).not.toHaveBeenCalled();
    });
  });
});