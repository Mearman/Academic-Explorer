/**
 * Service Worker registration and management utilities
 * Handles PWA installation, background sync, and offline capabilities
 */

import React from 'react';

/**
 * PWA install prompt event interface
 * Extended from the standard Event to include PWA-specific properties
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Extended ServiceWorkerRegistration with optional sync support
 */
interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync?: {
    register(tag: string): Promise<void>;
  };
  periodicSync?: {
    register(tag: string, options: { minInterval: number }): Promise<void>;
  };
}

/**
 * Service worker registration status
 */
export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isControlling: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

/**
 * PWA installation status
 */
export interface PWAInstallStatus {
  canInstall: boolean;
  isInstalled: boolean;
  platform: 'desktop' | 'mobile' | 'unknown';
  installPrompt: BeforeInstallPromptEvent | null;
}

/**
 * Background sync registration
 */
export interface BackgroundSyncOptions {
  tag: string;
  minInterval?: number; // For periodic sync
}

/**
 * Service worker message types
 */
export type ServiceWorkerMessage = 
  | { type: 'PROCESS_OFFLINE_QUEUE'; timestamp: number }
  | { type: 'NOTIFICATION_CLICK'; action: string; data: unknown }
  | { type: 'CACHE_UPDATED'; urls: string[] }
  | { type: 'SYNC_COMPLETE'; success: boolean; errors?: string[] };

/**
 * Service worker event listeners
 */
type ServiceWorkerEventHandler = (message: ServiceWorkerMessage) => void;

/**
 * Service worker manager class
 */
class ServiceWorkerManager {
  private registration: ExtendedServiceWorkerRegistration | null = null;
  private installPrompt: BeforeInstallPromptEvent | null = null;
  private eventHandlers: Map<string, ServiceWorkerEventHandler[]> = new Map();
  private isListening = false;

  /**
   * Check if service workers are supported
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Register service worker
   */
  async register(scriptUrl = '/sw.js'): Promise<ServiceWorkerStatus> {
    if (!this.isSupported()) {
      return {
        isSupported: false,
        isRegistered: false,
        isInstalling: false,
        isWaiting: false,
        isControlling: false,
        registration: null,
        error: 'Service workers not supported',
      };
    }

    try {
      console.log('[SW Manager] Registering service worker:', scriptUrl);
      
      const registration = await navigator.serviceWorker.register(scriptUrl, {
        scope: '/',
      });

      this.registration = registration;
      this.setupEventListeners();

      console.log('[SW Manager] Service worker registered:', registration);

      // Check for updates
      this.checkForUpdates();

      return this.getStatus();
    } catch (error) {
      console.error('[SW Manager] Service worker registration failed:', error);
      return {
        isSupported: true,
        isRegistered: false,
        isInstalling: false,
        isWaiting: false,
        isControlling: false,
        registration: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get current service worker status
   */
  getStatus(): ServiceWorkerStatus {
    if (!this.isSupported()) {
      return {
        isSupported: false,
        isRegistered: false,
        isInstalling: false,
        isWaiting: false,
        isControlling: false,
        registration: null,
        error: 'Service workers not supported',
      };
    }

    const {registration} = this;
    const isRegistered = !!registration;
    const isInstalling = !!registration?.installing;
    const isWaiting = !!registration?.waiting;
    const isControlling = !!navigator.serviceWorker.controller;

    return {
      isSupported: true,
      isRegistered,
      isInstalling,
      isWaiting,
      isControlling,
      registration,
      error: null,
    };
  }

  /**
   * Setup service worker event listeners
   */
  private setupEventListeners(): void {
    if (this.isListening || !navigator.serviceWorker) {
      return;
    }

    this.isListening = true;

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      const message = event.data as ServiceWorkerMessage;
      this.handleMessage(message);
    });

    // Listen for service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW Manager] Service worker controller changed');
      window.location.reload();
    });

    // Listen for registration updates
    if (this.registration) {
      this.registration.addEventListener('updatefound', () => {
        console.log('[SW Manager] Service worker update found');
        const newWorker = this.registration?.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW Manager] New service worker installed, ready to activate');
              this.notifyUpdate();
            }
          });
        }
      });
    }
  }

  /**
   * Handle service worker messages
   */
  private handleMessage(message: ServiceWorkerMessage): void {
    console.log('[SW Manager] Received message:', message);
    
    const handlers = this.eventHandlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('[SW Manager] Error handling message:', error);
      }
    });
  }

  /**
   * Add event listener for service worker messages
   */
  addEventListener(type: string, handler: ServiceWorkerEventHandler): void {
    const handlers = this.eventHandlers.get(type) || [];
    handlers.push(handler);
    this.eventHandlers.set(type, handlers);
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: string, handler: ServiceWorkerEventHandler): void {
    const handlers = this.eventHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.eventHandlers.set(type, handlers);
    }
  }

  /**
   * Send message to service worker
   */
  async sendMessage(message: unknown): Promise<unknown> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No service worker controller available');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      const {controller} = navigator.serviceWorker;
      if (!controller) {
        reject(new Error('Service worker controller became unavailable'));
        return;
      }
      controller.postMessage(message, [messageChannel.port2]);
    });
  }

  /**
   * Check for service worker updates
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) {
      return;
    }

    try {
      await this.registration.update();
      console.log('[SW Manager] Checked for updates');
    } catch (error) {
      console.error('[SW Manager] Failed to check for updates:', error);
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      return;
    }

    try {
      await this.sendMessage({ type: 'SKIP_WAITING' });
      console.log('[SW Manager] Skipped waiting, activating new service worker');
    } catch (error) {
      console.error('[SW Manager] Failed to skip waiting:', error);
    }
  }

  /**
   * Register background sync
   */
  async registerBackgroundSync(options: BackgroundSyncOptions): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    if (!this.registration.sync) {
      throw new Error('Background sync not supported');
    }

    try {
      await this.registration.sync.register(options.tag);
      console.log('[SW Manager] Background sync registered:', options.tag);
    } catch (error) {
      console.error('[SW Manager] Failed to register background sync:', error);
      throw error;
    }
  }

  /**
   * Register periodic background sync (if supported)
   */
  async registerPeriodicBackgroundSync(options: BackgroundSyncOptions): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    // Check if periodic background sync is supported
    if (!this.registration.periodicSync) {
      console.warn('[SW Manager] Periodic background sync not supported');
      return;
    }

    try {
      await this.registration.periodicSync.register(options.tag, {
        minInterval: options.minInterval || 24 * 60 * 60 * 1000, // 24 hours default
      });
      console.log('[SW Manager] Periodic background sync registered:', options.tag);
    } catch (error) {
      console.error('[SW Manager] Failed to register periodic background sync:', error);
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    try {
      await this.sendMessage({ type: 'CLEAR_CACHE' });
      console.log('[SW Manager] All caches cleared');
    } catch (error) {
      console.error('[SW Manager] Failed to clear caches:', error);
      throw error;
    }
  }

  /**
   * Pre-cache specific URLs
   */
  async precacheUrls(urls: string[]): Promise<void> {
    try {
      await this.sendMessage({ 
        type: 'CACHE_URLS', 
        data: { urls } 
      });
      console.log('[SW Manager] URLs pre-cached:', urls);
    } catch (error) {
      console.error('[SW Manager] Failed to pre-cache URLs:', error);
      throw error;
    }
  }

  /**
   * Get PWA installation status
   */
  getPWAInstallStatus(): PWAInstallStatus {
    const canInstall = !!this.installPrompt;
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as unknown as { standalone?: boolean }).standalone ||
                       document.referrer.includes('android-app://');
    
    const platform = this.detectPlatform();

    return {
      canInstall,
      isInstalled,
      platform,
      installPrompt: this.installPrompt,
    };
  }

  /**
   * Install PWA
   */
  async installPWA(): Promise<boolean> {
    if (!this.installPrompt) {
      console.warn('[SW Manager] No install prompt available');
      return false;
    }

    try {
      const result = await this.installPrompt.prompt();
      const accepted = result.outcome === 'accepted';
      
      if (accepted) {
        console.log('[SW Manager] PWA installation accepted');
        this.installPrompt = null;
      } else {
        console.log('[SW Manager] PWA installation dismissed');
      }

      return accepted;
    } catch (error) {
      console.error('[SW Manager] PWA installation failed:', error);
      return false;
    }
  }

  /**
   * Setup PWA install prompt listener
   */
  setupPWAInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      console.log('[SW Manager] PWA install prompt triggered');
      event.preventDefault();
      this.installPrompt = event as BeforeInstallPromptEvent;
    });

    window.addEventListener('appinstalled', () => {
      console.log('[SW Manager] PWA installed successfully');
      this.installPrompt = null;
    });
  }

  /**
   * Detect platform type
   */
  private detectPlatform(): 'desktop' | 'mobile' | 'unknown' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      return 'mobile';
    }
    
    if (/windows|macintosh|linux/i.test(userAgent)) {
      return 'desktop';
    }
    
    return 'unknown';
  }

  /**
   * Notify about service worker update
   */
  private notifyUpdate(): void {
    // This would typically show a notification to the user
    console.log('[SW Manager] New version available');
    
    // You could dispatch a custom event here for the UI to handle
    window.dispatchEvent(new CustomEvent('sw-update-available', {
      detail: { registration: this.registration }
    }));
  }
}

// Singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

/**
 * Initialize service worker and PWA features
 */
export async function initializeServiceWorker(): Promise<ServiceWorkerStatus> {
  // Setup PWA install prompt
  serviceWorkerManager.setupPWAInstallPrompt();
  
  // Register service worker
  const status = await serviceWorkerManager.register();
  
  if (status.isRegistered) {
    // Register background sync for offline queue
    try {
      await serviceWorkerManager.registerBackgroundSync({
        tag: 'background-sync-queue',
      });
    } catch (error) {
      console.warn('[SW Manager] Background sync registration failed:', error);
    }

    // Register periodic sync if supported
    try {
      await serviceWorkerManager.registerPeriodicBackgroundSync({
        tag: 'periodic-background-sync',
        minInterval: 12 * 60 * 60 * 1000, // 12 hours
      });
    } catch (error) {
      console.warn('[SW Manager] Periodic background sync registration failed:', error);
    }
  }
  
  return status;
}

/**
 * Hook for using service worker in React components
 */
export function useServiceWorker() {
  const [status, setStatus] = React.useState<ServiceWorkerStatus>(
    serviceWorkerManager.getStatus()
  );
  const [pwaStatus, setPWAStatus] = React.useState<PWAInstallStatus>(
    serviceWorkerManager.getPWAInstallStatus()
  );

  React.useEffect(() => {
    // Update status periodically
    const interval = setInterval(() => {
      setStatus(serviceWorkerManager.getStatus());
      setPWAStatus(serviceWorkerManager.getPWAInstallStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    status,
    pwaStatus,
    register: serviceWorkerManager.register.bind(serviceWorkerManager),
    skipWaiting: serviceWorkerManager.skipWaiting.bind(serviceWorkerManager),
    installPWA: serviceWorkerManager.installPWA.bind(serviceWorkerManager),
    clearCaches: serviceWorkerManager.clearCaches.bind(serviceWorkerManager),
    addEventListener: serviceWorkerManager.addEventListener.bind(serviceWorkerManager),
    removeEventListener: serviceWorkerManager.removeEventListener.bind(serviceWorkerManager),
  };
}

