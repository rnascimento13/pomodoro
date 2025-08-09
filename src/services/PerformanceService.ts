/**
 * Performance monitoring and error tracking service
 * Tracks app performance metrics and errors for optimization
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge';
}

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  componentStack?: string;
  userId?: string;
}

class PerformanceService {
  private static instance: PerformanceService;
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorReport[] = [];
  private readonly MAX_METRICS = 100;
  private readonly MAX_ERRORS = 50;
  private observer?: PerformanceObserver;

  private constructor() {
    this.initializePerformanceObserver();
    this.setupErrorHandlers();
    this.trackWebVitals();
  }

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  /**
   * Initialize Performance Observer for monitoring
   */
  private initializePerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.recordMetric(entry.name, entry.duration, 'timing');
          });
        });

        // Observe navigation, resource, and measure entries
        this.observer.observe({ 
          entryTypes: ['navigation', 'resource', 'measure', 'paint'] 
        });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }

  /**
   * Setup global error handlers
   */
  private setupErrorHandlers(): void {
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href
      });
    });
  }

  /**
   * Track Web Vitals metrics
   */
  private trackWebVitals(): void {
    // Import web-vitals dynamically to avoid blocking
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => this.recordMetric('CLS', metric.value, 'gauge'));
      getFID((metric) => this.recordMetric('FID', metric.value, 'timing'));
      getFCP((metric) => this.recordMetric('FCP', metric.value, 'timing'));
      getLCP((metric) => this.recordMetric('LCP', metric.value, 'timing'));
      getTTFB((metric) => this.recordMetric('TTFB', metric.value, 'timing'));
    }).catch((error) => {
      console.warn('Web Vitals not available:', error);
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, type: PerformanceMetric['type'] = 'gauge'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      type
    };

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log significant performance issues
    if (this.isSignificantMetric(metric)) {
      console.warn(`Performance issue detected: ${name} = ${value}ms`);
    }
  }

  /**
   * Check if a metric indicates a performance issue
   */
  private isSignificantMetric(metric: PerformanceMetric): boolean {
    const thresholds = {
      'LCP': 2500, // Largest Contentful Paint
      'FID': 100,  // First Input Delay
      'CLS': 0.1,  // Cumulative Layout Shift
      'FCP': 1800, // First Contentful Paint
      'TTFB': 800  // Time to First Byte
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    return threshold !== undefined && metric.value > threshold;
  }

  /**
   * Capture an error for tracking
   */
  captureError(errorInfo: {
    message: string;
    stack?: string;
    url?: string;
    line?: number;
    column?: number;
    componentStack?: string;
  }): void {
    const error: ErrorReport = {
      id: this.generateId(),
      message: errorInfo.message,
      stack: errorInfo.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: errorInfo.url || window.location.href,
      componentStack: errorInfo.componentStack
    };

    this.errors.push(error);

    // Keep only the most recent errors
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors = this.errors.slice(-this.MAX_ERRORS);
    }

    // In production, you might want to send this to an error reporting service
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
      this.sendErrorToService(error);
    }
  }

  /**
   * Send error to external service (placeholder)
   */
  private sendErrorToService(error: ErrorReport): void {
    // Example: Send to error reporting service
    // This would typically be Sentry, LogRocket, or similar
    try {
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(error)
      // });
      console.log('Error would be sent to service:', error);
    } catch (sendError) {
      console.warn('Failed to send error to service:', sendError);
    }
  }

  /**
   * Measure execution time of a function
   */
  measureFunction<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      this.recordMetric(`function_${name}`, duration, 'timing');
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`function_${name}_error`, duration, 'timing');
      this.captureError({
        message: `Function ${name} failed: ${error}`,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Measure async function execution time
   */
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.recordMetric(`async_${name}`, duration, 'timing');
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`async_${name}_error`, duration, 'timing');
      this.captureError({
        message: `Async function ${name} failed: ${error}`,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Track user interaction timing
   */
  trackUserInteraction(action: string, startTime: number): void {
    const duration = performance.now() - startTime;
    this.recordMetric(`user_${action}`, duration, 'timing');
  }

  /**
   * Track timer accuracy
   */
  trackTimerAccuracy(expected: number, actual: number): void {
    const accuracy = Math.abs(expected - actual);
    this.recordMetric('timer_accuracy', accuracy, 'gauge');
    
    if (accuracy > 1000) { // More than 1 second off
      console.warn(`Timer accuracy issue: expected ${expected}ms, got ${actual}ms`);
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    metrics: PerformanceMetric[];
    errors: ErrorReport[];
    summary: {
      avgTimerAccuracy: number;
      errorCount: number;
      performanceIssues: number;
    };
  } {
    const timerAccuracyMetrics = this.metrics.filter(m => m.name === 'timer_accuracy');
    const avgTimerAccuracy = timerAccuracyMetrics.length > 0
      ? timerAccuracyMetrics.reduce((sum, m) => sum + m.value, 0) / timerAccuracyMetrics.length
      : 0;

    const performanceIssues = this.metrics.filter(m => this.isSignificantMetric(m)).length;

    return {
      metrics: [...this.metrics],
      errors: [...this.errors],
      summary: {
        avgTimerAccuracy,
        errorCount: this.errors.length,
        performanceIssues
      }
    };
  }

  /**
   * Clear all metrics and errors
   */
  clear(): void {
    this.metrics = [];
    this.errors = [];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
  /**
   * Get performance report for optimization analysis
   */
  getPerformanceReport(): {
    metrics: PerformanceMetric[];
    errors: ErrorReport[];
    browserInfo: {
      userAgent: string;
      language: string;
      platform: string;
      cookieEnabled: boolean;
      onLine: boolean;
    };
    memoryInfo?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
    connectionInfo?: {
      effectiveType: string;
      downlink: number;
      rtt: number;
    };
  } {
    const report = {
      metrics: this.metrics,
      errors: this.errors,
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      },
      memoryInfo: undefined as any,
      connectionInfo: undefined as any
    };

    // Add memory info if available
    if ('memory' in performance) {
      report.memoryInfo = {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      };
    }

    // Add connection info if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      report.connectionInfo = {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0
      };
    }

    return report;
  }

  /**
   * Run performance audit
   */
  async runPerformanceAudit(): Promise<{
    score: number;
    issues: string[];
    recommendations: string[];
    metrics: any;
  }> {
    const report = this.getPerformanceReport();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check key performance metrics
    const lcpMetric = report.metrics.find(m => m.name === 'LCP');
    if (lcpMetric && lcpMetric.value > 2500) {
      issues.push(`Large Contentful Paint is slow: ${lcpMetric.value}ms`);
      recommendations.push('Optimize images and reduce render-blocking resources');
      score -= 20;
    }

    const fidMetric = report.metrics.find(m => m.name === 'FID');
    if (fidMetric && fidMetric.value > 100) {
      issues.push(`First Input Delay is high: ${fidMetric.value}ms`);
      recommendations.push('Reduce JavaScript execution time and optimize event handlers');
      score -= 15;
    }

    const clsMetric = report.metrics.find(m => m.name === 'CLS');
    if (clsMetric && clsMetric.value > 0.1) {
      issues.push(`Cumulative Layout Shift is high: ${clsMetric.value}`);
      recommendations.push('Ensure images have dimensions and avoid dynamic content insertion');
      score -= 15;
    }

    // Check memory usage
    if (report.memoryInfo && report.memoryInfo.usedJSHeapSize > 50 * 1024 * 1024) {
      issues.push(`High memory usage: ${(report.memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      recommendations.push('Check for memory leaks and optimize data structures');
      score -= 10;
    }

    // Check for slow operations
    const slowMetrics = report.metrics.filter(m => 
      m.type === 'timing' && m.value > 1000
    );
    if (slowMetrics.length > 0) {
      issues.push(`Slow operations detected: ${slowMetrics.map(m => m.name).join(', ')}`);
      recommendations.push('Optimize slow operations or move them to web workers');
      score -= 10;
    }

    // Check error rate
    const recentErrors = report.errors.filter(e => 
      Date.now() - e.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );
    if (recentErrors.length > 5) {
      issues.push(`High error rate: ${recentErrors.length} errors in last 5 minutes`);
      recommendations.push('Investigate and fix recurring errors');
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
      metrics: report
    };
  }
}

export default PerformanceService;