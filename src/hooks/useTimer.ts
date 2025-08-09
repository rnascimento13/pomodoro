import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerService } from '../services/TimerService';
import { TimerState, SessionType, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../utils/constants';

export interface UseTimerReturn {
  timerState: TimerState;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  updateSettings: (settings: Settings) => void;
  formatTime: (seconds: number) => string;
}

export const useTimer = (
  initialSettings: Settings = DEFAULT_SETTINGS,
  onSessionComplete?: (sessionType: SessionType) => void
): UseTimerReturn => {
  const timerServiceRef = useRef<TimerService | null>(null);
  const [timerState, setTimerState] = useState<TimerState>(() => {
    // Initialize timer service and get initial state
    const service = new TimerService(initialSettings);
    timerServiceRef.current = service;
    return service.getTimerState();
  });

  // Initialize timer service and set up callbacks
  useEffect(() => {
    const timerService = timerServiceRef.current!;

    // Subscribe to timer ticks
    const unsubscribeTick = timerService.onTick(() => {
      setTimerState(timerService.getTimerState());
    });

    // Subscribe to session completions
    const unsubscribeComplete = timerService.onComplete((sessionType) => {
      setTimerState(timerService.getTimerState());
      if (onSessionComplete) {
        onSessionComplete(sessionType);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribeTick();
      unsubscribeComplete();
      timerService.destroy();
    };
  }, [onSessionComplete]);

  const start = useCallback(() => {
    timerServiceRef.current?.start();
  }, []);

  const pause = useCallback(() => {
    timerServiceRef.current?.pause();
  }, []);

  const reset = useCallback(() => {
    timerServiceRef.current?.reset();
  }, []);

  const skip = useCallback(() => {
    timerServiceRef.current?.skip();
  }, []);

  const updateSettings = useCallback((settings: Settings) => {
    timerServiceRef.current?.updateSettings(settings);
    setTimerState(timerServiceRef.current?.getTimerState() || timerState);
  }, [timerState]);

  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    timerState,
    start,
    pause,
    reset,
    skip,
    updateSettings,
    formatTime
  };
};