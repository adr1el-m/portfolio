/**
 * PWA Manager
 * Handles service worker registration and PWA-related functionality
 */

import { logger } from '../config';
import type { BeforeInstallPromptEvent } from '../types';

export class PWAManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  constructor() {
    this.init();
  }

  /**
   * Initialize PWA functionality
   */
  private async init(): Promise<void> {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        logger.warn('Service Workers are not supported in this browser');
        return;
      }

      // Register service worker
      await this.registerServiceWorker();

      // Setup install prompt handler
      this.setupInstallPrompt();

      // Setup update checker
      this.setupUpdateChecker();

      // Setup online/offline handlers
      this.setupConnectionHandlers();

      logger.log('✅ PWA Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize PWA Manager:', error);
    }
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      // Wait for page to be fully loaded
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          window.addEventListener('load', resolve);
        });
      }

      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      logger.log('✅ Service Worker registered:', this.swRegistration.scope);

      // Check for updates
      this.swRegistration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });

      // Check for updates on visibility change
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.swRegistration) {
          this.swRegistration.update();
        }
      });
    } catch (error) {
      logger.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Handle service worker update
   */
  private handleUpdateFound(): void {
    if (!this.swRegistration) return;

    const newWorker = this.swRegistration.installing;
    if (!newWorker) return;

    logger.log('🔄 Service Worker update found');

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New service worker is ready
        this.showUpdateNotification();
      }
    });
  }

  /**
   * Show update notification to user
   */
  private showUpdateNotification(): void {
    logger.log('✨ New version available');

    // Create a simple notification
    const notification = document.createElement('div');
    notification.id = 'pwa-update-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, hsl(45, 100%, 72%), hsl(35, 100%, 68%));
        color: hsl(240, 2%, 13%);
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
      ">
        <p style="margin: 0 0 12px 0; font-weight: 600;">New Version Available! 🎉</p>
        <button onclick="window.location.reload()" style="
          background: hsl(240, 2%, 13%);
          color: hsl(45, 100%, 72%);
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          width: 100%;
        ">Update Now</button>
      </div>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Auto-remove after 30 seconds
    setTimeout(() => {
      notification.remove();
    }, 30000);
  }

  /**
   * Setup install prompt handler
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      
      logger.log('💾 PWA install prompt available');
      
      // Show custom install button/banner
      this.showInstallPrompt();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      logger.log('✅ PWA installed successfully');
      this.deferredPrompt = null;
      this.hideInstallPrompt();
    });
  }

  /**
   * Show custom install prompt
   */
  private showInstallPrompt(): void {
    // Check if already dismissed
    if (localStorage.getItem('pwa-install-dismissed')) {
      return;
    }

    const installBanner = document.createElement('div');
    installBanner.id = 'pwa-install-banner';
    installBanner.innerHTML = `
      <div style="
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, hsl(240, 1%, 17%), hsl(240, 2%, 13%));
        border: 1px solid hsl(45, 100%, 72%);
        color: hsl(0, 0%, 84%);
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        max-width: 90%;
        width: 320px;
        animation: slideUp 0.3s ease-out;
      ">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <p style="margin: 0; font-weight: 600; color: hsl(45, 100%, 72%);">Install Portfolio App 📱</p>
          <button id="pwa-install-close" style="
            background: none;
            border: none;
            color: hsl(0, 0%, 70%);
            cursor: pointer;
            font-size: 20px;
            padding: 0;
            line-height: 1;
          ">×</button>
        </div>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: hsl(0, 0%, 70%);">
          Install for quick access and offline support
        </p>
        <button id="pwa-install-button" style="
          background: linear-gradient(135deg, hsl(45, 100%, 72%), hsl(35, 100%, 68%));
          color: hsl(240, 2%, 13%);
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          width: 100%;
        ">Install</button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          transform: translateX(-50%) translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(installBanner);

    // Handle install button click
    document.getElementById('pwa-install-button')?.addEventListener('click', () => {
      this.installPWA();
    });

    // Handle close button
    document.getElementById('pwa-install-close')?.addEventListener('click', () => {
      this.hideInstallPrompt();
      localStorage.setItem('pwa-install-dismissed', 'true');
    });
  }

  /**
   * Hide install prompt
   */
  private hideInstallPrompt(): void {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.remove();
    }
  }

  /**
   * Trigger PWA installation
   */
  public async installPWA(): Promise<void> {
    if (!this.deferredPrompt) {
      logger.warn('Install prompt not available');
      return;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();

      // Wait for the user to respond
      const { outcome } = await this.deferredPrompt.userChoice;
      
      logger.log('Install prompt outcome:', outcome);

      if (outcome === 'accepted') {
        logger.log('✅ User accepted the install prompt');
      } else {
        logger.log('❌ User dismissed the install prompt');
      }

      // Clear the deferredPrompt
      this.deferredPrompt = null;
      this.hideInstallPrompt();
    } catch (error) {
      logger.error('Error during PWA installation:', error);
    }
  }

  /**
   * Setup update checker
   */
  private setupUpdateChecker(): void {
    // Check for updates every hour
    setInterval(() => {
      if (this.swRegistration) {
        this.swRegistration.update();
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Setup connection status handlers
   */
  private setupConnectionHandlers(): void {
    window.addEventListener('online', () => {
      logger.log('🟢 Connection restored');
      this.showConnectionStatus('online');
    });

    window.addEventListener('offline', () => {
      logger.log('🔴 Connection lost');
      this.showConnectionStatus('offline');
    });
  }

  /**
   * Show connection status notification
   */
  private showConnectionStatus(status: 'online' | 'offline'): void {
    const notification = document.createElement('div');
    notification.className = 'connection-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${status === 'online' ? 'hsl(142, 76%, 36%)' : 'hsl(0, 43%, 51%)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: slideInRight 0.3s ease-out;
      ">
        ${status === 'online' ? '🟢 Back online' : '🔴 You are offline'}
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Unregister service worker (for debugging)
   */
  public async unregister(): Promise<void> {
    if (this.swRegistration) {
      await this.swRegistration.unregister();
      logger.log('Service Worker unregistered');
    }
  }

  /**
   * Get service worker registration
   */
  public getRegistration(): ServiceWorkerRegistration | null {
    return this.swRegistration;
  }

  /**
   * Check if PWA is installed
   */
  public isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }
}
