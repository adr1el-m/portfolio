import { lockDialogScroll, trapDialogFocus } from './dialog-accessibility';

/**
 * Navigation Manager Module
 * Handles page navigation, sidebar, filters, forms, and scroll effects
 */

export class NavigationManager {
  private revealObserver: IntersectionObserver | null = null;

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
    this.setupCertificateModal();
    this.setupMicroInteractions();
  }

  /**
   * Setup sidebar functionality
   */
  private setupSidebar(): void {
    const sidebar = document.querySelector<HTMLElement>("[data-sidebar]");
    const sidebarBtn = document.querySelector<HTMLButtonElement>("[data-sidebar-btn]");

    if (sidebar && sidebarBtn) {
      sidebarBtn.setAttribute('aria-expanded', String(sidebar.classList.contains('active')));
      sidebarBtn.addEventListener("click", () => {
        this.elementToggleFunc(sidebar);
        sidebarBtn.setAttribute('aria-expanded', String(sidebar.classList.contains('active')));
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

    navigationLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const targetKey = link.dataset.navTarget || (link.textContent || '').toLowerCase().trim();
        this.navigate(targetKey);
      });
    });

    window.addEventListener('portfolio:navigate', (event) => {
      const page = (event as CustomEvent<{ page?: string }>).detail?.page;
      if (!page) return;
      event.preventDefault();
      this.navigate(page);
    });

    // Initialize active section based on URL path
    this.applyRoute(window.location.pathname, true);

    // Handle back/forward navigation
    window.addEventListener('popstate', () => {
      this.applyRoute(window.location.pathname);
    });
  }

  private navigate(key: string): void {
    const pageKey = key === 'contact' ? 'about' : key;
    if (!Array.from(document.querySelectorAll<HTMLElement>('[data-page]')).some((page) => page.dataset.page === pageKey)) return;

    const path = this.pathFromKey(key);
    if (window.location.pathname !== path) {
      try {
        window.history.pushState({}, '', path);
      } catch (err) {
        console.warn('History pushState failed', err);
      }
    }
    this.applyRoute(path);
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

  private setupCertificateModal(): void {
    const modal = document.getElementById('cert-modal');
    if (!(modal instanceof HTMLElement)) return;

    let previousFocus: HTMLElement | null = null;
    let releaseScroll: (() => void) | null = null;
    modal.setAttribute('aria-label', 'Workflow Architect certificate preview');
    modal.setAttribute('aria-hidden', 'true');
    modal.inert = true;
    const close = () => {
      if (modal.style.display === 'none') return;
      previousFocus?.focus({ preventScroll: true });
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      modal.inert = true;
      releaseScroll?.();
      releaseScroll = null;
      previousFocus = null;
    };
    modal.querySelector<HTMLButtonElement>('.cert-modal-close')?.addEventListener('click', close);
    document.querySelectorAll<HTMLElement>('.cert-modal-trigger').forEach((trigger) => {
      trigger.tabIndex = 0;
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-haspopup', 'dialog');
      if (!trigger.hasAttribute('aria-label')) trigger.setAttribute('aria-label', 'Open certificate preview');
      const open = () => {
        const preview = modal.querySelector<HTMLImageElement>('[data-certificate-src]');
        const source = preview?.dataset.certificateSrc;
        if (preview && source && preview.getAttribute('src') !== source) preview.src = source;
        previousFocus = trigger;
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        modal.inert = false;
        releaseScroll ??= lockDialogScroll();
        modal.querySelector<HTMLButtonElement>('.cert-modal-close')?.focus({ preventScroll: true });
      };
      trigger.addEventListener('click', open);
      trigger.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
    });
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else {
        trapDialogFocus(event, modal);
      }
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
    let visibleCount = 0;

    filterItems.forEach((item) => {
      if (selectedValue === "all") {
        item.classList.add("active");
        visibleCount += 1;
      } else if (selectedValue === item.dataset.category) {
        item.classList.add("active");
        visibleCount += 1;
      } else {
        item.classList.remove("active");
      }
    });

    this.updateProjectEmptyState(selectedValue, visibleCount);
  }

  private updateProjectEmptyState(selectedValue: string, visibleCount: number): void {
    const projectList = document.querySelector<HTMLElement>('article.projects .project-list');
    if (!projectList) return;

    let emptyState = document.querySelector<HTMLElement>('[data-project-empty-state]');
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'project-empty-state';
      emptyState.dataset.projectEmptyState = '';
      emptyState.innerHTML = `
        <ion-icon name="file-tray-outline" aria-hidden="true"></ion-icon>
        <strong>No projects match this filter</strong>
        <span>Try another category or return to all projects.</span>
      `;
      projectList.insertAdjacentElement('afterend', emptyState);
    }

    const isEmpty = visibleCount === 0;
    emptyState.hidden = !isEmpty;
    if (isEmpty) {
      emptyState.querySelector('span')!.textContent = `No projects found for "${selectedValue}". Try All or search the portfolio.`;
    }
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
      case '/stack':
      case '/skills':
      case '/tech': return 'stack';
      case '/background': return 'background';
      case '/projects': return 'projects';
      case '/gear': return 'gear';
      case '/destinations': return 'destinations';
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
      case 'stack':
      case 'skills':
      case 'tech': return '/stack';
      case 'background': return '/background';
      case 'projects': return '/projects';
      case 'gear': return '/gear';
      case 'destinations': return '/destinations';
      case 'contact': return '/contact';
      default: return '/';
    }
  }

  /**
   * Apply route: set active section and handle special anchors
   */
  private applyRoute(pathname: string, isInitialLoad = false): void {
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
      const target = btn.dataset.navTarget || (btn.textContent || '').trim().toLowerCase();
      const isActive = target === (key === 'contact' ? 'about' : key);
      btn.classList.toggle('active', isActive);
      if (isActive) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    // Scroll to contact anchor if /contact, else to top
    if (key === 'contact') {
      window.scrollTo({ top: 0, behavior: 'auto' });
      const el = document.getElementById('contact');
      if (el) {
        setTimeout(() => {
          if (this.keyFromPath(window.location.pathname) !== 'contact') return;
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      }
    } else if (!(isInitialLoad && key === 'about')) {
      this.scrollToPageStart(targetPage || undefined);
    }

    // Update canonical using normalized key to avoid stale/removed routes
    const canonicalPath = this.pathFromKey(key);
    this.updateCanonical(canonicalPath);
    window.dispatchEvent(new CustomEvent('portfolio:pagechange', { detail: { page: key, initialLoad: isInitialLoad } }));
  }

  /**
   * Keep mobile navigation focused on the selected article below the stacked sidebar.
   */
  private scrollToPageStart(page?: HTMLElement): void {
    const sidebarRail = document.querySelector<HTMLElement>('.sidebar-rail');
    const sidebarStacksBeforePage = Boolean(
      page &&
      sidebarRail &&
      page.getBoundingClientRect().top >= sidebarRail.getBoundingClientRect().bottom - 1
    );
    const shouldScrollToArticle = Boolean(
      page &&
      (window.matchMedia?.('(max-width: 1023px)').matches || sidebarStacksBeforePage)
    );

    if (shouldScrollToArticle && page) {
      window.requestAnimationFrame(() => {
        if (!page.classList.contains('active')) return;
        page.scrollIntoView({ behavior: 'auto', block: 'start' });
        window.setTimeout(() => {
          if (!page.classList.contains('active') || this.keyFromPath(window.location.pathname) === 'contact') return;
          page.scrollIntoView({ behavior: 'auto', block: 'start' });
        }, 220);
      });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /**
   * Update canonical link based on route
   */
  private updateCanonical(path: string): void {
    try {
      const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (canonical) {
        const base = 'https://www.adrielmagalona.dev';
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

  private setupMicroInteractions(): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const navLinks = document.querySelectorAll<HTMLElement>('[data-nav-link]');
    navLinks.forEach((el) => {
      el.style.transition = el.style.transition || 'transform 150ms ease';
      el.addEventListener('pointerenter', () => {
        el.style.transform = 'translateY(-1px)';
      });
      el.addEventListener('pointerleave', () => {
        el.style.transform = 'translateY(0)';
      });
      el.addEventListener('focus', () => {
        el.style.transform = 'translateY(-1px)';
      });
      el.addEventListener('blur', () => {
        el.style.transform = 'translateY(0)';
      });
    });

    const cards = document.querySelectorAll<HTMLElement>('.project-item, .achievement-card');
    cards.forEach((card) => {
      card.style.transition = card.style.transition || 'transform 180ms ease, box-shadow 180ms ease';
      card.addEventListener('pointerenter', () => {
        card.style.transform = 'translateY(-2px) scale(1.01)';
        card.style.boxShadow = '0 8px 20px rgba(0,0,0,0.35)';
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
        card.style.boxShadow = '';
      });
      card.addEventListener('focus', () => {
        card.style.transform = 'translateY(-2px) scale(1.01)';
        card.style.boxShadow = '0 8px 20px rgba(0,0,0,0.35)';
      });
      card.addEventListener('blur', () => {
        card.style.transform = 'translateY(0) scale(1)';
        card.style.boxShadow = '';
      });
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
