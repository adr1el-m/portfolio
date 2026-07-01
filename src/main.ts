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

/**
 * Detect modern image format support and add classes to documentElement
 */
function detectImageFormatSupport(): void {
  // Check AVIF support
  const avifImg = new Image();
  avifImg.onload = () => {
    document.documentElement.classList.add('avif');
  };
  avifImg.onerror = () => {
    // AVIF not supported, check WebP
  };
  avifImg.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgABpAQ0AIyDQAAAA+A';

  // Check WebP support
  const webpImg = new Image();
  webpImg.onload = () => {
    document.documentElement.classList.add('webp');
  };
  webpImg.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
}

// Run format detection immediately
detectImageFormatSupport();

import { NavigationManager } from './modules/navigation';
import { SecurityManager } from './modules/security';
import { LoadingManager } from './modules/loading-manager';
import { ImageOptimizer } from './modules/image-optimizer';
import { ModalManager } from './modules/modal-manager';
import { IconReplacer } from './modules/icon-replacer';
import { SidebarAnimations } from './modules/sidebar-animations';
import { SkeletonLoader } from './modules/skeleton-loader';
import { PerformanceMonitor } from './modules/performance-monitor';
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

type ChatbotInstance = {
  openChatbox?: () => void;
};

function runWhenIdle(callback: () => void, timeout = 1800): void {
  const idleWindow = window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
  };

  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleWindow.requestIdleCallback(callback, { timeout });
    return;
  }

  window.setTimeout(callback, Math.min(timeout, 1200));
}

function enabledFlag(value: string | null | undefined): boolean {
  return ['1', 'true', 'yes'].includes((value || '').toLowerCase());
}

/**
 * Main Portfolio Application Class
 */
class PortfolioApp {
  private chatbotLoadPromise: Promise<ChatbotInstance | null> | null = null;

  constructor() {
    this.init();
  }

  private loadChatbot(openAfterLoad = false): Promise<ChatbotInstance | null> {
    const existing = window.Portfolio?.lazy?.ChatbotManager as ChatbotInstance | undefined;
    if (existing) {
      if (openAfterLoad) existing.openChatbox?.();
      return Promise.resolve(existing);
    }

    if (!this.chatbotLoadPromise) {
      this.chatbotLoadPromise = import('./modules/chatbot')
        .then(({ ChatbotManager }) => {
          const manager = new ChatbotManager();
          if (window.Portfolio?.lazy) {
            window.Portfolio.lazy.ChatbotManager = manager;
          }
          return manager as ChatbotInstance;
        })
        .catch((error) => {
          logger.error('Failed to load chatbot:', error);
          this.chatbotLoadPromise = null;
          return null;
        });
    }

    return this.chatbotLoadPromise.then((manager) => {
      if (openAfterLoad) manager?.openChatbox?.();
      return manager;
    });
  }

  private setupChatbotLoader(): void {
    const button = document.querySelector('.chatbot-btn');
    if (!(button instanceof HTMLButtonElement)) return;

    const preload = () => {
      void this.loadChatbot(false);
    };

    button.addEventListener('pointerenter', preload, { once: true, passive: true });
    button.addEventListener('focus', preload, { once: true });
    button.addEventListener('click', (event) => {
      if (window.Portfolio?.lazy?.ChatbotManager) return;
      event.preventDefault();
      event.stopPropagation();
      void this.loadChatbot(true);
    });
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
      import('./modules/structured-data').then(({ StructuredData }) => {
        new StructuredData();
      });
      const imageOptimizer = new ImageOptimizer();
      const loadingManager = new LoadingManager();
      const modalManager = new ModalManager();
      const navigationManager = new NavigationManager();
      // Initialize scroll progress bar
      new ScrollProgress();
      // Initialize client-side search (activates when URL has ?q=)
      const search = new Search();

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
        },
        lazy: window.Portfolio?.lazy || {},
      };

      // Helper to defer non-critical work to after first paint
      const defer = (cb: () => void, delay = 0) => {
        requestAnimationFrame(() => { setTimeout(cb, delay); });
      };

      // Defer non-essential modules until after first paint/idle
      defer(() => {
        // Initialize Wow Factors
        import('./modules/scroll-animations').then(({ ScrollAnimations }) => new ScrollAnimations());
        import('./modules/custom-cursor').then(({ CustomCursor }) => new CustomCursor());
        import('./modules/github-heatmap').then(({ GitHubHeatmap }) => {
          new GitHubHeatmap().init();
        });
        import('./modules/resume-preview').then(({ ResumePreview }) => {
          new ResumePreview();
        });

        import('./modules/about-enhancements').then(({ AboutEnhancements }) => {
          new AboutEnhancements();
        });
      }, 0);

      defer(() => {
        import('./modules/awards-accordion').then(({ AwardsAccordion }) => {
          new AwardsAccordion();
        });
        import('./modules/honors-gallery').then(({ HonorsGallery }) => {
          new HonorsGallery();
        });
        import('./modules/honor-routes').then(({ HonorRoutes }) => {
          new HonorRoutes();
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
        import('./modules/timeline-filters').then(({ TimelineFilters }) => {
          new TimelineFilters();
        });
      }, 150);

      defer(() => {
        import('./modules/project-previews').then(({ ProjectPreviews }) => {
          new ProjectPreviews();
        });
        import('./modules/honor-project-links').then(({ HonorProjectLinks }) => {
          new HonorProjectLinks();
        });
      }, 175);

      defer(() => {
        const showPublicAnalytics = enabledFlag(import.meta.env.VITE_PUBLIC_ANALYTICS_SNAPSHOT)
          || (import.meta.env.DEV && enabledFlag(qs.get('publicAnalytics')));
        if (showPublicAnalytics) {
          import('./modules/public-analytics').then(({ PublicAnalytics }) => {
            new PublicAnalytics();
          });
        }
        import('./modules/command-palette').then(({ CommandPalette }) => {
          new CommandPalette();
        });
        import('./modules/mobile-action-bar').then(({ MobileActionBar }) => {
          new MobileActionBar();
        });
      }, 225);

      // Initialize AI summaries for project hover tooltips
      defer(() => {
        import('./modules/ai-summaries').then(({ AISummaries }) => {
          new AISummaries();
        });
      }, 200);

      // Initialize visitor counter. The module handles missing Firebase config gracefully.
      runWhenIdle(() => {
        import('./modules/visitor-counter').then(({ VisitorCounter }) => {
          new VisitorCounter();
        });
        import('./modules/contact-flow').then(({ ContactFlow }) => {
          new ContactFlow();
        });
      }, 3000);

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
      window.Portfolio.modules.SkeletonLoader = skeletonLoader;

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
      runWhenIdle(() => {
        const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        if (!auditMode && !prefersReducedMotion && !isCoarsePointer) {
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
      }, 2200);

      // Optional dev-only stress test: run when URL has ?stress=1
      defer(() => {
        const qs2 = new URLSearchParams(window.location.search);
        const stressFlag = (qs2.get('stress') || '').toLowerCase();
        const doStress = !import.meta.env.PROD && (stressFlag === '1' || stressFlag === 'true' || stressFlag === 'yes');
        if (!auditMode && doStress) {
          this.loadChatbot(false).then(() => {
            import('./modules/chatbot-stress').then(({ runChatbotStressTests }) => {
              runChatbotStressTests();
            });
          });
        }
      }, 650);

      runWhenIdle(() => {
        const canvas = document.getElementById('particle-background') as HTMLCanvasElement | null;
        const canRunParticles = !auditMode &&
          !prefersReducedMotion &&
          window.innerWidth >= 900 &&
          !window.matchMedia('(pointer: coarse)').matches;
        if (!canRunParticles) {
          if (canvas) {
            canvas.style.display = 'none';
            canvas.setAttribute('aria-hidden', 'true');
          }
          return;
        }
        if (canvas) {
          import('./modules/particle-background').then(({ ParticleBackground }) => {
            new ParticleBackground('particle-background');
          });
        }
      }, 3500);

      defer(() => {
        import('./modules/analytics-dashboard').then(({ AnalyticsDashboard }) => {
          const dashboard = new AnalyticsDashboard();
          if (window.Portfolio?.lazy) {
            window.Portfolio.lazy.AnalyticsDashboard = dashboard;
          }
        });
      }, 450);

      this.setupChatbotLoader();

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
            import('./modules/performance-dashboard').then(({ PerformanceDashboard }) => {
              PerformanceDashboard.getInstance({
                position: 'bottom-right',
                minimized: true,
                showInProduction: !import.meta.env.DEV
              });
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
