import React, { useState, useEffect } from 'react';
import { testServiceWorker, testCacheStorage, testServiceWorkerUpdate, testOfflineFunctionality, runServiceWorkerTests } from '../utils/sw-test';
import PerformanceService from '../services/PerformanceService';
import './PWATestSuite.css';

interface PWATestSuiteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestResults {
  serviceWorker: any;
  performance: any;
  loading: boolean;
  error: string | null;
}

export const PWATestSuite: React.FC<PWATestSuiteProps> = ({ isOpen, onClose }) => {
  const [results, setResults] = useState<TestResults>({
    serviceWorker: null,
    performance: null,
    loading: false,
    error: null
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'sw' | 'performance' | 'cache'>('overview');

  const runTests = async () => {
    setResults(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Run service worker tests
      const swResults = await runServiceWorkerTests();
      
      // Run performance audit
      const performanceService = PerformanceService.getInstance();
      const performanceResults = await performanceService.runPerformanceAudit();
      
      setResults({
        serviceWorker: swResults,
        performance: performanceResults,
        loading: false,
        error: null
      });
    } catch (error) {
      setResults(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  };

  useEffect(() => {
    if (isOpen && !results.serviceWorker && !results.loading) {
      runTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderOverview = () => {
    if (results.loading) {
      return (
        <div className="test-loading">
          <div className="loading-spinner"></div>
          <p>Running PWA tests...</p>
        </div>
      );
    }

    if (results.error) {
      return (
        <div className="test-error">
          <h3>❌ Test Error</h3>
          <p>{results.error}</p>
          <button onClick={runTests} className="retry-button">
            Retry Tests
          </button>
        </div>
      );
    }

    if (!results.serviceWorker || !results.performance) {
      return (
        <div className="test-placeholder">
          <p>Click "Run Tests" to start PWA validation</p>
          <button onClick={runTests} className="run-tests-button">
            Run Tests
          </button>
        </div>
      );
    }

    const swScore = results.serviceWorker.overall.score;
    const perfScore = results.performance.score;
    const overallScore = Math.round((swScore + perfScore) / 2);

    return (
      <div className="test-overview">
        <div className="score-summary">
          <div className="overall-score">
            <div className={`score-circle ${getScoreClass(overallScore)}`}>
              <span className="score-value">{overallScore}</span>
              <span className="score-label">Overall</span>
            </div>
          </div>
          
          <div className="score-breakdown">
            <div className="score-item">
              <div className={`score-badge ${getScoreClass(swScore)}`}>
                {swScore}
              </div>
              <span>Service Worker</span>
            </div>
            <div className="score-item">
              <div className={`score-badge ${getScoreClass(perfScore)}`}>
                {perfScore}
              </div>
              <span>Performance</span>
            </div>
          </div>
        </div>

        <div className="test-summary">
          <div className="summary-section">
            <h4>✅ Passing Tests</h4>
            <ul>
              {results.serviceWorker.registration.isRegistered && <li>Service Worker registered</li>}
              {results.serviceWorker.registration.isActive && <li>Service Worker active</li>}
              {results.serviceWorker.cache.success && <li>Cache storage working</li>}
              {results.serviceWorker.offline.canWorkOffline && <li>Offline functionality enabled</li>}
              {results.performance.score > 70 && <li>Performance within acceptable range</li>}
            </ul>
          </div>

          {(results.serviceWorker.overall.recommendations.length > 0 || results.performance.issues.length > 0) && (
            <div className="summary-section">
              <h4>⚠️ Recommendations</h4>
              <ul>
                {results.serviceWorker.overall.recommendations.map((rec: string, index: number) => (
                  <li key={index}>{rec}</li>
                ))}
                {results.performance.recommendations.map((rec: string, index: number) => (
                  <li key={`perf-${index}`}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderServiceWorkerTab = () => {
    if (!results.serviceWorker) return <div>No service worker data available</div>;

    const { registration, cache, update, offline } = results.serviceWorker;

    return (
      <div className="sw-details">
        <div className="test-section">
          <h4>📋 Registration Status</h4>
          <div className="test-grid">
            <div className={`test-item ${registration.isRegistered ? 'pass' : 'fail'}`}>
              <span className="test-icon">{registration.isRegistered ? '✅' : '❌'}</span>
              <span>Registered</span>
            </div>
            <div className={`test-item ${registration.isActive ? 'pass' : 'fail'}`}>
              <span className="test-icon">{registration.isActive ? '✅' : '❌'}</span>
              <span>Active</span>
            </div>
            <div className={`test-item ${registration.isControlling ? 'pass' : 'fail'}`}>
              <span className="test-icon">{registration.isControlling ? '✅' : '❌'}</span>
              <span>Controlling</span>
            </div>
            <div className={`test-item ${registration.updateAvailable ? 'warning' : 'pass'}`}>
              <span className="test-icon">{registration.updateAvailable ? '🔄' : '✅'}</span>
              <span>Update Available</span>
            </div>
          </div>
        </div>

        <div className="test-section">
          <h4>💾 Cache Storage</h4>
          <div className="cache-info">
            <p><strong>Cache Names:</strong> {cache.cacheNames.join(', ') || 'None'}</p>
            <p><strong>Total Size:</strong> {formatBytes(cache.totalCacheSize)}</p>
            <p><strong>Status:</strong> {cache.success ? '✅ Working' : '❌ Issues detected'}</p>
          </div>
        </div>

        <div className="test-section">
          <h4>🌐 Offline Capability</h4>
          <div className="offline-info">
            <p><strong>Can Work Offline:</strong> {offline.canWorkOffline ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Cached Resources:</strong> {offline.cachedResources}</p>
          </div>
        </div>

        {registration.errors.length > 0 && (
          <div className="test-section">
            <h4>❌ Errors</h4>
            <ul className="error-list">
              {registration.errors.map((error: string, index: number) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderPerformanceTab = () => {
    if (!results.performance) return <div>No performance data available</div>;

    return (
      <div className="performance-details">
        <div className="performance-score">
          <h4>📊 Performance Score: {results.performance.score}/100</h4>
        </div>

        {results.performance.issues.length > 0 && (
          <div className="test-section">
            <h4>⚠️ Performance Issues</h4>
            <ul className="issue-list">
              {results.performance.issues.map((issue: string, index: number) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {results.performance.recommendations.length > 0 && (
          <div className="test-section">
            <h4>💡 Recommendations</h4>
            <ul className="recommendation-list">
              {results.performance.recommendations.map((rec: string, index: number) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="test-section">
          <h4>🖥️ Browser Information</h4>
          <div className="browser-info">
            <p><strong>Platform:</strong> {results.performance.metrics.browserInfo.platform}</p>
            <p><strong>Language:</strong> {results.performance.metrics.browserInfo.language}</p>
            <p><strong>Online:</strong> {results.performance.metrics.browserInfo.onLine ? 'Yes' : 'No'}</p>
            {results.performance.metrics.memoryInfo && (
              <p><strong>Memory Usage:</strong> {formatBytes(results.performance.metrics.memoryInfo.usedJSHeapSize)}</p>
            )}
            {results.performance.metrics.connectionInfo && (
              <p><strong>Connection:</strong> {results.performance.metrics.connectionInfo.effectiveType}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCacheTab = () => {
    if (!results.serviceWorker?.cache) return <div>No cache data available</div>;

    const { cache } = results.serviceWorker;

    return (
      <div className="cache-details">
        <div className="cache-summary">
          <h4>💾 Cache Summary</h4>
          <p><strong>Total Caches:</strong> {cache.cacheNames.length}</p>
          <p><strong>Total Size:</strong> {formatBytes(cache.totalCacheSize)}</p>
          <p><strong>Status:</strong> {cache.success ? '✅ Healthy' : '❌ Issues detected'}</p>
        </div>

        <div className="cache-list">
          <h4>📂 Cache Names</h4>
          {cache.cacheNames.length > 0 ? (
            <ul>
              {cache.cacheNames.map((name: string, index: number) => (
                <li key={index} className="cache-item">
                  <span className="cache-name">{name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No caches found</p>
          )}
        </div>

        {cache.errors.length > 0 && (
          <div className="cache-errors">
            <h4>❌ Cache Errors</h4>
            <ul>
              {cache.errors.map((error: string, index: number) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const getScoreClass = (score: number): string => {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="pwa-test-suite-overlay">
      <div className="pwa-test-suite">
        <div className="test-header">
          <h2>🔧 PWA Test Suite</h2>
          <button onClick={onClose} className="close-button" aria-label="Close">
            ×
          </button>
        </div>

        <div className="test-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'sw' ? 'active' : ''}`}
            onClick={() => setActiveTab('sw')}
          >
            Service Worker
          </button>
          <button 
            className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <button 
            className={`tab ${activeTab === 'cache' ? 'active' : ''}`}
            onClick={() => setActiveTab('cache')}
          >
            Cache
          </button>
        </div>

        <div className="test-content">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'sw' && renderServiceWorkerTab()}
          {activeTab === 'performance' && renderPerformanceTab()}
          {activeTab === 'cache' && renderCacheTab()}
        </div>

        <div className="test-actions">
          <button onClick={runTests} className="refresh-button" disabled={results.loading}>
            {results.loading ? 'Running...' : '🔄 Refresh Tests'}
          </button>
          <button onClick={onClose} className="close-action-button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWATestSuite;