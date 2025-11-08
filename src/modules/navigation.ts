/**
 * Navigation Manager Module
 * Handles page navigation, sidebar, filters, forms, and scroll effects
 */

export class NavigationManager {
  private revealObserver: IntersectionObserver | null = null;
  private isTransitioning: boolean = false;

  constructor() {
    this.init();
  }

  /**
   * Initialize navigation manager
   */
  private init(): void {
    this.setupSidebar();
    this.setupFilters();
    this.setupForms();
    this.setupNavigation();
    this.setupScrollEffects();
    this.setupFAQ();
  }

  /**
   * Setup sidebar functionality
   */
  private setupSidebar(): void {
    const sidebar = document.querySelector<HTMLElement>("[data-sidebar]");
    const sidebarBtn = document.querySelector<HTMLButtonElement>("[data-sidebar-btn]");

    if (sidebar && sidebarBtn) {
      sidebarBtn.addEventListener("click", () => {
        this.elementToggleFunc(sidebar);
      });
    }
  }

  /**
   * Setup filter functionality
   */
  private setupFilters(): void {
    const select = document.querySelector<HTMLElement>("[data-select]");
    const selectItems = document.querySelectorAll<HTMLElement>("[data-select-item]");
    const selectValue = document.querySelector<HTMLElement>("[data-select-value]");
    const filterBtn = document.querySelectorAll<HTMLButtonElement>("[data-filter-btn]");

    if (select) {
      select.addEventListener("click", () => {
        this.elementToggleFunc(select);
      });
    }

    // Handle select items
    selectItems.forEach((item) => {
      item.addEventListener("click", () => {
        const selectedValue = item.innerText.toLowerCase();
        if (selectValue) {
          selectValue.innerText = item.innerText;
        }
        this.elementToggleFunc(select);
        this.filterFunc(selectedValue);
      });
    });

    // Handle filter buttons
    let lastClickedBtn = filterBtn[0];
    filterBtn.forEach((btn) => {
      btn.addEventListener("click", () => {
        const selectedValue = btn.innerText.toLowerCase();
        if (selectValue) {
          selectValue.innerText = btn.innerText;
        }
        this.filterFunc(selectedValue);
        lastClickedBtn?.classList.remove("active");
        btn.classList.add("active");
        lastClickedBtn = btn;
      });
    });
  }

  /**
   * Setup form functionality
   */
  private setupForms(): void {
    const form = document.querySelector<HTMLFormElement>("[data-form]");
    const formInputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-form-input]");
    const formBtn = document.querySelector<HTMLButtonElement>("[data-form-btn]");

    if (form && formInputs && formBtn) {
      formInputs.forEach((input) => {
        input.addEventListener("input", () => {
          if (form.checkValidity()) {
            formBtn.removeAttribute("disabled");
          } else {
            formBtn.setAttribute("disabled", "");
          }
        });
      });
    }
  }

  /**
   * Setup page navigation
   */
  private setupNavigation(): void {
    const navigationLinks = document.querySelectorAll<HTMLButtonElement>("[data-nav-link]");
    const pages = document.querySelectorAll<HTMLElement>("[data-page]");

    navigationLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (this.isTransitioning) return;

        const targetKey = (link.textContent || '').toLowerCase().trim();
        const currentPage = document.querySelector<HTMLElement>('[data-page].active');
        const targetPage = Array.from(pages).find(p => ((p.dataset.page || '').trim() === targetKey));

        if (!targetPage || targetPage === currentPage) return;

        this.isTransitioning = true;

        // Update nav active state
        navigationLinks.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');


        const finalize = () => {
          if (!this.isTransitioning) return;
          if (currentPage) {
            currentPage.classList.remove('page-leave');
            currentPage.classList.remove('active');
          }
          targetPage.classList.add('active');
          window.scrollTo({ top: 0, behavior: 'auto' });
          this.isTransitioning = false;

        // Push SPA route for the active section and update canonical
          const path = this.pathFromKey(targetKey);
          this.updateCanonical(path);
          try {
            window.history.pushState({}, '', path);
          } catch (err) {
            console.warn('History pushState failed', err);
          }
        };

        // Activate target immediately for snappy navigation
        finalize();
      });
    });

    // Initialize active section based on URL path
    this.applyRoute(window.location.pathname);

    // Handle back/forward navigation
    window.addEventListener('popstate', () => {
      this.applyRoute(window.location.pathname);
    });
  }

  /**
   * Setup scroll effects
   */
  private setupScrollEffects(): void {
    // Scroll reveal animation
    const revealElements = document.querySelectorAll<HTMLElement>('.reveal');
    this.revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    revealElements.forEach(el => this.revealObserver?.observe(el));

    // Back-to-top button functionality
    const backToTopBtn = document.querySelector<HTMLElement>('.back-to-top');
    if (backToTopBtn) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
          backToTopBtn.classList.add('show');
        } else {
          backToTopBtn.classList.remove('show');
        }
      });
      
      backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  /**
   * Setup FAQ functionality
   */
  private setupFAQ(): void {
    const faqQuestions = document.querySelectorAll<HTMLElement>('.faq-question');
    
    faqQuestions.forEach((question) => {
      question.addEventListener('click', () => {
        this.toggleFAQ(question);
      });
    });
  }

  /**
   * Toggle element active class
   */
  private elementToggleFunc(elem: HTMLElement | null): void {
    elem?.classList.toggle("active");
  }

  /**
   * Filter function for project items
   */
  private filterFunc(selectedValue: string): void {
    const filterItems = document.querySelectorAll<HTMLElement>("[data-filter-item]");
    
    filterItems.forEach((item) => {
      if (selectedValue === "all") {
        item.classList.add("active");
      } else if (selectedValue === item.dataset.category) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  /**
   * Toggle FAQ answer visibility
   */
  public toggleFAQ(element: HTMLElement): void {
    const answer = element.nextElementSibling as HTMLElement;
    if (answer) {
      answer.classList.toggle("show");
    }
  }

  /**
   * Derive navigation key from pathname
   */
  private keyFromPath(pathname: string): string {
    const path = (pathname || '/').replace(/\/+$/, '');
    if (path === '' || path === '/') return 'about';
    switch (path) {
      case '/about': return 'about';
      case '/background': return 'background';
      case '/projects': return 'projects';
      case '/organizations': return 'organizations';
      case '/contact': return 'contact';
      default: return 'about';
    }
  }

  /**
   * Map navigation key to SPA path
   */
  private pathFromKey(key: string): string {
    switch ((key || '').trim().toLowerCase()) {
      case 'about': return '/about';
      case 'background': return '/background';
      case 'projects': return '/projects';
      case 'organizations': return '/organizations';
      case 'contact': return '/contact';
      default: return '/';
    }
  }

  /**
   * Apply route: set active section and handle special anchors
   */
  private applyRoute(pathname: string): void {
    const key = this.keyFromPath(pathname);

    // Toggle active section (contact reuses about page)
    const pages = document.querySelectorAll<HTMLElement>('[data-page]');
    const targetPage = Array.from(pages).find(p => ((p.dataset.page || '').trim() === (key === 'contact' ? 'about' : key)));
    const currentPage = document.querySelector<HTMLElement>('[data-page].active');

    if (targetPage && targetPage !== currentPage) {
      currentPage?.classList.remove('active');
      targetPage.classList.add('active');
    }

    // Update nav button active state
    const navigationLinks = document.querySelectorAll<HTMLButtonElement>('[data-nav-link]');
    navigationLinks.forEach((btn) => {
      const label = (btn.textContent || '').trim().toLowerCase();
      const activeLabel = key === 'contact' ? 'about' : key;
      btn.classList.toggle('active', label === activeLabel);
    });

    // Scroll to contact anchor if /contact, else to top
    if (key === 'contact') {
      window.scrollTo({ top: 0, behavior: 'auto' });
      const el = document.getElementById('contact');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    // Update canonical
    const path = (pathname || '/').replace(/\/+$/, '') || '/';
    this.updateCanonical(path);

    // Adjust image loading priority for organizations page
    if (key === 'organizations') {
      this.prioritizeOrganizationLogos();
    } else {
      this.deprioritizeOrganizationLogos();
    }
  }

  /**
   * Update canonical link based on route
   */
  private updateCanonical(path: string): void {
    try {
      const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (canonical) {
        const base = 'https://adriel.dev';
        const href = path === '/' ? base : `${base}${path}`;
        canonical.setAttribute('href', href);

        // Update Open Graph and Twitter URL to mirror canonical
        const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', href);
        const twUrl = document.querySelector<HTMLMetaElement>('meta[name="twitter:url"]');
        if (twUrl) twUrl.setAttribute('content', href);
      }
    } catch (err) {
      console.warn('Meta/canonical update failed', err);
    }
  }

  /**
   * Increase loading priority for organization logos when the page is active
   */
  private prioritizeOrganizationLogos(): void {
    const logos = document.querySelectorAll<HTMLImageElement>('.org-logo img');
    const head = document.head;
    logos.forEach((img) => {
      // Set eager loading and high fetch priority for above-the-fold logos
      img.setAttribute('loading', 'eager');
      img.setAttribute('fetchpriority', 'high');
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
      // Preload to warm the cache and avoid delayed fetch
      const src = img.currentSrc || img.src;
      if (src) {
        const id = `preload-${src}`;
        if (!head.querySelector(`link[data-id="${CSS.escape(id)}"]`)) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = src;
          link.setAttribute('fetchpriority', 'high');
          link.setAttribute('data-id', id);
          head.appendChild(link);
        }
      }
      // Trigger decoding as soon as data is available
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
      }
    });
  }

  /**
   * Restore lazy loading for organization logos when leaving the page
   */
  private deprioritizeOrganizationLogos(): void {
    const logos = document.querySelectorAll<HTMLImageElement>('.org-logo img');
    logos.forEach((img) => {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('fetchpriority', 'low');
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
    });
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.revealObserver?.disconnect();
    this.revealObserver = null;
  }
}

export default NavigationManager;
