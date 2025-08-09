import { Session, SessionType, DailyStats, UserStats } from '../types';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Service for managing session statistics and tracking user productivity
 */
export class StatisticsService {
  private static instance: StatisticsService;
  private listeners: Array<(stats: UserStats) => void> = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): StatisticsService {
    if (!StatisticsService.instance) {
      StatisticsService.instance = new StatisticsService();
    }
    return StatisticsService.instance;
  }

  /**
   * Record a completed session
   */
  public recordSession(session: Session): void {
    if (!session.completed) {
      return;
    }

    const stats = this.getStats();
    const today = this.formatDate(new Date());
    
    // Update daily stats
    let dailyStats = stats.dailyStats.find(d => d.date === today);
    if (!dailyStats) {
      dailyStats = {
        date: today,
        completedSessions: 0,
        workMinutes: 0,
        breakMinutes: 0
      };
      stats.dailyStats.push(dailyStats);
    }

    // Update counters
    dailyStats.completedSessions++;
    stats.totalSessions++;

    if (session.type === SessionType.WORK) {
      dailyStats.workMinutes += session.duration;
    } else {
      dailyStats.breakMinutes += session.duration;
    }

    // Update streak
    this.updateStreak(stats);

    // Clean up old data (keep last 90 days)
    this.cleanupOldData(stats);

    // Save updated stats
    this.saveStats(stats);

    // Notify listeners
    this.notifyListeners(stats);
  }

  /**
   * Get current statistics
   */
  public getStats(): UserStats {
    const defaultStats: UserStats = {
      totalSessions: 0,
      currentStreak: 0,
      longestStreak: 0,
      dailyStats: []
    };

    return storage.get(STORAGE_KEYS.STATISTICS, defaultStats);
  }

  /**
   * Get today's statistics
   */
  public getTodayStats(): DailyStats {
    const stats = this.getStats();
    const today = this.formatDate(new Date());
    
    return stats.dailyStats.find(d => d.date === today) || {
      date: today,
      completedSessions: 0,
      workMinutes: 0,
      breakMinutes: 0
    };
  }

  /**
   * Get current streak of consecutive days with completed sessions
   */
  public getCurrentStreak(): number {
    return this.getStats().currentStreak;
  }

  /**
   * Get total number of completed sessions
   */
  public getTotalSessions(): number {
    return this.getStats().totalSessions;
  }

  /**
   * Get statistics for the last N days
   */
  public getRecentStats(days: number = 7): DailyStats[] {
    const stats = this.getStats();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days + 1);
    
    return stats.dailyStats
      .filter(d => new Date(d.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Reset all statistics (for testing or user preference)
   */
  public resetStats(): void {
    const defaultStats: UserStats = {
      totalSessions: 0,
      currentStreak: 0,
      longestStreak: 0,
      dailyStats: []
    };

    this.saveStats(defaultStats);
    this.notifyListeners(defaultStats);
  }

  /**
   * Subscribe to statistics changes
   */
  public onStatsChange(callback: (stats: UserStats) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Update streak calculation
   */
  private updateStreak(stats: UserStats): void {
    const daysWithSessions = stats.dailyStats
      .filter(d => d.completedSessions > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (daysWithSessions.length === 0) {
      stats.currentStreak = 0;
      return;
    }

    let currentStreak = 0;
    const today = new Date();
    
    // Check consecutive days starting from the most recent day with sessions
    const mostRecentDay = new Date(daysWithSessions[0].date);
    const daysDiff = Math.floor((today.getTime() - mostRecentDay.getTime()) / (1000 * 60 * 60 * 24));
    
    // If the most recent session was more than 1 day ago, streak is broken
    if (daysDiff > 1) {
      stats.currentStreak = 0;
      return;
    }
    
    // Count consecutive days
    for (let i = 0; i < daysWithSessions.length; i++) {
      if (i === 0) {
        currentStreak = 1;
        continue;
      }
      
      const currentDay = new Date(daysWithSessions[i - 1].date);
      const previousDay = new Date(daysWithSessions[i].date);
      const diff = Math.floor((currentDay.getTime() - previousDay.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }

    stats.currentStreak = currentStreak;
    
    // Update longest streak if current is higher
    if (currentStreak > stats.longestStreak) {
      stats.longestStreak = currentStreak;
    }
  }

  /**
   * Clean up statistics data older than 90 days
   */
  private cleanupOldData(stats: UserStats): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    stats.dailyStats = stats.dailyStats.filter(
      d => new Date(d.date) >= cutoffDate
    );
  }

  /**
   * Save statistics to storage
   */
  private saveStats(stats: UserStats): void {
    storage.set(STORAGE_KEYS.STATISTICS, stats);
  }

  /**
   * Notify all listeners of statistics changes
   */
  private notifyListeners(stats: UserStats): void {
    this.listeners.forEach(callback => callback(stats));
  }

  /**
   * Format date as YYYY-MM-DD string
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return this.formatDate(date1) === this.formatDate(date2);
  }
}

// Export singleton instance
export const statisticsService = StatisticsService.getInstance();