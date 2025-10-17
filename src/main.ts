/**
 * Main entry point for the TypeScript portfolio
 */

// Import modular CSS (Vite will bundle this)
import './styles/main.css';

import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

// CRITICAL: Eager-loaded modules (required for initial render and core functionality)
import { SecurityManager } from './modules/security';
import { LoadingManager } from './modules/loading-manager';
import { PerformanceMonitor } from './modules/performance-monitor';
import { PerformanceDashboard } from './modules/performance-dashboard';
import { AccessibilityEnhancer } from './modules/accessibility-enhancer';
import { PWAManager } from './modules/pwa-manager';

// IMPORTANT: Early-loaded modules (needed for UX but not render-blocking)
import { NavigationManager } from './modules/navigation';
import { ModalManager } from './modules/modal-manager';
import { ImageOptimizer } from './modules/image-optimizer';

// NON-CRITICAL: These are dynamically imported below
// - ParticleBackground: Visual effect only
// - ChatbotManager: User-initiated feature
// - AboutEnhancements: Below-the-fold content
// - AwardsAccordion: Interactive enhancement
// - IconReplacer: Progressive enhancement
// - SidebarAnimations: Visual enhancement
// - SkeletonLoader: Loading state helper
// - VanillaTilt: Third-party visual effect

import { logger } from './config';
import type { Portfolio } from './types';

// Initialize Vercel Analytics & Speed Insights
inject();
injectSpeedInsights();

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
      logger.log('🚀 Initializing Portfolio Application (TypeScript)...');

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Initialize Performance Monitor first
      const performanceMonitor = PerformanceMonitor.getInstance();
      logger.log('📊 Performance monitoring active');

      // Initialize Accessibility Enhancer
      const accessibilityEnhancer = AccessibilityEnhancer.getInstance();
      logger.log('♿ Accessibility enhancements active');

      // Initialize PWA functionality
      new PWAManager();
      logger.log('📱 PWA functionality active');

      // === PHASE 1: CRITICAL MODULES (Eager Load) ===
      // Security, performance monitoring, and accessibility
      const securityManager = new SecurityManager();
      const loadingManager = new LoadingManager();
      logger.log('✓ Critical modules loaded');

      // === PHASE 2: IMPORTANT MODULES (Early Load) ===
      // Core UX functionality needed soon after initial render
      const imageOptimizer = new ImageOptimizer();
      const modalManager = new ModalManager();
      const navigationManager = new NavigationManager();
      logger.log('✓ Important modules loaded');

      // === PHASE 3: NON-CRITICAL MODULES (Lazy Load) ===
      // Visual enhancements and interactive features loaded asynchronously
      
      // Skeleton Loader - Loading state helper
      import('./modules/skeleton-loader').then(({ SkeletonLoader }) => {
        const skeletonLoader = new SkeletonLoader();
        window.Portfolio.modules.SkeletonLoader = skeletonLoader;
        logger.log('✓ Skeleton loader ready');
      });

      // Particle Background - Decorative canvas animation
      import('./modules/particle-background').then(({ ParticleBackground }) => {
        new ParticleBackground('particle-background');
        logger.log('✓ Particle background ready');
      });

      // Sidebar Animations - Visual enhancements
      import('./modules/sidebar-animations').then(({ SidebarAnimations }) => {
        new SidebarAnimations();
        logger.log('✓ Sidebar animations ready');
      });

      // Icon Replacer - Progressive enhancement for icons
      import('./modules/icon-replacer').then(({ IconReplacer }) => {
        new IconReplacer();
        logger.log('✓ Icon replacer ready');
      });

      // Chatbot - User-initiated feature
      import('./modules/chatbot').then(({ ChatbotManager }) => {
        if (window.Portfolio.lazy) {
          window.Portfolio.lazy.ChatbotManager = new ChatbotManager();
          logger.log('✓ Chatbot ready');
        }
      });

      // About Enhancements - Below-the-fold content
      import('./modules/about-enhancements').then(({ AboutEnhancements }) => {
        new AboutEnhancements();
        logger.log('✓ About enhancements ready');
      });

      // Awards Accordion - Interactive enhancement
      import('./modules/awards-accordion').then(({ AwardsAccordion }) => {
        new AwardsAccordion();
        logger.log('✓ Awards accordion ready');
      });

      // Enhance landmarks after DOM is ready
      accessibilityEnhancer.enhanceLandmarks();

      // Vanilla Tilt - Third-party library for card effects (lowest priority)
      // Use requestIdleCallback to load when browser is idle
      const loadVanillaTilt = () => {
        import('vanilla-tilt').then(module => {
          const VanillaTilt = module.default;
          const cards = document.querySelectorAll('.achievement-card');
          
          if (cards.length > 0) {
            VanillaTilt.init(Array.from(cards) as HTMLElement[], {
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
            
            logger.log('✓ Vanilla Tilt effects ready');
          }
        }).catch(error => {
          logger.warn('Failed to load Vanilla Tilt:', error);
        });
      };

      // Load when browser is idle, or after 3 seconds as fallback
      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadVanillaTilt, { timeout: 3000 });
      } else {
        setTimeout(loadVanillaTilt, 3000);
      }

      // Initialize core Portfolio namespace
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
          // Note: SkeletonLoader and other lazy modules added dynamically
        },
        lazy: {},
      };

      logger.log('✅ Portfolio Application initialized successfully!');
      logger.log('📦 Available modules:', Object.keys(window.Portfolio.modules ?? {}));
      logger.log('📦 Lazy modules:', Object.keys(window.Portfolio.lazy ?? {}));

      // Display performance report after page load
      window.addEventListener('load', () => {
        setTimeout(() => {
          performanceMonitor.displayPerformanceBadge();
          if (import.meta.env.DEV) {
            performanceMonitor.generateReport();
            // Initialize performance dashboard in dev mode
            PerformanceDashboard.getInstance({
              position: 'bottom-right',
              minimized: true,
              showInProduction: false
            });
          }
        }, 1000);
      });

    } catch (error) {
      logger.error('❌ Failed to initialize Portfolio Application:', error);
    }
  }
}

// Initialize the application
new PortfolioApp();


// Hot Module Replacement for development
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    logger.log('🔄 HMR: Module updated');
  });
}
