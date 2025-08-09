import { useState, useEffect, useCallback } from 'react';
import { updateServiceWorker, isUpdateAvailable } from '../serviceWorkerRegistration';

interface ServiceWorkerUpdateState {
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  updateError: string | null;
  registration: ServiceWorkerRegistration | null;
}

/**
 * Hook for managing service worker updates
 */
export const useServiceWorkerUpdate = () => {
  const [state, setState] = useState<ServiceWorkerUpdateState>({
    isUpdateAvailable: false,
    isUpdating: false,
    updateError: null,
    registration: null
  });

  // Handle service worker messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type) {
        switch (event.data.type) {
          case 'GET_SYNC_QUEUE':
            // Send sync queue to service worker
            const syncQueue = JSON.parse(
              localStorage.getItem('pomodoro_sync_queue') || '[]'
            );
            if (event.source) {
              (event.source as ServiceWorker).postMessage({
                type: 'SYNC_QUEUE_RESPONSE',
                data: syncQueue
              });
            }
            break;
          
          case 'CLEAR_SYNC_QUEUE':
            // Clear sync queue
            localStorage.removeItem('pomodoro_sync_queue');
            break;
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Check for service worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setState(prev => ({ ...prev, registration }));

        // Check if update is available
        if (isUpdateAvailable(registration)) {
          setState(prev => ({ ...prev, isUpdateAvailable: true }));
        }

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState(prev => ({ ...prev, isUpdateAvailable: true }));
              }
            });
          }
        });
      });

      // Listen for controller changes (when update is applied)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setState(prev => ({ 
          ...prev, 
          isUpdateAvailable: false, 
          isUpdating: false 
        }));
        // Reload the page to get the new version
        window.location.reload();
      });
    }
  }, []);

  // Apply service worker update
  const applyUpdate = useCallback(async () => {
    if (!state.registration || !state.isUpdateAvailable) return;

    setState(prev => ({ ...prev, isUpdating: true, updateError: null }));

    try {
      updateServiceWorker(state.registration);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isUpdating: false,
        updateError: error instanceof Error ? error.message : 'Update failed'
      }));
    }
  }, [state.registration, state.isUpdateAvailable]);

  // Dismiss update
  const dismissUpdate = useCallback(() => {
    setState(prev => ({ ...prev, isUpdateAvailable: false }));
  }, []);

  // Clear update error
  const clearUpdateError = useCallback(() => {
    setState(prev => ({ ...prev, updateError: null }));
  }, []);

  return {
    isUpdateAvailable: state.isUpdateAvailable,
    isUpdating: state.isUpdating,
    updateError: state.updateError,
    applyUpdate,
    dismissUpdate,
    clearUpdateError
  };
};