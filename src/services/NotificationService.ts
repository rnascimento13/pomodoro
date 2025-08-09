import { SessionType, SoundType } from '../types';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export class NotificationService {
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<SoundType, AudioBuffer> = new Map();
  private soundEnabled: boolean = true;
  private notificationsEnabled: boolean = true;
  private permissionGranted: boolean = false;
  private audioInitialized: boolean = false;

  constructor() {
    this.checkNotificationPermission();
    // Don't initialize AudioContext until user interaction
  }

  private async initializeAudioContext(): Promise<void> {
    if (this.audioInitialized || this.audioContext) {
      return;
    }

    try {
      // Create AudioContext for better audio control
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume AudioContext if it's suspended (required by browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.audioInitialized = true;
    } catch (error) {
      console.warn('AudioContext not supported:', error);
    }
  }

  private checkNotificationPermission(): void {
    if ('Notification' in window) {
      this.permissionGranted = Notification.permission === 'granted';
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  public showNotification(options: NotificationOptions): void {
    if (!this.notificationsEnabled) {
      return;
    }

    // Try browser notification first
    if (this.permissionGranted && 'Notification' in window) {
      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/logo192.png',
          badge: options.badge || '/logo192.png',
          tag: options.tag || 'pomodoro-timer',
          requireInteraction: options.requireInteraction || false,
          silent: false
        });

        // Auto-close notification after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        return;
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }

    // Fallback to visual notification
    this.showFallbackNotification(options);
  }

  private showFallbackNotification(options: NotificationOptions): void {
    // Create a visual notification element as fallback
    const notification = document.createElement('div');
    notification.className = 'fallback-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <strong>${options.title}</strong>
        <p>${options.body}</p>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation styles to document if not already present
    if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  public async playSound(soundType: SoundType): Promise<void> {
    if (!this.soundEnabled) {
      return;
    }

    try {
      // Initialize AudioContext on first use (requires user interaction)
      await this.initializeAudioContext();

      // Try to play using AudioContext first for better control
      if (this.audioContext && this.audioBuffers.has(soundType)) {
        await this.playAudioBuffer(soundType);
        return;
      }

      // Fallback to HTML Audio API
      await this.playAudioElement(soundType);
    } catch (error) {
      console.error('Error playing sound:', error);
      // Try generated sound as final fallback
      await this.initializeAudioContext();
      this.playGeneratedSound(soundType);
    }
  }

  private async playAudioBuffer(soundType: SoundType): Promise<void> {
    if (!this.audioContext) return;

    const buffer = this.audioBuffers.get(soundType);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start();
  }

  private async playAudioElement(soundType: SoundType): Promise<void> {
    // Skip trying to load placeholder audio files - use generated sounds directly
    // The current audio files are just text placeholders, not real MP3 files
    this.playGeneratedSound(soundType);
  }

  private playGeneratedSound(soundType: SoundType): void {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Different sounds for different types
      switch (soundType) {
        case SoundType.WORK_COMPLETE:
          // Success sound - ascending notes
          this.playSuccessSound();
          break;
        case SoundType.BREAK_COMPLETE:
          // Gentle chime
          this.playChimeSound();
          break;
        case SoundType.TICK:
          // Simple tick
          this.playTickSound();
          break;
        default:
          this.playBeep();
      }
    } catch (error) {
      console.error('Error playing generated sound:', error);
    }
  }

  private playSuccessSound(): void {
    if (!this.audioContext) return;

    // Play ascending notes for success
    const frequencies = [523, 659, 784]; // C5, E5, G5
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.2, this.audioContext!.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.3);

        oscillator.start(this.audioContext!.currentTime);
        oscillator.stop(this.audioContext!.currentTime + 0.3);
      }, index * 150);
    });
  }

  private playChimeSound(): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 1);
  }

  private playTickSound(): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  private playBeep(): void {
    // Generate a simple beep using Web Audio API
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing beep:', error);
    }
  }

  private getAudioUrl(soundType: SoundType): string {
    // Map sound types to audio file URLs (only for files that exist)
    const soundMap: Partial<Record<SoundType, string>> = {
      [SoundType.WORK_COMPLETE]: '/sounds/work-complete.mp3',
      [SoundType.BREAK_COMPLETE]: '/sounds/break-complete.mp3'
      // TICK sound will use generated sound since file doesn't exist
    };

    return soundMap[soundType] || '';
  }

  public async loadAudioFiles(): Promise<void> {
    // Initialize AudioContext first
    await this.initializeAudioContext();
    
    if (!this.audioContext) return;

    // Skip loading placeholder audio files - use generated sounds instead
    // The current audio files are just text placeholders, not real MP3 files
    console.log('Using generated audio sounds for notifications');
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  public setNotificationsEnabled(enabled: boolean): void {
    this.notificationsEnabled = enabled;
  }

  public isNotificationSupported(): boolean {
    return 'Notification' in window;
  }

  public isAudioSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext) || !!window.Audio;
  }

  public getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  public async showSessionCompleteNotification(sessionType: SessionType): Promise<void> {
    const notifications = {
      [SessionType.WORK]: {
        title: 'Work Session Complete! 🎉',
        body: 'Great job! Time for a well-deserved break.',
        sound: SoundType.WORK_COMPLETE
      },
      [SessionType.SHORT_BREAK]: {
        title: 'Break Time Over! ⚡',
        body: 'Ready to get back to work? Let\'s stay focused!',
        sound: SoundType.BREAK_COMPLETE
      },
      [SessionType.LONG_BREAK]: {
        title: 'Long Break Complete! 🚀',
        body: 'You\'ve completed a full cycle! Ready for the next round?',
        sound: SoundType.BREAK_COMPLETE
      }
    };

    const notification = notifications[sessionType];
    
    try {
      // Play sound first (don't wait for it to complete)
      this.playSound(notification.sound).catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
      
      // Show notification
      this.showNotification({
        title: notification.title,
        body: notification.body,
        tag: `session-complete-${sessionType}`,
        requireInteraction: true
      });
    } catch (error) {
      console.error('Error showing session complete notification:', error);
      throw error;
    }
  }

  public async testSound(soundType: SoundType): Promise<void> {
    try {
      await this.playSound(soundType);
    } catch (error) {
      console.error('Error testing sound:', error);
      throw error;
    }
  }

  public async testNotification(): Promise<void> {
    try {
      this.showNotification({
        title: 'Test Notification',
        body: 'This is a test notification from Pomodoro Timer.',
        tag: 'test-notification',
        requireInteraction: false
      });
    } catch (error) {
      console.error('Error testing notification:', error);
      throw error;
    }
  }

  public destroy(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (error) {
        // Ignore errors during cleanup (e.g., in test environment)
        console.warn('Error closing audio context:', error);
      }
    }
    this.audioBuffers.clear();
  }
}

// Create singleton instance
export const notificationService = new NotificationService();