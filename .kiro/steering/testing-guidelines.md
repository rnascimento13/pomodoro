---
inclusion: manual
---

# Testing Guidelines for Pomodoro PWA

## Testing Strategy Overview

### Test Pyramid Structure
- **Unit Tests (70%)**: Test individual functions and components
- **Integration Tests (20%)**: Test component interactions and data flow
- **End-to-End Tests (10%)**: Test complete user workflows

## Unit Testing

### Timer Logic Testing
```javascript
// __tests__/services/TimerService.test.js
import { TimerService } from '../services/TimerService';

describe('TimerService', () => {
  let timerService;

  beforeEach(() => {
    timerService = new TimerService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should start timer with correct duration', () => {
    const duration = 25 * 60; // 25 minutes
    timerService.start(duration);
    
    expect(timerService.isRunning()).toBe(true);
    expect(timerService.getTimeRemaining()).toBe(duration);
  });

  test('should pause and resume timer correctly', () => {
    timerService.start(1500);
    
    // Fast forward 10 seconds
    jest.advanceTimersByTime(10000);
    timerService.pause();
    
    expect(timerService.isPaused()).toBe(true);
    expect(timerService.getTimeRemaining()).toBe(1490);
    
    timerService.resume();
    expect(timerService.isRunning()).toBe(true);
  });

  test('should handle timer completion', () => {
    const onComplete = jest.fn();
    timerService.onComplete(onComplete);
    
    timerService.start(1);
    jest.advanceTimersByTime(1000);
    
    expect(onComplete).toHaveBeenCalled();
    expect(timerService.isCompleted()).toBe(true);
  });
});
```

### Component Testing
```javascript
// __tests__/components/TimerDisplay.test.js
import { render, screen } from '@testing-library/react';
import { TimerDisplay } from '../components/TimerDisplay';

describe('TimerDisplay', () => {
  test('renders time in MM:SS format', () => {
    render(<TimerDisplay timeRemaining={1500} totalTime={1500} />);
    
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });

  test('shows correct progress percentage', () => {
    render(<TimerDisplay timeRemaining={750} totalTime={1500} />);
    
    const progressElement = screen.getByRole('progressbar');
    expect(progressElement).toHaveAttribute('aria-valuenow', '50');
  });

  test('applies correct session type styling', () => {
    const { rerender } = render(
      <TimerDisplay 
        timeRemaining={1500} 
        totalTime={1500} 
        sessionType="work" 
      />
    );
    
    expect(screen.getByTestId('timer-display')).toHaveClass('work');
    
    rerender(
      <TimerDisplay 
        timeRemaining={300} 
        totalTime={300} 
        sessionType="short_break" 
      />
    );
    
    expect(screen.getByTestId('timer-display')).toHaveClass('short_break');
  });
});
```

### Hook Testing
```javascript
// __tests__/hooks/useTimer.test.js
import { renderHook, act } from '@testing-library/react';
import { useTimer } from '../hooks/useTimer';

describe('useTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should initialize with correct default state', () => {
    const { result } = renderHook(() => useTimer(1500));
    
    expect(result.current.timeRemaining).toBe(1500);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  test('should start and update timer', () => {
    const { result } = renderHook(() => useTimer(60));
    
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(result.current.timeRemaining).toBe(55);
  });
});
```

## Integration Testing

### Component Integration
```javascript
// __tests__/integration/TimerApp.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimerApp } from '../components/TimerApp';

describe('TimerApp Integration', () => {
  test('complete pomodoro cycle workflow', async () => {
    const user = userEvent.setup();
    render(<TimerApp />);
    
    // Start work session
    const startButton = screen.getByRole('button', { name: /start/i });
    await user.click(startButton);
    
    expect(screen.getByText(/work session/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    
    // Fast forward to completion
    act(() => {
      jest.advanceTimersByTime(25 * 60 * 1000);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/break time/i)).toBeInTheDocument();
    });
    
    // Verify session counter updated
    expect(screen.getByText(/session 1 complete/i)).toBeInTheDocument();
  });

  test('settings integration with timer', async () => {
    const user = userEvent.setup();
    render(<TimerApp />);
    
    // Open settings
    await user.click(screen.getByRole('button', { name: /settings/i }));
    
    // Change work duration
    const workDurationSlider = screen.getByLabelText(/work duration/i);
    await user.clear(workDurationSlider);
    await user.type(workDurationSlider, '30');
    
    // Save settings
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Start timer and verify new duration
    await user.click(screen.getByRole('button', { name: /start/i }));
    expect(screen.getByText('30:00')).toBeInTheDocument();
  });
});
```

### Service Integration
```javascript
// __tests__/integration/services.test.js
import { TimerService } from '../services/TimerService';
import { StatisticsService } from '../services/StatisticsService';
import { SettingsService } from '../services/SettingsService';

describe('Service Integration', () => {
  let timerService, statsService, settingsService;

  beforeEach(() => {
    localStorage.clear();
    timerService = new TimerService();
    statsService = new StatisticsService();
    settingsService = new SettingsService();
  });

  test('timer completion updates statistics', () => {
    const onComplete = jest.fn(() => {
      statsService.recordSession('work');
    });
    
    timerService.onComplete(onComplete);
    timerService.start(1);
    
    jest.advanceTimersByTime(1000);
    
    expect(onComplete).toHaveBeenCalled();
    expect(statsService.getDailyStats().completedSessions).toBe(1);
  });

  test('settings changes affect timer behavior', () => {
    settingsService.updateSettings({ workDuration: 30 });
    
    const workDuration = settingsService.getSettings().workDuration;
    timerService.start(workDuration * 60);
    
    expect(timerService.getTimeRemaining()).toBe(30 * 60);
  });
});
```

## PWA Testing

### Service Worker Testing
```javascript
// __tests__/pwa/serviceWorker.test.js
describe('Service Worker', () => {
  beforeEach(() => {
    // Mock service worker registration
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: jest.fn(() => Promise.resolve({
          installing: null,
          waiting: null,
          active: { state: 'activated' }
        })),
        ready: Promise.resolve({
          sync: { register: jest.fn() }
        })
      },
      configurable: true
    });
  });

  test('registers service worker successfully', async () => {
    const { register } = await import('../serviceWorkerRegistration');
    
    await register();
    
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
      expect.stringContaining('service-worker.js')
    );
  });
});
```

### Offline Functionality Testing
```javascript
// __tests__/pwa/offline.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import { TimerApp } from '../components/TimerApp';

describe('Offline Functionality', () => {
  test('shows offline indicator when offline', () => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    render(<TimerApp />);
    
    // Trigger offline event
    fireEvent(window, new Event('offline'));
    
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  test('timer continues to work offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    render(<TimerApp />);
    
    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);
    
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });
});
```

### Installation Testing
```javascript
// __tests__/pwa/installation.test.js
describe('PWA Installation', () => {
  test('shows install prompt when available', () => {
    const mockPrompt = {
      prompt: jest.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' })
    };

    render(<TimerApp />);
    
    // Simulate beforeinstallprompt event
    fireEvent(window, new CustomEvent('beforeinstallprompt', {
      detail: mockPrompt
    }));
    
    expect(screen.getByRole('button', { name: /install app/i }))
      .toBeInTheDocument();
  });
});
```

## End-to-End Testing

### Cypress E2E Tests
```javascript
// cypress/e2e/pomodoro-flow.cy.js
describe('Pomodoro Timer E2E', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('completes a full pomodoro cycle', () => {
    // Start work session
    cy.get('[data-testid="start-button"]').click();
    cy.get('[data-testid="timer-display"]').should('contain', '25:00');
    
    // Fast forward time (mock timer for testing)
    cy.window().then((win) => {
      win.testUtils.fastForwardTimer(25 * 60);
    });
    
    // Verify break session starts
    cy.get('[data-testid="session-type"]').should('contain', 'Break');
    cy.get('[data-testid="timer-display"]').should('contain', '05:00');
    
    // Complete break
    cy.window().then((win) => {
      win.testUtils.fastForwardTimer(5 * 60);
    });
    
    // Verify statistics updated
    cy.get('[data-testid="session-counter"]').should('contain', '1');
  });

  it('persists settings across page reloads', () => {
    // Change settings
    cy.get('[data-testid="settings-button"]').click();
    cy.get('[data-testid="work-duration-slider"]').clear().type('30');
    cy.get('[data-testid="save-settings"]').click();
    
    // Reload page
    cy.reload();
    
    // Verify settings persisted
    cy.get('[data-testid="settings-button"]').click();
    cy.get('[data-testid="work-duration-slider"]').should('have.value', '30');
  });

  it('works offline', () => {
    // Go offline
    cy.window().then((win) => {
      win.navigator.serviceWorker.ready.then(() => {
        cy.wrap(win).invoke('dispatchEvent', new Event('offline'));
      });
    });
    
    // Verify offline indicator
    cy.get('[data-testid="offline-indicator"]').should('be.visible');
    
    // Timer should still work
    cy.get('[data-testid="start-button"]').click();
    cy.get('[data-testid="timer-display"]').should('not.contain', '25:00');
  });
});
```

## Performance Testing

### Lighthouse CI Integration
```javascript
// lighthouse.config.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run serve',
      url: ['http://localhost:3000'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['error', { minScore: 0.9 }]
      }
    }
  }
};
```

### Memory Leak Testing
```javascript
// __tests__/performance/memory.test.js
describe('Memory Leak Tests', () => {
  test('timer cleanup prevents memory leaks', () => {
    const { unmount } = render(<TimerApp />);
    
    // Start timer
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    
    // Unmount component
    unmount();
    
    // Verify no active timers
    expect(jest.getTimerCount()).toBe(0);
  });
});
```

## Test Utilities

### Mock Helpers
```javascript
// __tests__/utils/testUtils.js
export const mockLocalStorage = () => {
  const store = {};
  
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    })
  };
};

export const mockNotifications = () => ({
  requestPermission: jest.fn(() => Promise.resolve('granted')),
  permission: 'granted'
});

export const mockServiceWorker = () => ({
  register: jest.fn(() => Promise.resolve({
    installing: null,
    waiting: null,
    active: { state: 'activated' }
  }))
});
```

### Custom Render Function
```javascript
// __tests__/utils/customRender.js
import { render } from '@testing-library/react';
import { SettingsProvider } from '../contexts/SettingsContext';

const AllTheProviders = ({ children }) => {
  return (
    <SettingsProvider>
      {children}
    </SettingsProvider>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:coverage
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Run Lighthouse CI
        run: npm run lighthouse:ci
        
      - name: Upload coverage
        uses: codecov/codecov-action@v1
```