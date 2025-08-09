import React, { useState, useEffect } from 'react';
import { UserStats, DailyStats } from '../types';
import { statisticsService } from '../services/StatisticsService';
import './Statistics.css';

interface StatisticsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const Statistics: React.FC<StatisticsProps> = ({ isOpen, onClose, className = '' }) => {
  const [stats, setStats] = useState<UserStats>({
    totalSessions: 0,
    currentStreak: 0,
    longestStreak: 0,
    dailyStats: []
  });
  const [todayStats, setTodayStats] = useState<DailyStats>({
    date: '',
    completedSessions: 0,
    workMinutes: 0,
    breakMinutes: 0
  });
  const [recentStats, setRecentStats] = useState<DailyStats[]>([]);

  useEffect(() => {
    // Load initial data
    loadStats();

    // Subscribe to statistics changes
    const unsubscribe = statisticsService.onStatsChange(loadStats);

    return unsubscribe;
  }, []);

  const loadStats = (updatedStats?: UserStats) => {
    const currentStats = updatedStats || statisticsService.getStats();
    const today = statisticsService.getTodayStats();
    const recent = statisticsService.getRecentStats(7);

    setStats(currentStats);
    setTodayStats(today);
    setRecentStats(recent);
  };

  const handleResetStats = () => {
    if (window.confirm('Are you sure you want to reset all statistics? This action cannot be undone.')) {
      statisticsService.resetStats();
    }
  };

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getWeeklyAverage = (): number => {
    if (recentStats.length === 0) return 0;
    const totalSessions = recentStats.reduce((sum, day) => sum + day.completedSessions, 0);
    return Math.round((totalSessions / recentStats.length) * 10) / 10;
  };

  const getMaxDailySessions = (): number => {
    return Math.max(...recentStats.map(day => day.completedSessions), 0);
  };

  if (!isOpen) return null;

  return (
    <div className="statistics-overlay" onClick={onClose} role="presentation">
      <div 
        className={`statistics-modal ${className}`} 
        role="dialog" 
        aria-labelledby="statistics-title" 
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="statistics-header">
          <h2 id="statistics-title">Statistics</h2>
          <button 
            className="close-button" 
            onClick={onClose} 
            aria-label="Close statistics"
            type="button"
          >
            ×
          </button>
        </div>
        
        <div className="statistics-content">
          <div className="statistics-actions">
            <button 
              className="statistics-reset-button"
              onClick={handleResetStats}
              title="Reset all statistics"
              type="button"
              aria-label="Reset all statistics data"
            >
              Reset All Data
            </button>
          </div>

      <div className="statistics__grid" role="group" aria-label="Statistics overview">
        {/* Today's Stats */}
        <div className="statistics__card statistics__card--today" role="region" aria-labelledby="today-title">
          <h3 id="today-title" className="statistics__card-title">Today</h3>
          <div className="statistics__metric">
            <span className="statistics__metric-value" aria-label={`${todayStats.completedSessions} sessions completed today`}>{todayStats.completedSessions}</span>
            <span className="statistics__metric-label">Sessions</span>
          </div>
          <div className="statistics__details">
            <div className="statistics__detail">
              <span className="statistics__detail-label">Work:</span>
              <span className="statistics__detail-value" aria-label={`${formatMinutes(todayStats.workMinutes)} of work time today`}>{formatMinutes(todayStats.workMinutes)}</span>
            </div>
            <div className="statistics__detail">
              <span className="statistics__detail-label">Break:</span>
              <span className="statistics__detail-value" aria-label={`${formatMinutes(todayStats.breakMinutes)} of break time today`}>{formatMinutes(todayStats.breakMinutes)}</span>
            </div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="statistics__card statistics__card--streak" role="region" aria-labelledby="streak-title">
          <h3 id="streak-title" className="statistics__card-title">Current Streak</h3>
          <div className="statistics__metric">
            <span className="statistics__metric-value" aria-label={`Current streak: ${stats.currentStreak} days`}>{stats.currentStreak}</span>
            <span className="statistics__metric-label">Days</span>
          </div>
          <div className="statistics__details">
            <div className="statistics__detail">
              <span className="statistics__detail-label">Best:</span>
              <span className="statistics__detail-value" aria-label={`Best streak: ${stats.longestStreak} days`}>{stats.longestStreak} days</span>
            </div>
          </div>
        </div>

        {/* Total Sessions */}
        <div className="statistics__card statistics__card--total" role="region" aria-labelledby="total-title">
          <h3 id="total-title" className="statistics__card-title">All Time</h3>
          <div className="statistics__metric">
            <span className="statistics__metric-value" aria-label={`Total sessions completed: ${stats.totalSessions}`}>{stats.totalSessions}</span>
            <span className="statistics__metric-label">Sessions</span>
          </div>
          <div className="statistics__details">
            <div className="statistics__detail">
              <span className="statistics__detail-label">Weekly avg:</span>
              <span className="statistics__detail-value" aria-label={`Weekly average: ${getWeeklyAverage()} sessions`}>{getWeeklyAverage()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      {recentStats.length > 0 && (
        <div className="statistics__chart" role="region" aria-labelledby="chart-title">
          <h3 id="chart-title" className="statistics__chart-title">Last 7 Days</h3>
          <div 
            className="statistics__chart-container" 
            role="img" 
            aria-label={`Bar chart showing sessions completed over the last 7 days. Maximum sessions in a day: ${getMaxDailySessions()}`}
          >
            {recentStats.map((day) => {
              const height = getMaxDailySessions() > 0 
                ? (day.completedSessions / getMaxDailySessions()) * 100 
                : 0;
              const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
              
              return (
                <div key={day.date} className="statistics__chart-bar" role="presentation">
                  <div 
                    className="statistics__chart-bar-fill"
                    style={{ height: `${height}%` }}
                    title={`${dayName}: ${day.completedSessions} sessions`}
                    aria-label={`${dayName}: ${day.completedSessions} sessions completed`}
                  />
                  <span className="statistics__chart-bar-label">{dayName}</span>
                  <span className="statistics__chart-bar-value" aria-label={`${day.completedSessions} sessions`}>{day.completedSessions}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Achievement Badges */}
      <div className="statistics__achievements" role="region" aria-labelledby="achievements-title">
        <h3 id="achievements-title" className="statistics__achievements-title">Achievements</h3>
        <div className="statistics__badges" role="list" aria-label="Achievement badges">
          {stats.totalSessions >= 1 && (
            <div className="statistics__badge statistics__badge--earned" role="listitem" aria-label="Achievement earned: First Session">
              <span className="statistics__badge-icon" role="img" aria-label="Target">🎯</span>
              <span className="statistics__badge-name">First Session</span>
            </div>
          )}
          {stats.totalSessions >= 10 && (
            <div className="statistics__badge statistics__badge--earned" role="listitem" aria-label="Achievement earned: Getting Started">
              <span className="statistics__badge-icon" role="img" aria-label="Fire">🔥</span>
              <span className="statistics__badge-name">Getting Started</span>
            </div>
          )}
          {stats.totalSessions >= 50 && (
            <div className="statistics__badge statistics__badge--earned" role="listitem" aria-label="Achievement earned: Dedicated">
              <span className="statistics__badge-icon" role="img" aria-label="Muscle">💪</span>
              <span className="statistics__badge-name">Dedicated</span>
            </div>
          )}
          {stats.totalSessions >= 100 && (
            <div className="statistics__badge statistics__badge--earned" role="listitem" aria-label="Achievement earned: Centurion">
              <span className="statistics__badge-icon" role="img" aria-label="Trophy">🏆</span>
              <span className="statistics__badge-name">Centurion</span>
            </div>
          )}
          {stats.currentStreak >= 7 && (
            <div className="statistics__badge statistics__badge--earned" role="listitem" aria-label="Achievement earned: Week Warrior">
              <span className="statistics__badge-icon" role="img" aria-label="Calendar">📅</span>
              <span className="statistics__badge-name">Week Warrior</span>
            </div>
          )}
          {stats.currentStreak >= 30 && (
            <div className="statistics__badge statistics__badge--earned" role="listitem" aria-label="Achievement earned: Month Master">
              <span className="statistics__badge-icon" role="img" aria-label="Star">🌟</span>
              <span className="statistics__badge-name">Month Master</span>
            </div>
          )}
          
          {/* Unearned badges */}
          {stats.totalSessions < 10 && (
            <div className="statistics__badge" role="listitem" aria-label={`Achievement locked: Getting Started. Need ${10 - stats.totalSessions} more sessions`}>
              <span className="statistics__badge-icon" role="img" aria-label="Fire">🔥</span>
              <span className="statistics__badge-name">Getting Started</span>
              <span className="statistics__badge-requirement">{10 - stats.totalSessions} more</span>
            </div>
          )}
          {stats.totalSessions < 50 && stats.totalSessions >= 10 && (
            <div className="statistics__badge" role="listitem" aria-label={`Achievement locked: Dedicated. Need ${50 - stats.totalSessions} more sessions`}>
              <span className="statistics__badge-icon" role="img" aria-label="Muscle">💪</span>
              <span className="statistics__badge-name">Dedicated</span>
              <span className="statistics__badge-requirement">{50 - stats.totalSessions} more</span>
            </div>
          )}
          {stats.totalSessions < 100 && stats.totalSessions >= 50 && (
            <div className="statistics__badge" role="listitem" aria-label={`Achievement locked: Centurion. Need ${100 - stats.totalSessions} more sessions`}>
              <span className="statistics__badge-icon" role="img" aria-label="Trophy">🏆</span>
              <span className="statistics__badge-name">Centurion</span>
              <span className="statistics__badge-requirement">{100 - stats.totalSessions} more</span>
            </div>
          )}
          {stats.currentStreak < 7 && (
            <div className="statistics__badge" role="listitem" aria-label={`Achievement locked: Week Warrior. Need ${7 - stats.currentStreak} more consecutive days`}>
              <span className="statistics__badge-icon" role="img" aria-label="Calendar">📅</span>
              <span className="statistics__badge-name">Week Warrior</span>
              <span className="statistics__badge-requirement">{7 - stats.currentStreak} more days</span>
            </div>
          )}
          {stats.currentStreak < 30 && stats.currentStreak >= 7 && (
            <div className="statistics__badge" role="listitem" aria-label={`Achievement locked: Month Master. Need ${30 - stats.currentStreak} more consecutive days`}>
              <span className="statistics__badge-icon" role="img" aria-label="Star">🌟</span>
              <span className="statistics__badge-name">Month Master</span>
              <span className="statistics__badge-requirement">{30 - stats.currentStreak} more days</span>
            </div>
          )}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;