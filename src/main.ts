/**
 * Main entry point for the TypeScript portfolio
 */

import { NavigationManager } from './modules/navigation';
import { SecurityManager } from './modules/security';
import { LoadingManager } from './modules/loading-manager';
import { ImageOptimizer } from './modules/image-optimizer';
import { ModalManager } from './modules/modal-manager';
import { IconReplacer } from './modules/icon-replacer';
import { SidebarAnimations } from './modules/sidebar-animations';
import { SkeletonLoader } from './modules/skeleton-loader';
import type { Portfolio } from './types';

// Declare the global Portfolio namespace on the window object
declare global {
  interface Window {
    Portfolio: Portfolio;
  }
}
/**
 * Main Portfolio Application Class
 */
class PortfolioApp {
  constructor() {
    this.init();
  }

  /**
   * Initialize the portfolio application
   */
  private async init(): Promise<void> {
    try {
      console.log('🚀 Initializing Portfolio Application (TypeScript)...');

  // Helper to safely parse JSON array strings from data attributes
  function safeParseArray(value: string | null): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Initialize all modules
      const securityManager = new SecurityManager();
      const loadingManager = new LoadingManager();
      const imageOptimizer = new ImageOptimizer();
      const modalManager = new ModalManager();
      const navigationManager = new NavigationManager();

      // Dynamically import and initialize non-critical modules
      import('./modules/particle-background').then(({ ParticleBackground }) => {
        new ParticleBackground('particle-background');
      });

      import('./modules/chatbot').then(({ ChatbotManager }) => {
        if (window.Portfolio.lazy) {
          window.Portfolio.lazy.ChatbotManager = new ChatbotManager();
        }
      });

      import('./modules/about-enhancements').then(({ AboutEnhancements }) => {
        new AboutEnhancements();
      });

      import('./modules/awards-accordion').then(({ AwardsAccordion }) => {
        new AwardsAccordion();
      });

      // Initialize Icon Replacer
      new IconReplacer();

      // Initialize Skeleton Loader (runs first for loading states)
      const skeletonLoader = new SkeletonLoader();

      // Initialize Sidebar Animations (after skeleton loader)
      new SidebarAnimations();

      // Dynamically import and initialize vanilla-tilt
      import('vanilla-tilt').then(module => {
        const VanillaTilt = module.default;
        const cards = document.querySelectorAll('.achievement-card');
        VanillaTilt.init(cards as any, {
          max: 15,
          speed: 400,
          glare: true,
          "max-glare": 0.1,
        });

        cards.forEach(card => {
          card.addEventListener('mousemove', (e: Event) => {
            const rect = (card as HTMLElement).getBoundingClientRect();
            const x = (e as MouseEvent).clientX - rect.left;
            const y = (e as MouseEvent).clientY - rect.top;
            (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
            (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
          });
        });
      });

      // Initialize core components
      window.Portfolio = {
        core: {
          version: '2.0.0',
          initialized: true,
        },
        modules: {
          SecurityManager: securityManager,
          LoadingManager: loadingManager,
          ImageOptimizer: imageOptimizer,
          ModalManager: modalManager,
          NavigationManager: navigationManager,
          SkeletonLoader: skeletonLoader,
        },
        lazy: {},
      };

      // Temporary global fallbacks for any legacy inline handlers still present
      // Remove once all inline attributes are gone from HTML
      window.openAchievementModal = (element: HTMLElement) => {
        // Extract data attributes similar to ModalManager.getAchievementData
        const title = element.querySelector('h4, .achievement-title')?.textContent?.trim() || 'Achievement';
        const images = safeParseArray(element.getAttribute('data-images'));
        const webpImages = safeParseArray(element.getAttribute('data-webp-images'));
        const organizer = element.getAttribute('data-organizer') || '';
        const date = element.getAttribute('data-date') || '';
        const location = element.getAttribute('data-location') || '';
        modalManager.openAchievementModal({ title, images, webpImages, organizer, date, location });
      };
      window.openProjectModal = (_element: HTMLElement) => {
        // Implement when project items use inline handlers; prefer data attributes + listeners
        console.warn('openProjectModal global fallback invoked but not implemented');
      };

      console.log('✅ Portfolio Application initialized successfully!');
      console.log('📦 Available modules:', Object.keys(window.Portfolio.modules ?? {}));
      console.log('📦 Lazy modules:', Object.keys(window.Portfolio.lazy ?? {}));

    } catch (error) {
      console.error('❌ Failed to initialize Portfolio Application:', error);
    }
  }
}

// Initialize the application
new PortfolioApp();


// Hot Module Replacement for development
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('🔄 HMR: Module updated');
  });
}
