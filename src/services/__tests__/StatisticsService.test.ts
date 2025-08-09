import { StatisticsService, statisticsService } from '../StatisticsService';
import { Session, SessionType, UserStats } from '../../types';
import { storage } from '../../utils/storage';
import { STORAGE_KEYS } from '../../utils/constants';

// Mock the storage utility
jest.mock('../../utils/storage');
const mockStorage = storage as jest.Mocked<typeof storage>;

describe('StatisticsService', () => {
  let service: StatisticsService;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get fresh instance
    service = StatisticsService.getInstance();
    
    // Mock storage.get to return empty stats by default
    mockStorage.get.mockReturnValue({
      totalSessions: 0,
      currentStreak: 0,
      longestStreak: 0,
      dailyStats: []
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = StatisticsService.getInstance();
      const instance2 = StatisticsService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should use the exported singleton', () => {
      expect(statisticsService).toBe(StatisticsService.getInstance());
    });
  });

  describe('recordSession', () => {
    it('should record a completed work session', () => {
      const session: Session = {
        id: '1',
        type: SessionType.WORK,
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T10:25:00Z'),
        completed: true,
        duration: 25
      };

      service.recordSession(session);

      expect(mockStorage.set).toHaveBeenCalledWith(
        STORAGE_KEYS.STATISTICS,
        expect.objectContaining({
          totalSessions: 1,
          dailyStats: expect.arrayContaining([
            expect.objectContaining({
              completedSessions: 1,
              workMinutes: 25,
              breakMinutes: 0
            })
          ])
        })
      );
    });

    it('should record a completed break session', () => {
      const session: Session = {
        id: '1',
        type: SessionType.SHORT_BREAK,
        startTime: new Date('2024-01-15T10:25:00Z'),
        endTime: new Date('2024-01-15T10:30:00Z'),
        completed: true,
        duration: 5
      };

      service.recordSession(session);

      expect(mockStorage.set).toHaveBeenCalledWith(
        STORAGE_KEYS.STATISTICS,
        expect.objectContaining({
          totalSessions: 1,
          dailyStats: expect.arrayContaining([
            expect.objectContaining({
              completedSessions: 1,
              workMinutes: 0,
              breakMinutes: 5
            })
          ])
        })
      );
    });

    it('should not record incomplete sessions', () => {
      const session: Session = {
        id: '1',
        type: SessionType.WORK,
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T10:25:00Z'),
        completed: false,
        duration: 25
      };

      service.recordSession(session);

      expect(mockStorage.set).not.toHaveBeenCalled();
    });

    it('should update existing daily stats', () => {
      const today = new Date().toISOString().split('T')[0];
      const existingStats: UserStats = {
        totalSessions: 1,
        currentStreak: 1,
        longestStreak: 1,
        dailyStats: [{
          date: today,
          completedSessions: 1,
          workMinutes: 25,
          breakMinutes: 0
        }]
      };

      mockStorage.get.mockReturnValue(existingStats);

      const session: Session = {
        id: '2',
        type: SessionType.WORK,
        startTime: new Date(),
        endTime: new Date(Date.now() + 25 * 60 * 1000),
        completed: true,
        duration: 25
      };

      service.recordSession(session);

      expect(mockStorage.set).toHaveBeenCalledWith(
        STORAGE_KEYS.STATISTICS,
        expect.objectContaining({
          totalSessions: 2,
          dailyStats: expect.arrayContaining([
            expect.objectContaining({
              date: today,
              completedSessions: 2,
              workMinutes: 50,
              breakMinutes: 0
            })
          ])
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return default stats when none exist', () => {
      const stats = service.getStats();

      expect(stats).toEqual({
        totalSessions: 0,
        currentStreak: 0,
        longestStreak: 0,
        dailyStats: []
      });

      expect(mockStorage.get).toHaveBeenCalledWith(
        STORAGE_KEYS.STATISTICS,
        expect.any(Object)
      );
    });

    it('should return stored stats', () => {
      const storedStats: UserStats = {
        totalSessions: 5,
        currentStreak: 2,
        longestStreak: 3,
        dailyStats: [
          {
            date: '2024-01-15',
            completedSessions: 3,
            workMinutes: 75,
            breakMinutes: 15
          }
        ]
      };

      mockStorage.get.mockReturnValue(storedStats);

      const stats = service.getStats();

      expect(stats).toEqual(storedStats);
    });
  });

  describe('getTodayStats', () => {
    it('should return today\'s stats if they exist', () => {
      const today = new Date().toISOString().split('T')[0];
      const storedStats: UserStats = {
        totalSessions: 3,
        currentStreak: 1,
        longestStreak: 1,
        dailyStats: [
          {
            date: today,
            completedSessions: 3,
            workMinutes: 75,
            breakMinutes: 15
          }
        ]
      };

      mockStorage.get.mockReturnValue(storedStats);

      const todayStats = service.getTodayStats();

      expect(todayStats).toEqual({
        date: today,
        completedSessions: 3,
        workMinutes: 75,
        breakMinutes: 15
      });
    });

    it('should return empty stats for today if none exist', () => {
      const today = new Date().toISOString().split('T')[0];
      
      const todayStats = service.getTodayStats();

      expect(todayStats).toEqual({
        date: today,
        completedSessions: 0,
        workMinutes: 0,
        breakMinutes: 0
      });
    });
  });

  describe('getCurrentStreak', () => {
    it('should return current streak', () => {
      const storedStats: UserStats = {
        totalSessions: 10,
        currentStreak: 5,
        longestStreak: 7,
        dailyStats: []
      };

      mockStorage.get.mockReturnValue(storedStats);

      expect(service.getCurrentStreak()).toBe(5);
    });
  });

  describe('getTotalSessions', () => {
    it('should return total sessions count', () => {
      const storedStats: UserStats = {
        totalSessions: 42,
        currentStreak: 3,
        longestStreak: 5,
        dailyStats: []
      };

      mockStorage.get.mockReturnValue(storedStats);

      expect(service.getTotalSessions()).toBe(42);
    });
  });

  describe('getRecentStats', () => {
    it('should return stats for the last 7 days by default', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(today.getDate() - 14);

      const storedStats: UserStats = {
        totalSessions: 10,
        currentStreak: 2,
        longestStreak: 3,
        dailyStats: [
          {
            date: today.toISOString().split('T')[0],
            completedSessions: 2,
            workMinutes: 50,
            breakMinutes: 10
          },
          {
            date: yesterday.toISOString().split('T')[0],
            completedSessions: 3,
            workMinutes: 75,
            breakMinutes: 15
          },
          {
            date: twoWeeksAgo.toISOString().split('T')[0],
            completedSessions: 1,
            workMinutes: 25,
            breakMinutes: 5
          }
        ]
      };

      mockStorage.get.mockReturnValue(storedStats);

      const recentStats = service.getRecentStats();

      expect(recentStats).toHaveLength(2);
      expect(recentStats[0].date).toBe(yesterday.toISOString().split('T')[0]);
      expect(recentStats[1].date).toBe(today.toISOString().split('T')[0]);
    });

    it('should return stats for custom number of days', () => {
      const today = new Date();
      const oneDayAgo = new Date(today);
      oneDayAgo.setDate(today.getDate() - 1);

      const storedStats: UserStats = {
        totalSessions: 5,
        currentStreak: 1,
        longestStreak: 2,
        dailyStats: [
          {
            date: today.toISOString().split('T')[0],
            completedSessions: 2,
            workMinutes: 50,
            breakMinutes: 10
          },
          {
            date: oneDayAgo.toISOString().split('T')[0],
            completedSessions: 1,
            workMinutes: 25,
            breakMinutes: 5
          }
        ]
      };

      mockStorage.get.mockReturnValue(storedStats);

      const recentStats = service.getRecentStats(3);

      expect(recentStats).toHaveLength(2);
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics to default values', () => {
      service.resetStats();

      expect(mockStorage.set).toHaveBeenCalledWith(
        STORAGE_KEYS.STATISTICS,
        {
          totalSessions: 0,
          currentStreak: 0,
          longestStreak: 0,
          dailyStats: []
        }
      );
    });
  });

  describe('onStatsChange', () => {
    it('should notify listeners when stats change', () => {
      const listener = jest.fn();
      const unsubscribe = service.onStatsChange(listener);

      const session: Session = {
        id: '1',
        type: SessionType.WORK,
        startTime: new Date(),
        endTime: new Date(),
        completed: true,
        duration: 25
      };

      service.recordSession(session);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          totalSessions: 1
        })
      );

      // Test unsubscribe
      unsubscribe();
      service.recordSession(session);

      // Should not be called again after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('streak calculation', () => {
    beforeEach(() => {
      // Mock current date to be consistent
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate streak correctly for consecutive days', () => {
      // Test with pre-existing consecutive daily stats
      const existingStats: UserStats = {
        totalSessions: 2,
        currentStreak: 2,
        longestStreak: 2,
        dailyStats: [
          {
            date: '2024-01-13',
            completedSessions: 1,
            workMinutes: 25,
            breakMinutes: 0
          },
          {
            date: '2024-01-14',
            completedSessions: 1,
            workMinutes: 25,
            breakMinutes: 0
          }
        ]
      };

      mockStorage.get.mockReturnValue(existingStats);

      // Add today's session to make it 3 consecutive days
      const session: Session = {
        id: '3',
        type: SessionType.WORK,
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T10:25:00Z'),
        completed: true,
        duration: 25
      };

      service.recordSession(session);

      const savedStats = mockStorage.set.mock.calls[0][1] as UserStats;
      expect(savedStats.currentStreak).toBe(3);
      expect(savedStats.longestStreak).toBe(3);
    });

    it('should reset streak when days are not consecutive', () => {
      // Set up existing stats with a gap
      const existingStats: UserStats = {
        totalSessions: 2,
        currentStreak: 2,
        longestStreak: 2,
        dailyStats: [
          {
            date: '2024-01-10', // 5 days ago
            completedSessions: 1,
            workMinutes: 25,
            breakMinutes: 0
          },
          {
            date: '2024-01-11', // 4 days ago
            completedSessions: 1,
            workMinutes: 25,
            breakMinutes: 0
          }
        ]
      };

      mockStorage.get.mockReturnValue(existingStats);

      // Record session today (breaking the streak)
      const session: Session = {
        id: '3',
        type: SessionType.WORK,
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T10:25:00Z'),
        completed: true,
        duration: 25
      };

      service.recordSession(session);

      const savedStats = mockStorage.set.mock.calls[0][1] as UserStats;
      expect(savedStats.currentStreak).toBe(1); // Only today
      expect(savedStats.longestStreak).toBe(2); // Previous streak was longer
    });
  });

  describe('data cleanup', () => {
    it('should remove data older than 90 days', () => {
      const today = new Date();
      const oldDate = new Date(today);
      oldDate.setDate(today.getDate() - 100); // 100 days ago

      const existingStats: UserStats = {
        totalSessions: 2,
        currentStreak: 1,
        longestStreak: 1,
        dailyStats: [
          {
            date: oldDate.toISOString().split('T')[0],
            completedSessions: 1,
            workMinutes: 25,
            breakMinutes: 0
          },
          {
            date: today.toISOString().split('T')[0],
            completedSessions: 1,
            workMinutes: 25,
            breakMinutes: 0
          }
        ]
      };

      mockStorage.get.mockReturnValue(existingStats);

      const session: Session = {
        id: '1',
        type: SessionType.WORK,
        startTime: today,
        endTime: new Date(today.getTime() + 25 * 60 * 1000),
        completed: true,
        duration: 25
      };

      service.recordSession(session);

      const savedStats = mockStorage.set.mock.calls[0][1] as UserStats;
      expect(savedStats.dailyStats).toHaveLength(1);
      expect(savedStats.dailyStats[0].date).toBe(today.toISOString().split('T')[0]);
    });
  });
});