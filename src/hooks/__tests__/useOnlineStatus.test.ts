import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../useOnlineStatus';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('useOnlineStatus', () => {
  beforeEach(() => {
    // Reset navigator.onLine to true before each test
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('should return initial online status', () => {
    const { result } = renderHook(() => useOnlineStatus());
    
    expect(result.current).toBe(true);
  });

  it('should return false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    
    const { result } = renderHook(() => useOnlineStatus());
    
    expect(result.current).toBe(false);
  });

  it('should update status when online event is fired', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    
    const { result } = renderHook(() => useOnlineStatus());
    
    expect(result.current).toBe(false);
    
    act(() => {
      // Simulate going online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    });
    
    expect(result.current).toBe(true);
  });

  it('should update status when offline event is fired', () => {
    const { result } = renderHook(() => useOnlineStatus());
    
    expect(result.current).toBe(true);
    
    act(() => {
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(result.current).toBe(false);
  });

  it('should clean up event listeners on unmount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useOnlineStatus());
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});