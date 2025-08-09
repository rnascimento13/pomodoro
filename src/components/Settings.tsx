import React, { useState, useEffect } from 'react';
import { Settings as SettingsType, SoundType } from '../types';
import { settingsService } from '../services/SettingsService';
import { notificationService } from '../services/NotificationService';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<SettingsType>(settingsService.getSettings());
  const [tempSettings, setTempSettings] = useState<SettingsType>(settingsService.getSettings());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    notificationService.getNotificationPermission()
  );
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  useEffect(() => {
    const unsubscribe = settingsService.onSettingsChange(setSettings);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTempSettings(settings);
      setNotificationPermission(notificationService.getNotificationPermission());
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    settingsService.updateSettings(tempSettings);
    onClose();
  };

  const handleCancel = () => {
    setTempSettings(settings);
    onClose();
  };

  const handleReset = () => {
    settingsService.resetToDefaults();
    onClose();
  };

  const updateTempSetting = <K extends keyof SettingsType>(
    key: K,
    value: SettingsType[K]
  ) => {
    setTempSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleRequestNotificationPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const granted = await notificationService.requestPermission();
      setNotificationPermission(granted ? 'granted' : 'denied');
      
      if (granted) {
        // Enable notifications in settings if permission was granted
        updateTempSetting('notificationsEnabled', true);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleNotificationToggle = (enabled: boolean) => {
    if (enabled && notificationPermission !== 'granted') {
      // Request permission first
      handleRequestNotificationPermission();
    } else {
      updateTempSetting('notificationsEnabled', enabled);
    }
  };

  const handleSoundToggle = (enabled: boolean) => {
    updateTempSetting('soundEnabled', enabled);
    // Update the notification service immediately for testing
    notificationService.setSoundEnabled(enabled);
  };

  const handleTestSound = async (soundType: SoundType) => {
    setIsTestingSound(true);
    try {
      await notificationService.testSound(soundType);
    } catch (error) {
      console.error('Error testing sound:', error);
    } finally {
      setIsTestingSound(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      await notificationService.testNotification();
    } catch (error) {
      console.error('Error testing notification:', error);
    } finally {
      setIsTestingNotification(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={handleCancel} role="presentation">
      <div 
        className="settings-modal" 
        role="dialog" 
        aria-labelledby="settings-title" 
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button 
            className="close-button" 
            onClick={handleCancel} 
            aria-label="Close settings"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="settings-content">
          {/* Duration Settings */}
          <section className="settings-section">
            <h3>Timer Durations</h3>
            
            <div className="setting-item">
              <label htmlFor="work-duration">
                Work Session: {tempSettings.workDuration} minutes
              </label>
              <input
                id="work-duration"
                type="range"
                min="5"
                max="60"
                step="1"
                value={tempSettings.workDuration}
                onChange={(e) => updateTempSetting('workDuration', parseInt(e.target.value))}
                className="duration-slider"
                aria-describedby="work-duration-range"
                aria-label={`Work session duration: ${tempSettings.workDuration} minutes`}
              />
              <div id="work-duration-range" className="slider-range">5 min - 60 min</div>
            </div>

            <div className="setting-item">
              <label htmlFor="short-break-duration">
                Short Break: {tempSettings.shortBreakDuration} minutes
              </label>
              <input
                id="short-break-duration"
                type="range"
                min="1"
                max="15"
                step="1"
                value={tempSettings.shortBreakDuration}
                onChange={(e) => updateTempSetting('shortBreakDuration', parseInt(e.target.value))}
                className="duration-slider"
                aria-describedby="short-break-duration-range"
                aria-label={`Short break duration: ${tempSettings.shortBreakDuration} minutes`}
              />
              <div id="short-break-duration-range" className="slider-range">1 min - 15 min</div>
            </div>

            <div className="setting-item">
              <label htmlFor="long-break-duration">
                Long Break: {tempSettings.longBreakDuration} minutes
              </label>
              <input
                id="long-break-duration"
                type="range"
                min="5"
                max="30"
                step="1"
                value={tempSettings.longBreakDuration}
                onChange={(e) => updateTempSetting('longBreakDuration', parseInt(e.target.value))}
                className="duration-slider"
                aria-describedby="long-break-duration-range"
                aria-label={`Long break duration: ${tempSettings.longBreakDuration} minutes`}
              />
              <div id="long-break-duration-range" className="slider-range">5 min - 30 min</div>
            </div>
          </section>

          {/* Notification Settings */}
          <section className="settings-section">
            <h3>Notifications</h3>
            
            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={tempSettings.soundEnabled}
                  onChange={(e) => handleSoundToggle(e.target.checked)}
                  aria-describedby="sound-description"
                />
                <span className="toggle-slider" aria-hidden="true"></span>
                Sound Notifications
              </label>
              <div id="sound-description" className="setting-description">
                Play audio alerts when sessions complete
              </div>
              {tempSettings.soundEnabled && (
                <div className="test-buttons">
                  <button
                    className="test-button"
                    onClick={() => handleTestSound(SoundType.WORK_COMPLETE)}
                    disabled={isTestingSound}
                    type="button"
                    aria-label="Test work complete sound"
                  >
                    {isTestingSound ? 'Testing...' : 'Test Work Sound'}
                  </button>
                  <button
                    className="test-button"
                    onClick={() => handleTestSound(SoundType.BREAK_COMPLETE)}
                    disabled={isTestingSound}
                    type="button"
                    aria-label="Test break complete sound"
                  >
                    {isTestingSound ? 'Testing...' : 'Test Break Sound'}
                  </button>
                </div>
              )}
            </div>

            <div className="setting-item">
              <div className="notification-setting">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={tempSettings.notificationsEnabled}
                    onChange={(e) => handleNotificationToggle(e.target.checked)}
                    disabled={notificationPermission === 'unsupported'}
                    aria-describedby="browser-notifications-description"
                  />
                  <span className="toggle-slider" aria-hidden="true"></span>
                  Browser Notifications
                </label>
                
                {notificationPermission === 'unsupported' && (
                  <div className="permission-status unsupported">
                    Browser notifications not supported
                  </div>
                )}
                
                {notificationPermission === 'denied' && (
                  <div className="permission-status denied">
                    Notifications blocked. Enable in browser settings.
                  </div>
                )}
                
                {notificationPermission === 'default' && (
                  <button 
                    className="permission-button"
                    onClick={handleRequestNotificationPermission}
                    disabled={isRequestingPermission}
                    type="button"
                    aria-label="Request browser notification permission"
                  >
                    {isRequestingPermission ? 'Requesting...' : 'Request Permission'}
                  </button>
                )}
                
                {notificationPermission === 'granted' && (
                  <div className="permission-status granted">
                    ✓ Notifications enabled
                  </div>
                )}
              </div>
              <div id="browser-notifications-description" className="setting-description">
                Show desktop notifications when sessions complete
              </div>
              {tempSettings.notificationsEnabled && notificationPermission === 'granted' && (
                <div className="test-buttons">
                  <button
                    className="test-button"
                    onClick={handleTestNotification}
                    disabled={isTestingNotification}
                    type="button"
                    aria-label="Test browser notification"
                  >
                    {isTestingNotification ? 'Testing...' : 'Test Notification'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Auto-start Settings */}
          <section className="settings-section">
            <h3>Auto-start</h3>
            
            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={tempSettings.autoStartBreaks}
                  onChange={(e) => updateTempSetting('autoStartBreaks', e.target.checked)}
                  aria-describedby="auto-start-breaks-description"
                />
                <span className="toggle-slider" aria-hidden="true"></span>
                Auto-start Breaks
              </label>
              <div id="auto-start-breaks-description" className="setting-description">
                Automatically start break sessions when work sessions complete
              </div>
            </div>

            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={tempSettings.autoStartWork}
                  onChange={(e) => updateTempSetting('autoStartWork', e.target.checked)}
                  aria-describedby="auto-start-work-description"
                />
                <span className="toggle-slider" aria-hidden="true"></span>
                Auto-start Work Sessions
              </label>
              <div id="auto-start-work-description" className="setting-description">
                Automatically start work sessions when breaks complete
              </div>
            </div>
          </section>
        </div>

        <div className="settings-footer">
          <button 
            className="reset-button" 
            onClick={handleReset}
            type="button"
            aria-label="Reset all settings to default values"
          >
            Reset to Defaults
          </button>
          <div className="action-buttons">
            <button 
              className="cancel-button" 
              onClick={handleCancel}
              type="button"
              aria-label="Cancel changes and close settings"
            >
              Cancel
            </button>
            <button 
              className="save-button" 
              onClick={handleSave}
              type="button"
              aria-label="Save settings changes"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};