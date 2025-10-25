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

        const targetKey = link.textContent?.toLowerCase() || '';
        const currentPage = document.querySelector<HTMLElement>('[data-page].active');
        const targetPage = Array.from(pages).find(p => p.dataset.page === targetKey);

        if (!targetPage || targetPage === currentPage) return;

        this.isTransitioning = true;

        // Update nav active state
        navigationLinks.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');

        // Animate current page leaving, then activate target
        if (currentPage) {
          const onLeaveEnd = () => {
            currentPage.classList.remove('page-leave');
            currentPage.classList.remove('active');

            // Activate target page (will run slideFadeIn via CSS)
            targetPage.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'auto' });

            this.isTransitioning = false;
            currentPage.removeEventListener('animationend', onLeaveEnd);
          };

          currentPage.classList.add('page-leave');
          currentPage.addEventListener('animationend', onLeaveEnd);
        } else {
          // No current page; just activate target
          targetPage.classList.add('active');
          window.scrollTo({ top: 0, behavior: 'auto' });
          this.isTransitioning = false;
        }
      });
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
   * Cleanup resources
   */
  public destroy(): void {
    this.revealObserver?.disconnect();
    this.revealObserver = null;
  }
}

export default NavigationManager;
