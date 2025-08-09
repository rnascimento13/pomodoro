---
inclusion: manual
---

# Timer Implementation Guide

## Timer Accuracy Considerations

### Browser Tab Throttling
Modern browsers throttle JavaScript execution in background tabs, which can affect timer accuracy. Here are strategies to maintain precision:

```javascript
// Use Page Visibility API to detect tab state
const useTabVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

// Compensate for time drift when tab becomes visible
const useAccurateTimer = (duration) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [startTime, setStartTime] = useState(null);
  const isVisible = useTabVisibility();

  useEffect(() => {
    if (!startTime || timeRemaining <= 0) return;

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);
    };

    // Update immediately when tab becomes visible
    if (isVisible) {
      updateTimer();
    }

    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, duration, isVisible]);

  return { timeRemaining, start: () => setStartTime(Date.now()) };
};
```

### Web Workers for Background Timing
For critical timing accuracy, consider using Web Workers:

```javascript
// timer-worker.js
let timerId = null;
let startTime = null;
let duration = 0;

self.onmessage = function(e) {
  const { action, payload } = e.data;

  switch (action) {
    case 'START':
      startTime = Date.now();
      duration = payload.duration * 1000; // Convert to milliseconds
      timerId = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        
        self.postMessage({
          type: 'TICK',
          remaining: Math.ceil(remaining / 1000)
        });

        if (remaining <= 0) {
          clearInterval(timerId);
          self.postMessage({ type: 'COMPLETE' });
        }
      }, 100); // Update every 100ms for smooth UI
      break;

    case 'PAUSE':
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      break;

    case 'STOP':
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      startTime = null;
      break;
  }
};
```

## Audio Implementation

### Handling Autoplay Restrictions
```javascript
const useAudioNotifications = () => {
  const [audioContext, setAudioContext] = useState(null);
  const [canPlayAudio, setCanPlayAudio] = useState(false);

  useEffect(() => {
    // Initialize audio context on user interaction
    const initAudio = () => {
      if (!audioContext) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
        setCanPlayAudio(true);
      }
    };

    // Listen for first user interaction
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, initAudio, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, initAudio);
      });
    };
  }, [audioContext]);

  const playNotificationSound = async (soundType = 'default') => {
    if (!canPlayAudio || !audioContext) return;

    try {
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Load and play audio file
      const response = await fetch(`/sounds/${soundType}.mp3`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  return { playNotificationSound, canPlayAudio };
};
```

### Fallback Audio Implementation
```javascript
const AudioNotification = ({ soundEnabled, soundType }) => {
  const audioRef = useRef(null);

  const playSound = useCallback(() => {
    if (!soundEnabled || !audioRef.current) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(error => {
      console.error('Error playing audio:', error);
    });
  }, [soundEnabled]);

  return (
    <audio
      ref={audioRef}
      preload="auto"
      src={`/sounds/${soundType}.mp3`}
    />
  );
};
```

## State Management Patterns

### Timer State Machine
```javascript
const TIMER_STATES = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed'
};

const SESSION_TYPES = {
  WORK: 'work',
  SHORT_BREAK: 'short_break',
  LONG_BREAK: 'long_break'
};

const useTimerStateMachine = () => {
  const [state, setState] = useState({
    status: TIMER_STATES.IDLE,
    sessionType: SESSION_TYPES.WORK,
    timeRemaining: 25 * 60, // 25 minutes in seconds
    sessionCount: 0,
    cycleCount: 0
  });

  const actions = {
    start: () => setState(prev => ({ 
      ...prev, 
      status: TIMER_STATES.RUNNING 
    })),
    
    pause: () => setState(prev => ({ 
      ...prev, 
      status: TIMER_STATES.PAUSED 
    })),
    
    reset: () => setState(prev => ({
      ...prev,
      status: TIMER_STATES.IDLE,
      timeRemaining: getSessionDuration(prev.sessionType)
    })),
    
    complete: () => setState(prev => {
      const nextSession = getNextSessionType(prev);
      return {
        ...prev,
        status: TIMER_STATES.COMPLETED,
        sessionType: nextSession.type,
        sessionCount: nextSession.sessionCount,
        cycleCount: nextSession.cycleCount,
        timeRemaining: getSessionDuration(nextSession.type)
      };
    })
  };

  return [state, actions];
};
```

## Local Storage Patterns

### Robust Data Persistence
```javascript
const STORAGE_KEYS = {
  SETTINGS: 'pomodoro_settings',
  STATISTICS: 'pomodoro_statistics',
  TIMER_STATE: 'pomodoro_timer_state'
};

const usePersistedState = (key, defaultValue) => {
  const [state, setState] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return defaultValue;
    }
  });

  const setPersistedState = useCallback((value) => {
    try {
      setState(value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
      // Handle quota exceeded or other storage errors
      if (error.name === 'QuotaExceededError') {
        // Clear old data or notify user
        clearOldData();
      }
    }
  }, [key]);

  return [state, setPersistedState];
};

// Data migration helper
const migrateStorageData = () => {
  const version = localStorage.getItem('data_version') || '1.0.0';
  
  if (version < '2.0.0') {
    // Migrate old data format
    const oldSettings = localStorage.getItem('settings');
    if (oldSettings) {
      const newSettings = transformOldSettings(JSON.parse(oldSettings));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
      localStorage.removeItem('settings');
    }
    localStorage.setItem('data_version', '2.0.0');
  }
};
```

## Performance Optimization

### Efficient Re-renders
```javascript
// Memoize expensive calculations
const TimerDisplay = memo(({ timeRemaining, totalTime, sessionType }) => {
  const progress = useMemo(() => {
    return ((totalTime - timeRemaining) / totalTime) * 100;
  }, [timeRemaining, totalTime]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  return (
    <div className={`timer-display ${sessionType}`}>
      <CircularProgress value={progress} />
      <div className="time-text">{formattedTime}</div>
    </div>
  );
});

// Debounce settings updates
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

## Error Handling

### Graceful Degradation
```javascript
const TimerComponent = () => {
  const [error, setError] = useState(null);

  const handleError = useCallback((error) => {
    console.error('Timer error:', error);
    setError(error.message);
    
    // Report error to monitoring service
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
  }, []);

  if (error) {
    return (
      <div className="error-state">
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button onClick={() => setError(null)}>Try Again</button>
      </div>
    );
  }

  return <Timer onError={handleError} />;
};

// Error boundary for timer components
class TimerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Timer error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Timer Error</h2>
          <p>The timer encountered an error. Please refresh the page.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```