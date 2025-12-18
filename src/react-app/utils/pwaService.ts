// src/react-app/utils/pwaService.ts

interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class PWAService {
  private static instance: PWAService;
  private deferredPrompt: PWAInstallPrompt | null = null;
  private isInstallPromptShown = false;
  private installListeners: Set<(canInstall: boolean) => void> = new Set();
  private updateListeners: Set<(hasUpdate: boolean) => void> = new Set();

  static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  private constructor() {
    this.initializePWA();
  }

  private initializePWA() {
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.notifyInstallListeners(true);
    });

    // Listen for app install
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.notifyInstallListeners(false);
      this.logEvent('app_installed');
    });

    // Check if already installed
    if (this.isAppInstalled()) {
      this.logEvent('app_already_installed');
    }

    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.notifyUpdateListeners(true);
      });
    }
  }

  // Environment detection
  isProduction(): boolean {
    return import.meta.env.PROD;
  }

  isDevelopment(): boolean {
    return import.meta.env.DEV;
  }

  getEnvironment(): 'production' | 'development' {
    return this.isProduction() ? 'production' : 'development';
  }

  // Installation detection
  isAppInstalled(): boolean {
    // Check if running in standalone mode (installed PWA)
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true ||
           document.referrer.includes('android-app://');
  }

  canShowInstallPrompt(): boolean {
    return !this.isAppInstalled() && 
           this.deferredPrompt !== null && 
           !this.isInstallPromptShown;
  }

  // Device detection
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
  }

  // Installation methods
  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      this.isInstallPromptShown = true;
      this.logEvent('install_prompt_shown', { outcome });
      
      if (outcome === 'accepted') {
        this.logEvent('install_accepted');
        return true;
      } else {
        this.logEvent('install_dismissed');
        return false;
      }
    } catch (error) {
      console.error('Install prompt error:', error);
      this.logEvent('install_error', { error: error.message });
      return false;
    } finally {
      this.deferredPrompt = null;
      this.notifyInstallListeners(false);
    }
  }

  getIOSInstallInstructions(): string[] {
    return [
      'Tap the Share button',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" to install the app'
    ];
  }

  // Listeners management
  onInstallAvailabilityChange(callback: (canInstall: boolean) => void): () => void {
    this.installListeners.add(callback);
    // Immediately notify with current state
    callback(this.canShowInstallPrompt());
    
    return () => {
      this.installListeners.delete(callback);
    };
  }

  onUpdateAvailable(callback: (hasUpdate: boolean) => void): () => void {
    this.updateListeners.add(callback);
    return () => {
      this.updateListeners.delete(callback);
    };
  }

  private notifyInstallListeners(canInstall: boolean) {
    this.installListeners.forEach(listener => listener(canInstall));
  }

  private notifyUpdateListeners(hasUpdate: boolean) {
    this.updateListeners.forEach(listener => listener(hasUpdate));
  }

  // App info
  getAppInfo() {
    return {
      name: 'Maria Havens POS System',
      shortName: 'Maria Havens POS',
      description: 'Professional Point of Sale system for Maria Havens restaurant and hotel.',
      version: '1.0.0',
      environment: this.getEnvironment(),
      isInstalled: this.isAppInstalled(),
      canInstall: this.canShowInstallPrompt(),
      isMobile: this.isMobile(),
      isIOS: this.isIOS(),
      isAndroid: this.isAndroid()
    };
  }

  // Analytics/Logging
  private logEvent(event: string, data?: any) {
    const logData = {
      event,
      timestamp: new Date().toISOString(),
      environment: this.getEnvironment(),
      userAgent: navigator.userAgent,
      ...data
    };

    if (this.isDevelopment()) {
      console.log('[PWA Service]', logData);
    }

    // In production, you might want to send this to analytics
    if (this.isProduction()) {
      // Example: Send to your analytics service
      // analyticsService.track(event, logData);
    }
  }

  // Service Worker management
  async updateServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        this.logEvent('sw_update_requested');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Service worker update error:', error);
      this.logEvent('sw_update_error', { error: error.message });
      return false;
    }
  }

  // Connectivity detection
  isOnline(): boolean {
    return navigator.onLine;
  }

  onConnectivityChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Immediately notify with current state
    callback(this.isOnline());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}

// Export singleton instance
export const pwaService = PWAService.getInstance();