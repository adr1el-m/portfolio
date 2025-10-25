/**
 * Main entry point for the TypeScript portfolio
 */

// Load Vercel Analytics & Speed Insights only in production
if (import.meta.env.PROD) {
  import('@vercel/analytics').then(({ inject }) => {
    try { inject(); } catch (err) { console.warn('Vercel Analytics injection failed:', err); }
  });
  import('@vercel/speed-insights').then(({ injectSpeedInsights }) => {
    try { injectSpeedInsights(); } catch (err) { console.warn('Vercel Speed Insights injection failed:', err); }
  });
}
import { NavigationManager } from './modules/navigation';
import { SecurityManager } from './modules/security';
import { LoadingManager } from './modules/loading-manager';
import { ImageOptimizer } from './modules/image-optimizer';
import { ModalManager } from './modules/modal-manager';
import { IconReplacer } from './modules/icon-replacer';
import { SidebarAnimations } from './modules/sidebar-animations';
import { SkeletonLoader } from './modules/skeleton-loader';
import { PerformanceMonitor } from './modules/performance-monitor';
import { PerformanceDashboard } from './modules/performance-dashboard';
import { AccessibilityEnhancer } from './modules/accessibility-enhancer';
import { logger } from './config';
import type { Portfolio } from './types';
import { TextPlaceholders } from './modules/text-placeholders';

// Vercel Analytics & Speed Insights are loaded conditionally in production (see top of file);

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

      // Initialize all modules
      const securityManager = new SecurityManager();
      // Apply text placeholders early to avoid image errors
      new TextPlaceholders().init();
      const loadingManager = new LoadingManager();
      const imageOptimizer = new ImageOptimizer();
      const modalManager = new ModalManager();
      const navigationManager = new NavigationManager();

      // Dynamically import and initialize non-critical modules
      import('./modules/particle-background').then(({ ParticleBackground }) => {
        new ParticleBackground('particle-background');
      });

      import('./modules/chatbot').then(({ ChatbotManager }) => {
        if (window.Portfolio?.lazy) {
          window.Portfolio.lazy.ChatbotManager = new ChatbotManager();
        }
      });


      import('./modules/about-enhancements').then(({ AboutEnhancements }) => {
        new AboutEnhancements();
      });

      import('./modules/awards-accordion').then(({ AwardsAccordion }) => {
        new AwardsAccordion();
      });

      // Initialize Tooltip Portal to prevent sidebar tooltip clipping
      import('./modules/tooltip-portal').then(({ TooltipPortal }) => {
        new TooltipPortal();
      });

      // Initialize video thumbnails manager (defer playback, posters, pause off-screen)
      import('./modules/video-thumbnails').then(({ VideoThumbnails }) => {
        const vt = new VideoThumbnails();
        if (window.Portfolio?.lazy) {
          window.Portfolio.lazy.VideoThumbnails = vt;
        }
      });

      // Sort project cards by thumbnail type (video > image > none)
      import('./modules/projects-sort').then(({ ProjectsSorter }) => {
        new ProjectsSorter().sort();
      });

      // Initialize Icon Replacer
      new IconReplacer();

      // Initialize Skeleton Loader (runs first for loading states)
      const skeletonLoader = new SkeletonLoader();

      // Initialize Sidebar Animations (after skeleton loader)
      new SidebarAnimations();

      // Register PWA service worker
      import('./modules/pwa-manager').then(({ PwaManager }) => {
        PwaManager.register();
      });

      // Enhance landmarks after DOM is ready
      accessibilityEnhancer.enhanceLandmarks();

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
