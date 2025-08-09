import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';

describe('useErrorHandler hook', () => {
  describe('initial state', () => {
    it('should initialize with no error', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.errorState).toEqual({
        hasError: false,
        error: null,
        errorMessage: ''
      });
    });
  });

  describe('setError', () => {
    it('should set error from Error object', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('Test error message');

      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.errorState).toEqual({
        hasError: true,
        error: testError,
        errorMessage: 'Test error message'
      });
    });

    it('should set error from string', () => {
      const { result } = renderHook(() => useErrorHandler());
      const errorMessage = 'String error message';

      act(() => {
        result.current.setError(errorMessage);
      });

      expect(result.current.errorState.hasError).toBe(true);
      expect(result.current.errorState.error).toBeInstanceOf(Error);
      expect(result.current.errorState.errorMessage).toBe(errorMessage);
    });

    it('should update error state when called multiple times', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.setError('First error');
      });

      expect(result.current.errorState.errorMessage).toBe('First error');

      act(() => {
        result.current.setError('Second error');
      });

      expect(result.current.errorState.errorMessage).toBe('Second error');
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useErrorHandler());

      // Set an error first
      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.errorState.hasError).toBe(true);

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.errorState).toEqual({
        hasError: false,
        error: null,
        errorMessage: ''
      });
    });

    it('should be safe to call when no error exists', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(() => {
        act(() => {
          result.current.clearError();
        });
      }).not.toThrow();

      expect(result.current.errorState.hasError).toBe(false);
    });
  });

  describe('handleAsyncError', () => {
    it('should handle successful async operations', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const successValue = 'success';
      const asyncFn = jest.fn().mockResolvedValue(successValue);

      let returnValue: string | null = null;

      await act(async () => {
        returnValue = await result.current.handleAsyncError(asyncFn);
      });

      expect(asyncFn).toHaveBeenCalled();
      expect(returnValue).toBe(successValue);
      expect(result.current.errorState.hasError).toBe(false);
    });

    it('should handle async errors', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(testError);

      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.handleAsyncError(asyncFn);
      });

      expect(asyncFn).toHaveBeenCalled();
      expect(returnValue).toBeNull();
      expect(result.current.errorState).toEqual({
        hasError: true,
        error: testError,
        errorMessage: 'Async error'
      });
    });

    it('should handle non-Error rejections', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const errorString = 'String rejection';
      const asyncFn = jest.fn().mockRejectedValue(errorString);

      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.handleAsyncError(asyncFn);
      });

      expect(returnValue).toBeNull();
      expect(result.current.errorState.hasError).toBe(true);
      expect(result.current.errorState.errorMessage).toBe(errorString);
    });

    it('should clear previous errors before handling async operation', async () => {
      const { result } = renderHook(() => useErrorHandler());

      // Set an initial error
      act(() => {
        result.current.setError('Initial error');
      });

      expect(result.current.errorState.hasError).toBe(true);

      // Handle successful async operation
      const asyncFn = jest.fn().mockResolvedValue('success');

      await act(async () => {
        await result.current.handleAsyncError(asyncFn);
      });

      expect(result.current.errorState.hasError).toBe(false);
    });

    it('should handle multiple async operations', async () => {
      const { result } = renderHook(() => useErrorHandler());

      // First operation succeeds
      const successFn = jest.fn().mockResolvedValue('success');
      let result1: any;

      await act(async () => {
        result1 = await result.current.handleAsyncError(successFn);
      });

      expect(result1).toBe('success');
      expect(result.current.errorState.hasError).toBe(false);

      // Second operation fails
      const errorFn = jest.fn().mockRejectedValue(new Error('Second error'));
      let result2: any;

      await act(async () => {
        result2 = await result.current.handleAsyncError(errorFn);
      });

      expect(result2).toBeNull();
      expect(result.current.errorState.hasError).toBe(true);
      expect(result.current.errorState.errorMessage).toBe('Second error');
    });
  });

  describe('function stability', () => {
    it('should maintain function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useErrorHandler());

      const initialSetError = result.current.setError;
      const initialClearError = result.current.clearError;
      const initialHandleAsyncError = result.current.handleAsyncError;

      rerender();

      expect(result.current.setError).toBe(initialSetError);
      expect(result.current.clearError).toBe(initialClearError);
      expect(result.current.handleAsyncError).toBe(initialHandleAsyncError);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined and null errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.setError(undefined as any);
      });

      expect(result.current.errorState.hasError).toBe(true);
      expect(result.current.errorState.error).toBeInstanceOf(Error);

      act(() => {
        result.current.setError(null as any);
      });

      expect(result.current.errorState.hasError).toBe(true);
      expect(result.current.errorState.error).toBeInstanceOf(Error);
    });

    it('should handle empty string errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.setError('');
      });

      expect(result.current.errorState.hasError).toBe(true);
      expect(result.current.errorState.errorMessage).toBe('');
    });

    it('should handle async functions that throw synchronously', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const syncError = new Error('Sync error');
      const asyncFn = jest.fn(() => {
        throw syncError;
      });

      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.handleAsyncError(asyncFn);
      });

      expect(returnValue).toBeNull();
      expect(result.current.errorState).toEqual({
        hasError: true,
        error: syncError,
        errorMessage: 'Sync error'
      });
    });
  });
});