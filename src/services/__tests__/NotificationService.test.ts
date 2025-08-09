import { NotificationService } from '../NotificationService';
import { SessionType, SoundType } from '../../types';

// Mock the global Notification API
const mockNotification = jest.fn();
const mockRequestPermission = jest.fn();

// Mock AudioContext
const mockAudioContext = {
  createOscillator: jest.fn(),
  createGain: jest.fn(),
  createBufferSource: jest.fn(),
  decodeAudioData: jest.fn(),
  destination: {},
  currentTime: 0,
  state: 'running',
  close: jest.fn()
};

const mockOscillator = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  frequency: {
    setValueAtTime: jest.fn()
  },
  type: 'sine'
};

const mockGainNode = {
  connect: jest.fn(),
  gain: {
    setValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn()
  }
};

const mockBufferSource = {
  connect: jest.fn(),
  start: jest.fn(),
  buffer: null
};

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();

  // Mock Notification API
  Object.defineProperty(window, 'Notification', {
    value: mockNotification,
    writable: true,
    configurable: true
  });

  mockNotification.requestPermission = mockRequestPermission;
  mockNotification.permission = 'default';

  // Mock AudioContext
  Object.defineProperty(window, 'AudioContext', {
    value: jest.fn(() => mockAudioContext),
    writable: true,
    configurable: true
  });

  mockAudioContext.createOscillator.mockReturnValue(mockOscillator);
  mockAudioContext.createGain.mockReturnValue(mockGainNode);
  mockAudioContext.createBufferSource.mockReturnValue(mockBufferSource);

  // Mock Audio API
  Object.defineProperty(window, 'Audio', {
    value: jest.fn(() => ({
      play: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      load: jest.fn(),
      volume: 0.7
    })),
    writable: true,
    configurable: true
  });

  // Mock fetch for audio loading
  global.fetch = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockNotification.permission = 'default';
});

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  afterEach(() => {
    notificationService.destroy();
  });

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      expect(notificationService.isNotificationSupported()).toBe(true);
      expect(notificationService.isAudioSupported()).toBe(true);
      expect(notificationService.getNotificationPermission()).toBe('default');
    });

    it('should handle unsupported notification API', () => {
      // Temporarily remove Notification from window
      const originalNotification = window.Notification;
      delete (window as any).Notification;

      const service = new NotificationService();
      expect(service.isNotificationSupported()).toBe(false);
      expect(service.getNotificationPermission()).toBe('unsupported');

      // Restore Notification
      window.Notification = originalNotification;
      service.destroy();
    });
  });

  describe('permission management', () => {
    it('should request notification permission successfully', async () => {
      mockRequestPermission.mockResolvedValue('granted');

      const result = await notificationService.requestPermission();

      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle denied permission', async () => {
      mockRequestPermission.mockResolvedValue('denied');

      const result = await notificationService.requestPermission();

      expect(result).toBe(false);
    });

    it('should return true if permission already granted', async () => {
      mockNotification.permission = 'granted';

      const result = await notificationService.requestPermission();

      expect(mockRequestPermission).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if permission already denied', async () => {
      mockNotification.permission = 'denied';

      const result = await notificationService.requestPermission();

      expect(mockRequestPermission).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle permission request errors', async () => {
      mockRequestPermission.mockRejectedValue(new Error('Permission error'));

      const result = await notificationService.requestPermission();

      expect(result).toBe(false);
    });
  });

  describe('browser notifications', () => {
    it('should show browser notification when permission granted', () => {
      mockNotification.permission = 'granted';
      notificationService.setNotificationsEnabled(true);

      const mockNotificationInstance = {
        close: jest.fn()
      };
      mockNotification.mockReturnValue(mockNotificationInstance);

      notificationService.showNotification({
        title: 'Test Title',
        body: 'Test Body'
      });

      expect(mockNotification).toHaveBeenCalledWith('Test Title', {
        body: 'Test Body',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'pomodoro-timer',
        requireInteraction: false,
        silent: false
      });
    });

    it('should not show notification when disabled', () => {
      mockNotification.permission = 'granted';
      notificationService.setNotificationsEnabled(false);

      notificationService.showNotification({
        title: 'Test Title',
        body: 'Test Body'
      });

      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should show fallback notification when browser notification fails', () => {
      mockNotification.permission = 'granted';
      notificationService.setNotificationsEnabled(true);
      mockNotification.mockImplementation(() => {
        throw new Error('Notification failed');
      });

      // Mock document methods for fallback notification
      const mockElement = {
        className: '',
        innerHTML: '',
        style: { cssText: '', animation: '' },
        parentNode: { removeChild: jest.fn() }
      };
      const createElement = jest.spyOn(document, 'createElement').mockReturnValue(mockElement as any);
      const appendChild = jest.spyOn(document.body, 'appendChild').mockImplementation();
      const querySelector = jest.spyOn(document, 'querySelector').mockReturnValue(null);
      const mockStyleElement = { id: '', textContent: '' };
      createElement.mockReturnValueOnce(mockStyleElement as any);
      const headAppendChild = jest.spyOn(document.head, 'appendChild').mockImplementation();

      notificationService.showNotification({
        title: 'Test Title',
        body: 'Test Body'
      });

      expect(createElement).toHaveBeenCalledWith('div');
      expect(appendChild).toHaveBeenCalled();

      // Cleanup mocks
      createElement.mockRestore();
      appendChild.mockRestore();
      querySelector.mockRestore();
      headAppendChild.mockRestore();
    });
  });

  describe('audio notifications', () => {
    it('should play generated sound when audio files are not available', async () => {
      notificationService.setSoundEnabled(true);

      await notificationService.playSound(SoundType.WORK_COMPLETE);

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should not play sound when disabled', async () => {
      notificationService.setSoundEnabled(false);

      await notificationService.playSound(SoundType.WORK_COMPLETE);

      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('should handle audio context creation failure gracefully', async () => {
      // Create service without AudioContext
      const originalAudioContext = window.AudioContext;
      delete (window as any).AudioContext;
      delete (window as any).webkitAudioContext;

      const service = new NotificationService();
      service.setSoundEnabled(true);

      // Should not throw error
      await expect(service.playSound(SoundType.WORK_COMPLETE)).resolves.toBeUndefined();

      // Restore AudioContext
      window.AudioContext = originalAudioContext;
      service.destroy();
    });

    it('should load audio files successfully', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockAudioBuffer = {};
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer)
      });
      
      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);

      await notificationService.loadAudioFiles();

      expect(global.fetch).toHaveBeenCalledWith('/sounds/work-complete.mp3');
      expect(global.fetch).toHaveBeenCalledWith('/sounds/break-complete.mp3');
      expect(global.fetch).toHaveBeenCalledWith('/sounds/tick.mp3');
    });

    it('should handle audio file loading failures gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Should not throw error
      await expect(notificationService.loadAudioFiles()).resolves.toBeUndefined();
    });
  });

  describe('session completion notifications', () => {
    it('should show work completion notification', async () => {
      mockNotification.permission = 'granted';
      notificationService.setNotificationsEnabled(true);
      notificationService.setSoundEnabled(true);

      const mockNotificationInstance = { close: jest.fn() };
      mockNotification.mockReturnValue(mockNotificationInstance);

      await notificationService.showSessionCompleteNotification(SessionType.WORK);

      expect(mockNotification).toHaveBeenCalledWith('Work Session Complete! 🎉', {
        body: 'Great job! Time for a well-deserved break.',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'session-complete-work',
        requireInteraction: true,
        silent: false
      });

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it('should show short break completion notification', async () => {
      mockNotification.permission = 'granted';
      notificationService.setNotificationsEnabled(true);

      const mockNotificationInstance = { close: jest.fn() };
      mockNotification.mockReturnValue(mockNotificationInstance);

      await notificationService.showSessionCompleteNotification(SessionType.SHORT_BREAK);

      expect(mockNotification).toHaveBeenCalledWith('Break Time Over! ⚡', {
        body: 'Ready to get back to work? Let\'s stay focused!',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'session-complete-short_break',
        requireInteraction: true,
        silent: false
      });
    });

    it('should show long break completion notification', async () => {
      mockNotification.permission = 'granted';
      notificationService.setNotificationsEnabled(true);

      const mockNotificationInstance = { close: jest.fn() };
      mockNotification.mockReturnValue(mockNotificationInstance);

      await notificationService.showSessionCompleteNotification(SessionType.LONG_BREAK);

      expect(mockNotification).toHaveBeenCalledWith('Long Break Complete! 🚀', {
        body: 'You\'ve completed a full cycle! Ready for the next round?',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'session-complete-long_break',
        requireInteraction: true,
        silent: false
      });
    });
  });

  describe('settings management', () => {
    it('should update sound enabled setting', () => {
      notificationService.setSoundEnabled(false);
      // Test by trying to play sound - should not create oscillator
      notificationService.playSound(SoundType.WORK_COMPLETE);
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();

      notificationService.setSoundEnabled(true);
      notificationService.playSound(SoundType.WORK_COMPLETE);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    it('should update notifications enabled setting', () => {
      mockNotification.permission = 'granted';
      
      notificationService.setNotificationsEnabled(false);
      notificationService.showNotification({ title: 'Test', body: 'Test' });
      expect(mockNotification).not.toHaveBeenCalled();

      notificationService.setNotificationsEnabled(true);
      notificationService.showNotification({ title: 'Test', body: 'Test' });
      expect(mockNotification).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      notificationService.destroy();

      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should handle destroy when audio context is already closed', () => {
      mockAudioContext.state = 'closed';
      
      // Should not throw error
      expect(() => notificationService.destroy()).not.toThrow();
    });
  });
});