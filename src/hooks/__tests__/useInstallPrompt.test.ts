import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt } from '../useInstallPrompt';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock BeforeInstallPromptEvent
interface MockBeforeInstallPromptEvent extends Event {
  platforms: string[];
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: jest.Mock;
  preventDefault: jest.Mock;
}

const createMockBeforeInstallPromptEvent = (userChoice: 'accepted' | 'dismissed' = 'accepted'): MockBeforeInstallPromptEvent => ({
  type: 'beforeinstallprompt',
  platforms: ['web'],
  userChoice: Promise.resolve({ outcome: userChoice, platform: 'web' }),
  prompt: jest.fn().mockResolvedValue(undefined),
  preventDefault: jest.fn(),
  target: window,
  currentTarget: window,
  bubbles: false,
  cancelable: true,
  defaultPrevented: false,
  eventPhase: 0,
  isTrusted: true,
  returnValue: true,
  srcElement: window,
  timeStamp: Date.now(),
  composedPath: jest.fn(),
  initEvent: jest.fn(),
  stopImmediatePropagation: jest.fn(),
  stopPropagation: jest.fn()
});

describe('useInstallPrompt', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    // Reset matchMedia mock
    (window.matchMedia as jest.Mock).mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isInstallable).toBe(false);
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.showPrompt).toBe(false);
    expect(typeof result.current.installApp).toBe('function');
    expect(typeof result.current.dismissPrompt).toBe('function');
  });

  it('should detect if app is already installed (standalone mode)', () => {
    (window.matchMedia as jest.Mock).mockImplementation(query => {
      if (query === '(display-mode: standalone)') {
        return { matches: true };
      }
      return { matches: false };
    });

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isInstalled).toBe(true);
  });

  it('should detect if app is already installed (iOS PWA)', () => {
    Object.defineProperty(window.navigator, 'standalone', {
      writable: true,
      value: true
    });

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isInstalled).toBe(true);
  });

  it('should set up event listeners on mount', () => {
    renderHook(() => useInstallPrompt());

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useInstallPrompt());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
  });

  it('should handle beforeinstallprompt event', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useInstallPrompt());

    const mockEvent = createMockBeforeInstallPromptEvent();
    
    act(() => {
      // Simulate the beforeinstallprompt event
      const handler = addEventListenerSpy.mock.calls.find(call => call[0] === 'beforeinstallprompt')?.[1];
      handler(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.isInstallable).toBe(true);

    // Fast-forward time to trigger showPrompt
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.showPrompt).toBe(true);

    jest.useRealTimers();
  });

  it('should handle appinstalled event', () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      // Simulate the appinstalled event
      const handler = addEventListenerSpy.mock.calls.find(call => call[0] === 'appinstalled')?.[1];
      handler(new Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.isInstallable).toBe(false);
    expect(result.current.showPrompt).toBe(false);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pwa-installed', 'true');
  });

  it('should not show prompt if user previously dismissed it recently', () => {
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    mockLocalStorage.getItem.mockReturnValue(recentDate.toISOString());

    jest.useFakeTimers();
    const { result } = renderHook(() => useInstallPrompt());

    const mockEvent = createMockBeforeInstallPromptEvent();
    
    act(() => {
      const handler = addEventListenerSpy.mock.calls.find(call => call[0] === 'beforeinstallprompt')?.[1];
      handler(mockEvent);
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.showPrompt).toBe(false);

    jest.useRealTimers();
  });

  it('should show prompt if user dismissed it more than 7 days ago', () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    mockLocalStorage.getItem.mockReturnValue(oldDate.toISOString());

    jest.useFakeTimers();
    const { result } = renderHook(() => useInstallPrompt());

    const mockEvent = createMockBeforeInstallPromptEvent();
    
    act(() => {
      const handler = addEventListenerSpy.mock.calls.find(call => call[0] === 'beforeinstallprompt')?.[1];
      handler(mockEvent);
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.showPrompt).toBe(true);

    jest.useRealTimers();
  });

  it('should install app successfully', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    const mockEvent = createMockBeforeInstallPromptEvent('accepted');
    
    act(() => {
      const handler = addEventListenerSpy.mock.calls.find(call => call[0] === 'beforeinstallprompt')?.[1];
      handler(mockEvent);
    });

    let installResult: boolean;
    await act(async () => {
      installResult = await result.current.installApp();
    });

    expect(installResult!).toBe(true);
    expect(mockEvent.prompt).toHaveBeenCalled();
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.showPrompt).toBe(false);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pwa-installed', 'true');
  });

  it('should handle user dismissing install prompt', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    const mockEvent = createMockBeforeInstallPromptEvent('dismissed');
    
    act(() => {
      const handler = addEventListenerSpy.mock.calls.find(call => call[0] === 'beforeinstallprompt')?.[1];
      handler(mockEvent);
    });

    let installResult: boolean;
    await act(async () => {
      installResult = await result.current.installApp();
    });

    expect(installResult!).toBe(false);
    expect(result.current.showPrompt).toBe(false);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', expect.any(String));
  });

  it('should return false when trying to install without deferred prompt', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    let installResult: boolean;
    await act(async () => {
      installResult = await result.current.installApp();
    });

    expect(installResult!).toBe(false);
  });

  it('should handle install errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const { result } = renderHook(() => useInstallPrompt());

    const mockEvent = createMockBeforeInstallPromptEvent();
    mockEvent.prompt.mockRejectedValue(new Error('Install failed'));
    
    act(() => {
      const handler = addEventListenerSpy.mock.calls.find(call => call[0] === 'beforeinstallprompt')?.[1];
      handler(mockEvent);
    });

    let installResult: boolean;
    await act(async () => {
      installResult = await result.current.installApp();
    });

    expect(installResult!).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error during app installation:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should dismiss prompt and store dismissal date', () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      result.current.dismissPrompt();
    });

    expect(result.current.showPrompt).toBe(false);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', expect.any(String));
  });
});