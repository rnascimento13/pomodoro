import { renderHook, act } from '@testing-library/react';
import { useServiceWorkerUpdate } from '../useServiceWorkerUpdate';

// Mock service worker registration
const mockRegistration = {
  waiting: null,
  installing: null,
  active: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  update: jest.fn()
};

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve(mockRegistration),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    controller: null
  },
  writable: true
});

describe('useServiceWorkerUpdate hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegistration.waiting = null;
    mockRegistration.installing = null;
    mockRegistration.active = null;
  });

  describe('initialization', () => {
    it('should initialize with no update available', () => {
      const { result } = renderHook(() => useServiceWorkerUpdate());

      expect(result.current.updateAvailable).toBe(false);
      expect(result.current.isUpdating).toBe(false);
    });

    it('should set up service worker event listeners', async () => {
      renderHook(() => useServiceWorkerUpdate());

      // Wait for async initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(navigator.serviceWorker.addEventListener).toHaveBeenCalledWith(
        'controllerchange',
        expect.any(Function)
      );
    });
  });

  describe('update detection', () => {
    it('should detect update when service worker is waiting', async () => {
      const { result } = renderHook(() => useServiceWorkerUpdate());

      // Simulate service worker with waiting worker
      mockRegistration.waiting = {
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      // Trigger the registration ready promise resolution
      await act(async () => {
        await navigator.serviceWorker.ready;
      });

      expect(result.current.updateAvailable).toBe(true);
    });

    it('should detect update when service worker is installing', async () => {
      const { result } = renderHook(() => useServiceWorkerUpdate());

      mockRegistration.installing = {
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        state: 'installing'
      };

      let stateChangeCallback: (() => void) | undefined;
      mockRegistration.installing.addEventListener = jest.fn((event, callback) => {
        if (event === 'statechange') {
          stateChangeCallback = callback;
        }
      });

      await act(async () => {
        await navigator.serviceWorker.ready;
      });

      // Simulate state change to installed
      mockRegistration.installing.state = 'installed';
      mockRegistration.waiting = mockRegistration.installing;
      mockRegistration.installing = null;

      act(() => {
        stateChangeCallback?.();
      });

      expect(result.current.updateAvailable).toBe(true);
    });

    it('should handle updatefound event', async () => {
      const { result } = renderHook(() => useServiceWorkerUpdate());

      let updateFoundCallback: (() => void) | undefined;
      mockRegistration.addEventListener = jest.fn((event, callback) => {
        if (event === 'updatefound') {
          updateFoundCallback = callback;
        }
      });

      await act(async () => {
        await navigator.serviceWorker.ready;
      });

      // Simulate updatefound event
      mockRegistration.installing = {
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        state: 'installing'
      };

      act(() => {
        updateFoundCallback?.();
      });

      expect(mockRegistration.installing.addEventListener).toHaveBeenCalledWith(
        'statechange',
        expect.any(Function)
      );
    });
  });

  describe('update application', () => {
    it('should apply update when service worker is waiting', async () => {
      const { result } = renderHook(() => useServiceWorkerUpdate());

      const mockWaitingWorker = {
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      mockRegistration.waiting = mockWaitingWorker;

      await act(async () => {
        await navigator.serviceWorker.ready;
      });

      expect(result.current.updateAvailable).toBe(true);

      act(() => {
        result.current.applyUpdate();
      });

      expect(result.current.isUpdating).toBe(true);
      expect(mockWaitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });

    it('should not apply update when no service worker is waiting', async () => {
      const { result } = renderHook(() => useServiceWorkerUpdate());

      await act(async () => {
        await navigator.serviceWorker.ready;
      });

      act(() => {
        result.current.applyUpdate();
      });

      expect(result.current.isUpdating).toBe(false);
    });

    it('should reload page on controller change', async () => {
      const originalReload = window.location.reload;
      window.location.reload = jest.fn();

      renderHook(() => useServiceWorkerUpdate());

      let controllerChangeCallback: (() => void) | undefined;
      (navigator.serviceWorker.addEventListener as jest.Mock).mockImplementation((event, callback) => {
        if (event === 'controllerchange') {
          controllerChangeCallback = callback;
        }
      });

      await act(async () => {
        await navigator.serviceWorker.ready;
      });

      // Simulate controller change
      act(() => {
        controllerChangeCallback?.();
      });

      expect(window.location.reload).toHaveBeenCalled();

      // Restore original reload
      window.location.reload = originalReload;
    });
  });

  describe('error handling', () => {
    it('should handle service worker registration errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock service worker ready to reject
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.reject(new Error('Service worker not available')),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        },
        writable: true
      });

      const { result } = renderHook(() => useServiceWorkerUpdate());

      await act(async () => {
        try {
          await navigator.serviceWorker.ready;
        } catch (error) {
          // Expected to fail
        }
      });

      expect(result.current.updateAvailable).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Service worker error:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle missing service worker support', () => {
      const originalServiceWorker = navigator.serviceWorker;
      
      // Remove service worker support
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      });

      const { result } = renderHook(() => useServiceWorkerUpdate());

      expect(result.current.updateAvailable).toBe(false);
      expect(result.current.isUpdating).toBe(false);

      // Restore service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalServiceWorker,
        writable: true
      });
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', async () => {
      const { unmount } = renderHook(() => useServiceWorkerUpdate());

      await act(async () => {
        await navigator.serviceWorker.ready;
      });

      unmount();

      expect(navigator.serviceWorker.removeEventListener).toHaveBeenCalledWith(
        'controllerchange',
        expect.any(Function)
      );
      expect(mockRegistration.removeEventListener).toHaveBeenCalledWith(
        'updatefound',
        expect.any(Function)
      );
    });

    it('should handle cleanup when service worker is not available', () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      });

      const { unmount } = renderHook(() => useServiceWorkerUpdate());

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('function stability', () => {
    it('should maintain function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useServiceWorkerUpdate());

      const initialApplyUpdate = result.current.applyUpdate;

      rerender();

      expect(result.current.applyUpdate).toBe(initialApplyUpdate);
    });
  });
});