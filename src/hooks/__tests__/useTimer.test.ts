import { renderHook, act } from '@testing-library/react';
import { useTimer } from '../useTimer';
import { SessionType, Settings } from '../../types';
import { DEFAULT_SETTINGS } from '../../utils/constants';

// Mock TimerService
const mockTimerService = {
  start: jest.fn(),
  pause: jest.fn(),
  reset: jest.fn(),
  skip: jest.fn(),
  updateSettings: jest.fn(),
  getTimerState: jest.fn(),
  onTick: jest.fn(),
  onComplete: jest.fn(),
  destroy: jest.fn()
};

jest.mock('../../services/TimerService', () => ({
  TimerService: jest.fn().mockImplementation(() => mockTimerService)
}));

// Mock timers
jest.useFakeTimers();

describe('useTimer hook', () => {
  const mockSettings: Settings = {
    ...DEFAULT_SETTINGS,
    workDuration: 1, // 1 minute for testing
    shortBreakDuration: 1,
    longBreakDuration: 2
  };

  const mockTimerState = {
    isRunning: false,
    isPaused: false,
    currentTime: 60,
    totalTime: 60,
    sessionType: SessionType.WORK,
    sessionCount: 1,
    cycleCount: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimerService.getTimerState.mockReturnValue(mockTimerState);
    mockTimerService.onTick.mockReturnValue(jest.fn()); // Mock unsubscribe function
    mockTimerService.onComplete.mockReturnValue(jest.fn()); // Mock unsubscribe function
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      const { result } = renderHook(() => useTimer());

      expect(result.current.timerState).toEqual(mockTimerState);
      expect(mockTimerService.getTimerState).toHaveBeenCalled();
    });

    it('should initialize with custom settings', () => {
      const customSettings = { ...mockSettings, workDuration: 30 };
      
      renderHook(() => useTimer(customSettings));

      const TimerService = require('../../services/TimerService').TimerService;
      expect(TimerService).toHaveBeenCalledWith(customSettings);
    });

    it('should set up timer callbacks on mount', () => {
      renderHook(() => useTimer(mockSettings));

      expect(mockTimerService.onTick).toHaveBeenCalled();
      expect(mockTimerService.onComplete).toHaveBeenCalled();
    });
  });

  describe('timer controls', () => {
    it('should start timer', () => {
      const { result } = renderHook(() => useTimer(mockSettings));

      act(() => {
        result.current.start();
      });

      expect(mockTimerService.start).toHaveBeenCalled();
    });

    it('should pause timer', () => {
      const { result } = renderHook(() => useTimer(mockSettings));

      act(() => {
        result.current.pause();
      });

      expect(mockTimerService.pause).toHaveBeenCalled();
    });

    it('should reset timer', () => {
      const { result } = renderHook(() => useTimer(mockSettings));

      act(() => {
        result.current.reset();
      });

      expect(mockTimerService.reset).toHaveBeenCalled();
    });

    it('should skip timer', () => {
      const { result } = renderHook(() => useTimer(mockSettings));

      act(() => {
        result.current.skip();
      });

      expect(mockTimerService.skip).toHaveBeenCalled();
    });
  });

  describe('settings updates', () => {
    it('should update timer settings', () => {
      const { result } = renderHook(() => useTimer(mockSettings));
      const newSettings = { ...mockSettings, workDuration: 30 };

      act(() => {
        result.current.updateSettings(newSettings);
      });

      expect(mockTimerService.updateSettings).toHaveBeenCalledWith(newSettings);
      expect(mockTimerService.getTimerState).toHaveBeenCalled();
    });
  });

  describe('timer callbacks', () => {
    it('should update state on timer tick', () => {
      let tickCallback: ((time: number) => void) | undefined;
      mockTimerService.onTick.mockImplementation((callback) => {
        tickCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useTimer(mockSettings));

      // Simulate timer tick
      const newState = { ...mockTimerState, currentTime: 59 };
      mockTimerService.getTimerState.mockReturnValue(newState);

      act(() => {
        tickCallback?.(59);
      });

      expect(result.current.timerState).toEqual(newState);
    });

    it('should handle session completion', () => {
      let completeCallback: ((sessionType: SessionType) => void) | undefined;
      mockTimerService.onComplete.mockImplementation((callback) => {
        completeCallback = callback;
        return jest.fn();
      });

      const onSessionComplete = jest.fn();
      const { result } = renderHook(() => useTimer(mockSettings, onSessionComplete));

      // Simulate session completion
      const newState = { ...mockTimerState, sessionType: SessionType.SHORT_BREAK };
      mockTimerService.getTimerState.mockReturnValue(newState);

      act(() => {
        completeCallback?.(SessionType.WORK);
      });

      expect(onSessionComplete).toHaveBeenCalledWith(SessionType.WORK);
      expect(result.current.timerState).toEqual(newState);
    });

    it('should work without onSessionComplete callback', () => {
      let completeCallback: ((sessionType: SessionType) => void) | undefined;
      mockTimerService.onComplete.mockImplementation((callback) => {
        completeCallback = callback;
        return jest.fn();
      });

      renderHook(() => useTimer(mockSettings));

      // Should not throw error when callback is undefined
      expect(() => {
        act(() => {
          completeCallback?.(SessionType.WORK);
        });
      }).not.toThrow();
    });
  });

  describe('time formatting', () => {
    it('should format time correctly', () => {
      const { result } = renderHook(() => useTimer(mockSettings));

      expect(result.current.formatTime(0)).toBe('00:00');
      expect(result.current.formatTime(59)).toBe('00:59');
      expect(result.current.formatTime(60)).toBe('01:00');
      expect(result.current.formatTime(125)).toBe('02:05');
      expect(result.current.formatTime(3661)).toBe('61:01');
    });

    it('should handle edge cases in time formatting', () => {
      const { result } = renderHook(() => useTimer(mockSettings));

      expect(result.current.formatTime(-1)).toBe('00:00'); // Negative time
      expect(result.current.formatTime(0.5)).toBe('00:00'); // Decimal seconds
    });
  });

  describe('cleanup', () => {
    it('should cleanup timer service on unmount', () => {
      const mockUnsubscribeTick = jest.fn();
      const mockUnsubscribeComplete = jest.fn();

      mockTimerService.onTick.mockReturnValue(mockUnsubscribeTick);
      mockTimerService.onComplete.mockReturnValue(mockUnsubscribeComplete);

      const { unmount } = renderHook(() => useTimer(mockSettings));

      unmount();

      expect(mockUnsubscribeTick).toHaveBeenCalled();
      expect(mockUnsubscribeComplete).toHaveBeenCalled();
      expect(mockTimerService.destroy).toHaveBeenCalled();
    });
  });

  describe('memoization', () => {
    it('should memoize control functions', () => {
      const { result, rerender } = renderHook(() => useTimer(mockSettings));

      const initialStart = result.current.start;
      const initialPause = result.current.pause;
      const initialReset = result.current.reset;
      const initialSkip = result.current.skip;
      const initialFormatTime = result.current.formatTime;

      rerender();

      expect(result.current.start).toBe(initialStart);
      expect(result.current.pause).toBe(initialPause);
      expect(result.current.reset).toBe(initialReset);
      expect(result.current.skip).toBe(initialSkip);
      expect(result.current.formatTime).toBe(initialFormatTime);
    });

    it('should recreate updateSettings when timerState changes', () => {
      const { result, rerender } = renderHook(() => useTimer(mockSettings));

      const initialUpdateSettings = result.current.updateSettings;

      // Change timer state
      const newState = { ...mockTimerState, currentTime: 30 };
      mockTimerService.getTimerState.mockReturnValue(newState);

      rerender();

      // updateSettings should be recreated due to timerState dependency
      expect(result.current.updateSettings).not.toBe(initialUpdateSettings);
    });
  });
});