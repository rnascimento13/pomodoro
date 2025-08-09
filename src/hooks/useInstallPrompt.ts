import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptState {
  isInstallable: boolean;
  isInstalled: boolean;
  showPrompt: boolean;
  installApp: () => Promise<boolean>;
  dismissPrompt: () => void;
}

export const useInstallPrompt = (): InstallPromptState => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if user previously dismissed the prompt
  const checkDismissalStatus = () => {
    const dismissedPrompt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedPrompt) {
      const dismissedDate = new Date(dismissedPrompt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Don't show prompt again for 7 days
      return daysSinceDismissed < 7;
    }
    return false;
  };

  useEffect(() => {
    // Check if app is already installed
    const checkInstallStatus = () => {
      // Check if running in standalone mode (installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check if running as PWA on iOS
      const isIOSPWA = (window.navigator as any).standalone === true;
      
      setIsInstalled(isStandalone || isIOSPWA);
    };

    checkInstallStatus();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      
      // Save the event so it can be triggered later
      setDeferredPrompt(event);
      setIsInstallable(true);
      
      // Show install prompt after a delay (better UX) if not recently dismissed
      setTimeout(() => {
        const wasRecentlyDismissed = checkDismissalStatus();
        if (!isInstalled && !wasRecentlyDismissed) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowPrompt(false);
      setDeferredPrompt(null);
      
      // Store installation status
      localStorage.setItem('pwa-installed', 'true');
    };



    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
        localStorage.setItem('pwa-installed', 'true');
        return true;
      } else {
        // User dismissed the prompt
        dismissPrompt();
        return false;
      }
    } catch (error) {
      console.error('Error during app installation:', error);
      return false;
    } finally {
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    // Remember that user dismissed the prompt
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  return {
    isInstallable,
    isInstalled,
    showPrompt,
    installApp,
    dismissPrompt
  };
};