/**
 * Background Sync Service for offline data persistence
 * Handles syncing data when the app comes back online
 */

interface SyncData {
  id: string;
  type: 'session' | 'settings' | 'statistics';
  data: any;
  timestamp: number;
}

class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private syncQueue: SyncData[] = [];
  private readonly SYNC_QUEUE_KEY = 'pomodoro_sync_queue';

  private constructor() {
    this.loadSyncQueue();
    this.setupOnlineListener();
  }

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  /**
   * Add data to sync queue for background sync
   */
  addToSyncQueue(type: SyncData['type'], data: any): void {
    const syncItem: SyncData = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now()
    };

    this.syncQueue.push(syncItem);
    this.saveSyncQueue();

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.processSyncQueue();
    } else {
      // Register for background sync if supported
      this.registerBackgroundSync();
    }
  }

  /**
   * Process all items in sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0) return;

    const itemsToSync = [...this.syncQueue];
    const successfulSyncs: string[] = [];

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item);
        successfulSyncs.push(item.id);
      } catch (error) {
        console.error('Failed to sync item:', item, error);
      }
    }

    // Remove successfully synced items
    this.syncQueue = this.syncQueue.filter(
      item => !successfulSyncs.includes(item.id)
    );
    this.saveSyncQueue();
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: SyncData): Promise<void> {
    // In a real app, this would sync to a server
    // For this PWA, we'll just ensure local storage is updated
    switch (item.type) {
      case 'session':
        this.syncSessionData(item.data);
        break;
      case 'settings':
        this.syncSettingsData(item.data);
        break;
      case 'statistics':
        this.syncStatisticsData(item.data);
        break;
    }
  }

  /**
   * Sync session data
   */
  private syncSessionData(data: any): void {
    const existingSessions = JSON.parse(
      localStorage.getItem('pomodoro_sessions') || '[]'
    );
    
    // Check if session already exists
    const existingIndex = existingSessions.findIndex(
      (session: any) => session.id === data.id
    );

    if (existingIndex >= 0) {
      existingSessions[existingIndex] = data;
    } else {
      existingSessions.push(data);
    }

    localStorage.setItem('pomodoro_sessions', JSON.stringify(existingSessions));
  }

  /**
   * Sync settings data
   */
  private syncSettingsData(data: any): void {
    localStorage.setItem('pomodoro_settings', JSON.stringify(data));
  }

  /**
   * Sync statistics data
   */
  private syncStatisticsData(data: any): void {
    localStorage.setItem('pomodoro_statistics', JSON.stringify(data));
  }

  /**
   * Register for background sync
   */
  private async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('pomodoro-background-sync');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  /**
   * Setup online event listener
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.processSyncQueue();
    });
  }

  /**
   * Load sync queue from storage
   */
  private loadSyncQueue(): void {
    try {
      const stored = localStorage.getItem(this.SYNC_QUEUE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Save sync queue to storage
   */
  private saveSyncQueue(): void {
    try {
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get pending sync count
   */
  getPendingSyncCount(): number {
    return this.syncQueue.length;
  }

  /**
   * Clear sync queue (for testing)
   */
  clearSyncQueue(): void {
    this.syncQueue = [];
    localStorage.removeItem(this.SYNC_QUEUE_KEY);
  }
}

export default BackgroundSyncService;