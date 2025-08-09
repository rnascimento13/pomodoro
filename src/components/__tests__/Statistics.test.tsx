import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Statistics } from '../Statistics';
import { statisticsService } from '../../services/StatisticsService';
import { UserStats, DailyStats } from '../../types';

// Mock the statistics service
jest.mock('../../services/StatisticsService');
const mockStatisticsService = statisticsService as jest.Mocked<typeof statisticsService>;

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true
});

describe('Statistics Component', () => {
  const mockStats: UserStats = {
    totalSessions: 42,
    currentStreak: 5,
    longestStreak: 10,
    dailyStats: []
  };

  const mockTodayStats: DailyStats = {
    date: '2024-01-15',
    completedSessions: 3,
    workMinutes: 75,
    breakMinutes: 15
  };

  const mockRecentStats: DailyStats[] = [
    { date: '2024-01-09', completedSessions: 2, workMinutes: 50, breakMinutes: 10 },
    { date: '2024-01-10', completedSessions: 1, workMinutes: 25, breakMinutes: 5 },
    { date: '2024-01-11', completedSessions: 4, workMinutes: 100, breakMinutes: 20 },
    { date: '2024-01-12', completedSessions: 0, workMinutes: 0, breakMinutes: 0 },
    { date: '2024-01-13', completedSessions: 3, workMinutes: 75, breakMinutes: 15 },
    { date: '2024-01-14', completedSessions: 2, workMinutes: 50, breakMinutes: 10 },
    { date: '2024-01-15', completedSessions: 3, workMinutes: 75, breakMinutes: 15 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStatisticsService.getStats.mockReturnValue(mockStats);
    mockStatisticsService.getTodayStats.mockReturnValue(mockTodayStats);
    mockStatisticsService.getRecentStats.mockReturnValue(mockRecentStats);
    mockStatisticsService.onStatsChange.mockReturnValue(() => {});
  });

  describe('rendering', () => {
    it('should render statistics title', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    it('should render reset button', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('Reset All Data')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Statistics isOpen={true} onClose={() => {}} className="custom-class" />);
      expect(container.firstChild?.firstChild).toHaveClass('statistics-modal', 'custom-class');
    });
  });

  describe('today\'s statistics', () => {
    it('should display today\'s session count', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      const todayCard = screen.getByText('Today').closest('.statistics__card');
      expect(todayCard).toHaveTextContent('3');
      expect(todayCard).toHaveTextContent('Sessions');
    });

    it('should display today\'s work and break minutes', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('1h 15m')).toBeInTheDocument(); // 75 minutes work
      expect(screen.getByText('15m')).toBeInTheDocument(); // 15 minutes break
    });

    it('should format minutes correctly for different durations', () => {
      const customTodayStats: DailyStats = {
        date: '2024-01-15',
        completedSessions: 1,
        workMinutes: 30,
        breakMinutes: 120 // 2 hours
      };

      mockStatisticsService.getTodayStats.mockReturnValue(customTodayStats);

      render(<Statistics isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('30m')).toBeInTheDocument();
      expect(screen.getByText('2h')).toBeInTheDocument();
    });
  });

  describe('streak statistics', () => {
    it('should display current streak', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Days')).toBeInTheDocument();
    });

    it('should display longest streak', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('10 days')).toBeInTheDocument();
    });
  });

  describe('total statistics', () => {
    it('should display total sessions', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should calculate and display weekly average', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      // Total sessions in recent stats: 2+1+4+0+3+2+3 = 15
      // Average: 15/7 = 2.1
      expect(screen.getByText('2.1')).toBeInTheDocument();
    });

    it('should handle empty recent stats for weekly average', () => {
      mockStatisticsService.getRecentStats.mockReturnValue([]);
      
      render(<Statistics isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('weekly chart', () => {
    it('should render chart when recent stats exist', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    });

    it('should render chart bars for each day', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      // Should have 7 bars (one for each day)
      const chartBars = document.querySelectorAll('.statistics__chart-bar');
      expect(chartBars).toHaveLength(7);
    });

    it('should display day names and values', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      // Check for chart container and bars
      const chartContainer = screen.getByText('Last 7 Days').parentElement;
      expect(chartContainer).toHaveTextContent('4'); // Highest day value
      
      // Check that we have chart bars with values
      const chartBars = document.querySelectorAll('.statistics__chart-bar-value');
      expect(chartBars).toHaveLength(7);
    });

    it('should not render chart when no recent stats', () => {
      mockStatisticsService.getRecentStats.mockReturnValue([]);
      
      render(<Statistics isOpen={true} onClose={() => {}} />);
      expect(screen.queryByText('Last 7 Days')).not.toBeInTheDocument();
    });

    it('should calculate bar heights correctly', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      const chartBars = document.querySelectorAll('.statistics__chart-bar-fill');
      
      // The highest value is 4, so that bar should have 100% height
      const maxBar = Array.from(chartBars).find(bar => 
        (bar as HTMLElement).style.height === '100%'
      );
      expect(maxBar).toBeTruthy();
    });
  });

  describe('achievements', () => {
    it('should render achievements section', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('Achievements')).toBeInTheDocument();
    });

    it('should show earned badges for qualifying stats', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      // With 42 total sessions, should have earned these badges
      expect(screen.getByText('First Session')).toBeInTheDocument();
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('Dedicated')).toBeInTheDocument();
      
      // Should have earned badges class
      const earnedBadges = document.querySelectorAll('.statistics__badge--earned');
      expect(earnedBadges.length).toBeGreaterThan(0);
    });

    it('should show unearned badges with requirements', () => {
      const lowStats: UserStats = {
        totalSessions: 5,
        currentStreak: 2,
        longestStreak: 3,
        dailyStats: []
      };

      mockStatisticsService.getStats.mockReturnValue(lowStats);

      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      // Should show requirement for Getting Started badge
      expect(screen.getByText('5 more')).toBeInTheDocument();
    });

    it('should show streak-based achievements', () => {
      const highStreakStats: UserStats = {
        totalSessions: 50,
        currentStreak: 15,
        longestStreak: 20,
        dailyStats: []
      };

      mockStatisticsService.getStats.mockReturnValue(highStreakStats);

      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      expect(screen.getByText('Week Warrior')).toBeInTheDocument();
    });
  });

  describe('reset functionality', () => {
    it('should show confirmation dialog when reset is clicked', () => {
      mockConfirm.mockReturnValue(false);
      
      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      const resetButton = screen.getByText('Reset All Data');
      fireEvent.click(resetButton);
      
      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to reset all statistics? This action cannot be undone.'
      );
    });

    it('should call resetStats when confirmed', () => {
      mockConfirm.mockReturnValue(true);
      
      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      const resetButton = screen.getByText('Reset All Data');
      fireEvent.click(resetButton);
      
      expect(mockStatisticsService.resetStats).toHaveBeenCalled();
    });

    it('should not call resetStats when cancelled', () => {
      mockConfirm.mockReturnValue(false);
      
      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      const resetButton = screen.getByText('Reset All Data');
      fireEvent.click(resetButton);
      
      expect(mockStatisticsService.resetStats).not.toHaveBeenCalled();
    });
  });

  describe('data updates', () => {
    it('should subscribe to statistics changes on mount', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      expect(mockStatisticsService.onStatsChange).toHaveBeenCalled();
    });

    it('should unsubscribe on unmount', () => {
      const mockUnsubscribe = jest.fn();
      mockStatisticsService.onStatsChange.mockReturnValue(mockUnsubscribe);
      
      const { unmount } = render(<Statistics isOpen={true} onClose={() => {}} />);
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should update display when stats change', async () => {
      let statsChangeCallback: (stats: UserStats) => void = () => {};
      
      mockStatisticsService.onStatsChange.mockImplementation((callback) => {
        statsChangeCallback = callback;
        return () => {};
      });

      render(<Statistics isOpen={true} onClose={() => {}} />);

      // Simulate stats change
      const newStats: UserStats = {
        totalSessions: 100,
        currentStreak: 15,
        longestStreak: 20,
        dailyStats: []
      };

      const newTodayStats: DailyStats = {
        date: '2024-01-15',
        completedSessions: 5,
        workMinutes: 125,
        breakMinutes: 25
      };

      mockStatisticsService.getStats.mockReturnValue(newStats);
      mockStatisticsService.getTodayStats.mockReturnValue(newTodayStats);

      act(() => {
        statsChangeCallback(newStats);
      });

      await waitFor(() => {
        const totalCard = screen.getByText('All Time').closest('.statistics__card');
        const streakCard = screen.getByText('Current Streak').closest('.statistics__card');
        const todayCard = screen.getByText('Today').closest('.statistics__card');
        
        expect(totalCard).toHaveTextContent('100');
        expect(streakCard).toHaveTextContent('15');
        expect(todayCard).toHaveTextContent('5');
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper button roles and labels', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      const resetButton = screen.getByRole('button', { name: /reset all statistics data/i });
      expect(resetButton).toHaveAttribute('title', 'Reset all statistics');
    });

    it('should have proper heading structure', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      expect(screen.getByRole('heading', { level: 2, name: 'Statistics' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Today' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Current Streak' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'All Time' })).toBeInTheDocument();
    });

    it('should have chart tooltips for accessibility', () => {
      render(<Statistics isOpen={true} onClose={() => {}} />);
      
      const chartBars = document.querySelectorAll('.statistics__chart-bar-fill');
      chartBars.forEach(bar => {
        expect(bar).toHaveAttribute('title');
      });
    });
  });
});