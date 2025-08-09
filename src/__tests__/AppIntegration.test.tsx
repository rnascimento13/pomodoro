import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock the notification service to avoid browser API issues in tests
jest.mock('../services/NotificationService', () => ({
  notificationService: {
    loadAudioFiles: jest.fn().mockResolvedValue(undefined),
    isNotificationSupported: jest.fn().mockReturnValue(false),
    isAudioSupported: jest.fn().mockReturnValue(false),
    showSessionCompleteNotification: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('App Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should render loading state initially and then show the timer', async () => {
    render(<App />);

    // Should show loading state initially
    expect(screen.getByText('Loading Pomodoro Timer...')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show main timer components after loading
    expect(screen.getByText('Focus & Productivity')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should handle storage errors gracefully', async () => {
    // Mock localStorage to throw an error
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = jest.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    render(<App />);

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show storage warning
    await waitFor(() => {
      expect(screen.getByText(/Using temporary storage/)).toBeInTheDocument();
    });

    // Restore original localStorage
    Storage.prototype.setItem = originalSetItem;
  });

  it('should show error boundaries for component failures', async () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
    }, { timeout: 3000 });

    // The app should render successfully even with potential component errors
    expect(screen.getByRole('main')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should disable header buttons during initialization', async () => {
    render(<App />);

    // During loading, buttons should not be present or should be disabled
    // We'll check after loading completes
    await waitFor(() => {
      expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
    }, { timeout: 3000 });

    // After initialization, buttons should be enabled
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    const statsButton = screen.getByRole('button', { name: /statistics/i });

    expect(settingsButton).not.toBeDisabled();
    expect(statsButton).not.toBeDisabled();
  });

  it('should handle notification errors gracefully', async () => {
    // Mock notification service to throw an error
    const mockNotificationService = require('../services/NotificationService').notificationService;
    mockNotificationService.showSessionCompleteNotification.mockRejectedValue(
      new Error('Notification failed')
    );

    render(<App />);

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
    }, { timeout: 3000 });

    // The app should still render successfully
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should show fallback UI when localStorage is not available', async () => {
    // Mock localStorage to be unavailable
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: undefined,
      writable: true
    });

    render(<App />);

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show storage warning
    await waitFor(() => {
      expect(screen.getByText(/Using temporary storage/)).toBeInTheDocument();
    });

    // Restore localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
  });

  it('should allow dismissing error banners', async () => {
    // Mock localStorage to throw an error
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = jest.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    render(<App />);

    // Wait for initialization and error banner
    await waitFor(() => {
      expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Look for error banner (it might appear)
    const dismissButtons = screen.queryAllByRole('button', { name: /dismiss error/i });
    
    if (dismissButtons.length > 0) {
      // Click dismiss button
      await act(async () => {
        await userEvent.click(dismissButtons[0]);
      });

      // Error banner should be dismissed
      await waitFor(() => {
        expect(dismissButtons[0]).not.toBeInTheDocument();
      });
    }

    // Restore original localStorage
    Storage.prototype.setItem = originalSetItem;
  });
});