/**
 * Main entry point for the TypeScript portfolio
 */

// Load Vercel Analytics & Speed Insights only in production on non-localhost
if (import.meta.env.PROD && typeof window !== 'undefined' && !/^(localhost|127\.0\.0\.1)/.test(window.location.hostname)) {
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
import { ScrollProgress } from './modules/scroll-progress';
import { logger } from './config';
import type { Portfolio } from './types';
import { TextPlaceholders } from './modules/text-placeholders';
import { Search } from './modules/search';

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

      // Detect audit mode from query string to stabilize automated a11y tests
      const qs = new URLSearchParams(window.location.search);
      const auditFlag = (qs.get('audit') || '').toLowerCase();
      const auditMode = auditFlag === '1' || auditFlag === 'true' || auditFlag === 'yes';
      // Respect user system preference for reduced motion
      const prefersReducedMotion = typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      // Harden external links (adds rel noopener/noreferrer and disables javascript: URLs)
      securityManager.ensureSafeExternalLinks();
      // Apply text placeholders early to avoid image errors
      new TextPlaceholders().init();
      const imageOptimizer = new ImageOptimizer();
      const loadingManager = new LoadingManager();
      const modalManager = new ModalManager();
      const navigationManager = new NavigationManager();
      // Initialize scroll progress bar
      new ScrollProgress();
      // Initialize client-side search (activates when URL has ?q=)
      const search = new Search();

      // Helper to defer non-critical work to after first paint
      const defer = (cb: () => void, delay = 0) => {
        requestAnimationFrame(() => { setTimeout(cb, delay); });
      };

      // Defer non-essential modules until after first paint/idle
      defer(() => {
        // Initialize Wow Factors
        import('./modules/scroll-animations').then(({ ScrollAnimations }) => new ScrollAnimations());
        import('./modules/custom-cursor').then(({ CustomCursor }) => new CustomCursor());

        import('./modules/about-enhancements').then(({ AboutEnhancements }) => {
          new AboutEnhancements();
        });
      }, 0);

      defer(() => {
        import('./modules/awards-accordion').then(({ AwardsAccordion }) => {
          new AwardsAccordion();
        });
      }, 50);

      defer(() => {
        import('./modules/tooltip-portal').then(({ TooltipPortal }) => {
          new TooltipPortal();
        });
      }, 100);

      // Initialize interactive Tech Stack section a bit later
      defer(() => {
        import('./modules/tech-stack').then(({ TechStack }) => {
          new TechStack();
        });
      }, 150);

      // Initialize AI summaries for project hover tooltips
      defer(() => {
        import('./modules/ai-summaries').then(({ AISummaries }) => {
          new AISummaries();
        });
      }, 200);

      // Initialize real-time visitor counter
      defer(() => {
        import('./modules/visitor-counter').then(({ VisitorCounter }) => {
          new VisitorCounter();
        });
      }, 300);

      // Initialize video thumbnails manager earlier for faster poster setup
      defer(() => {
        import('./modules/video-thumbnails').then(({ VideoThumbnails }) => {
          const vt = new VideoThumbnails();
          if (window.Portfolio?.lazy) {
            window.Portfolio.lazy.VideoThumbnails = vt;
          }
        });
      }, 0);

      // Sort project cards by thumbnail type (video > image > none)
      defer(() => {
        import('./modules/projects-sort').then(({ ProjectsSorter }) => {
          new ProjectsSorter().sort();
        });
      }, 250);

      // Initialize Icon Replacer
      new IconReplacer();

      // Initialize Skeleton Loader (runs first for loading states)
      const skeletonLoader = new SkeletonLoader();

      // Initialize Sidebar Animations (after skeleton loader)
      new SidebarAnimations();

      // Register PWA service worker (skip in audit mode to avoid SW interference) — defer
      defer(() => {
        if (!auditMode) {
          import('./modules/pwa-manager').then(({ PwaManager }) => {
            PwaManager.register();
          });
        }
      }, 400);

      // Enhance landmarks after DOM is ready
      accessibilityEnhancer.enhanceLandmarks();

      // Dynamically import and initialize vanilla-tilt (skip in audit mode) — defer
      defer(() => {
        if (!auditMode && !prefersReducedMotion) {
          import('vanilla-tilt').then(module => {
            const VanillaTilt = module.default as unknown as { init: (elements: NodeListOf<Element> | Element[], options?: Record<string, unknown>) => void };
            const cards = document.querySelectorAll('.achievement-card');
            VanillaTilt.init(cards, {
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
        }
      }, 350);

      // Chatbot and particle background — heavier modules, defer slightly more
      defer(() => {
        if (!auditMode) {
          import('./modules/chatbot').then(({ ChatbotManager }) => {
            if (window.Portfolio?.lazy) {
              window.Portfolio.lazy.ChatbotManager = new ChatbotManager();
            }
          });
        }
      }, 300);

      // Optional dev-only stress test: run when URL has ?stress=1
      defer(() => {
        const qs2 = new URLSearchParams(window.location.search);
        const stressFlag = (qs2.get('stress') || '').toLowerCase();
        const doStress = !import.meta.env.PROD && (stressFlag === '1' || stressFlag === 'true' || stressFlag === 'yes');
        if (!auditMode && doStress) {
          import('./modules/chatbot-stress').then(({ runChatbotStressTests }) => {
            runChatbotStressTests();
          });
        }
      }, 650);

      defer(() => {
        const canvas = document.getElementById('particle-background') as HTMLCanvasElement | null;
        if (prefersReducedMotion) {
          if (canvas) {
            canvas.style.display = 'none';
            canvas.setAttribute('aria-hidden', 'true');
          }
          return;
        }
        if (!auditMode) {
          import('./modules/particle-background').then(({ ParticleBackground }) => {
            new ParticleBackground('particle-background');
          });
        }
      }, 450);

      // Initialize core components
      window.Portfolio = {
        core: {
          version: '2.0.0',
          initialized: true,
          auditMode,
          prefersReducedMotion,
        },
        modules: {
          SecurityManager: securityManager,
          LoadingManager: loadingManager,
          ImageOptimizer: imageOptimizer,
          ModalManager: modalManager,
          NavigationManager: navigationManager,
          Search: search,
          SkeletonLoader: skeletonLoader,
        },
        lazy: {},
      };

      logger.log('✅ Portfolio Application initialized successfully!');
      logger.log('📦 Available modules:', Object.keys(window.Portfolio.modules ?? {}));
      logger.log('📦 Lazy modules:', Object.keys(window.Portfolio.lazy ?? {}));

      // Display performance report after page load (skip overlays in audit mode)
      window.addEventListener('load', () => {
        setTimeout(() => {
          if (!auditMode) {
            performanceMonitor.displayPerformanceBadge();
          }
          const params = new URLSearchParams(window.location.search);
          const flag = (params.get('perf') || params.get('dashboard') || '').toLowerCase();
          const showPerfDashboard = !auditMode && (import.meta.env.DEV || flag === '1' || flag === 'true' || flag === 'yes');

          if (showPerfDashboard) {
            if (import.meta.env.DEV) {
              performanceMonitor.generateReport();
            }
            PerformanceDashboard.getInstance({
              position: 'bottom-right',
              minimized: true,
              showInProduction: !import.meta.env.DEV
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
import './styles/main.css';
