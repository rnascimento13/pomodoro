/**
 * Service Worker Testing and Validation Utilities
 * This module provides utilities to test service worker functionality
 */

export interface ServiceWorkerTestResult {
  isRegistered: boolean;
  isActive: boolean;
  isControlling: boolean;
  cacheNames: string[];
  updateAvailable: boolean;
  errors: string[];
}

/**
 * Test service worker registration and functionality
 */
export async function testServiceWorker(): Promise<ServiceWorkerTestResult> {
  const result: ServiceWorkerTestResult = {
    isRegistered: false,
    isActive: false,
    isControlling: false,
    cacheNames: [],
    updateAvailable: false,
    errors: []
  };

  try {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      result.errors.push('Service Workers not supported in this browser');
      return result;
    }

    // Check registration
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      result.isRegistered = true;
      
      // Check if service worker is active
      if (registration.active) {
        result.isActive = true;
      }
      
      // Check if service worker is controlling the page
      if (navigator.serviceWorker.controller) {
        result.isControlling = true;
      }
      
      // Check for updates
      if (registration.waiting) {
        result.updateAvailable = true;
      }
    } else {
      result.errors.push('Service Worker not registered');
    }

    // Check cache storage
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        result.cacheNames = cacheNames;
      } catch (error) {
        result.errors.push(`Cache access error: ${error}`);
      }
    } else {
      result.errors.push('Cache API not supported');
    }

  } catch (error) {
    result.errors.push(`Service Worker test error: ${error}`);
  }

  return result;
}

/**
 * Test cache functionality
 */
export async function testCacheStorage(): Promise<{
  success: boolean;
  cacheNames: string[];
  totalCacheSize: number;
  errors: string[];
}> {
  const result = {
    success: false,
    cacheNames: [] as string[],
    totalCacheSize: 0,
    errors: [] as string[]
  };

  try {
    if (!('caches' in window)) {
      result.errors.push('Cache API not supported');
      return result;
    }

    // Get all cache names
    const cacheNames = await caches.keys();
    result.cacheNames = cacheNames;

    // Calculate total cache size
    let totalSize = 0;
    for (const cacheName of cacheNames) {
      try {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          try {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
            }
          } catch (error) {
            console.warn(`Error reading cache entry for ${request.url}:`, error);
          }
        }
      } catch (error) {
        result.errors.push(`Error accessing cache ${cacheName}: ${error}`);
      }
    }

    result.totalCacheSize = totalSize;
    result.success = result.errors.length === 0;

  } catch (error) {
    result.errors.push(`Cache test error: ${error}`);
  }

  return result;
}

/**
 * Test service worker update mechanism
 */
export async function testServiceWorkerUpdate(): Promise<{
  success: boolean;
  hasUpdate: boolean;
  canUpdate: boolean;
  errors: string[];
}> {
  const result = {
    success: false,
    hasUpdate: false,
    canUpdate: false,
    errors: [] as string[]
  };

  try {
    if (!('serviceWorker' in navigator)) {
      result.errors.push('Service Workers not supported');
      return result;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      result.errors.push('No service worker registration found');
      return result;
    }

    // Check for waiting service worker (update available)
    if (registration.waiting) {
      result.hasUpdate = true;
      result.canUpdate = true;
    }

    // Check for installing service worker
    if (registration.installing) {
      result.hasUpdate = true;
    }

    // Test update check
    try {
      await registration.update();
      result.success = true;
    } catch (error) {
      result.errors.push(`Update check failed: ${error}`);
    }

  } catch (error) {
    result.errors.push(`Service worker update test error: ${error}`);
  }

  return result;
}

/**
 * Test offline functionality
 */
export async function testOfflineFunctionality(): Promise<{
  success: boolean;
  canWorkOffline: boolean;
  cachedResources: number;
  errors: string[];
}> {
  const result = {
    success: false,
    canWorkOffline: false,
    cachedResources: 0,
    errors: [] as string[]
  };

  try {
    // Check if critical resources are cached
    const criticalResources = [
      '/',
      '/static/js/',
      '/static/css/',
      '/manifest.json'
    ];

    let cachedCount = 0;
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        
        // Check if this is a critical resource
        if (criticalResources.some(resource => pathname.includes(resource))) {
          cachedCount++;
        }
      }
    }

    result.cachedResources = cachedCount;
    result.canWorkOffline = cachedCount > 0;
    result.success = true;

  } catch (error) {
    result.errors.push(`Offline functionality test error: ${error}`);
  }

  return result;
}

/**
 * Run comprehensive service worker tests
 */
export async function runServiceWorkerTests(): Promise<{
  registration: ServiceWorkerTestResult;
  cache: Awaited<ReturnType<typeof testCacheStorage>>;
  update: Awaited<ReturnType<typeof testServiceWorkerUpdate>>;
  offline: Awaited<ReturnType<typeof testOfflineFunctionality>>;
  overall: {
    success: boolean;
    score: number;
    recommendations: string[];
  };
}> {
  console.log('🧪 Running Service Worker tests...');

  const registration = await testServiceWorker();
  const cache = await testCacheStorage();
  const update = await testServiceWorkerUpdate();
  const offline = await testOfflineFunctionality();

  // Calculate overall score
  let score = 0;
  const recommendations: string[] = [];

  // Registration tests (25 points)
  if (registration.isRegistered) score += 10;
  if (registration.isActive) score += 10;
  if (registration.isControlling) score += 5;

  // Cache tests (25 points)
  if (cache.success) score += 10;
  if (cache.cacheNames.length > 0) score += 10;
  if (cache.totalCacheSize > 0) score += 5;

  // Update tests (25 points)
  if (update.success) score += 15;
  if (update.canUpdate) score += 10;

  // Offline tests (25 points)
  if (offline.success) score += 10;
  if (offline.canWorkOffline) score += 15;

  // Generate recommendations
  if (!registration.isRegistered) {
    recommendations.push('Service Worker is not registered. Check registration code.');
  }
  if (!registration.isActive) {
    recommendations.push('Service Worker is not active. Check for installation errors.');
  }
  if (cache.cacheNames.length === 0) {
    recommendations.push('No caches found. Verify caching strategy implementation.');
  }
  if (!offline.canWorkOffline) {
    recommendations.push('App may not work offline. Ensure critical resources are cached.');
  }
  if (cache.totalCacheSize > 50 * 1024 * 1024) { // 50MB
    recommendations.push('Cache size is large. Consider implementing cache cleanup.');
  }

  const overall = {
    success: score >= 70, // 70% threshold
    score,
    recommendations
  };

  return {
    registration,
    cache,
    update,
    offline,
    overall
  };
}