/**
 * Sidebar Animations Module
 * Handles entry animations, transitions, and micro-interactions for the sidebar
 */

export class SidebarAnimations {
  private sidebar: HTMLElement | null = null;
  private sidebarBtn: HTMLButtonElement | null = null;

  constructor() {
    this.init();
  }

  /**
   * Initialize sidebar animations
   */
  private init(): void {
    this.sidebar = document.querySelector<HTMLElement>("[data-sidebar]");
    this.sidebarBtn = document.querySelector<HTMLButtonElement>("[data-sidebar-btn]");

    if (this.sidebar && this.sidebarBtn) {
      this.setupEntryAnimations();
      this.setupBounceEffect();
      this.setupRippleEffect();
    }
  }

  /**
   * Setup staggered fade-in and slide-in animations on page load
   */
  private setupEntryAnimations(): void {
    if (!this.sidebar) return;

    // Add initial hidden state
    this.sidebar.style.opacity = "0";
    this.sidebar.style.transform = "translateX(-30px)";

    // Get all animatable elements
    const elements = [
      this.sidebar.querySelector(".avatar-box"),
      this.sidebar.querySelector(".info-content"),
      this.sidebar.querySelector(".info_more-btn"),
      this.sidebar.querySelector(".sidebar-info_more"),
    ];

    // Animate sidebar container first
    setTimeout(() => {
      if (this.sidebar) {
        this.sidebar.style.transition = "opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)";
        this.sidebar.style.opacity = "1";
        this.sidebar.style.transform = "translateX(0)";
      }
    }, 100);

    // Stagger animate child elements
    elements.forEach((element, index) => {
      if (element) {
        const el = element as HTMLElement;
        el.style.opacity = "0";
        el.style.transform = "translateX(-20px)";
        
        setTimeout(() => {
          el.style.transition = "opacity 0.5s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
          el.style.opacity = "1";
          el.style.transform = "translateX(0)";
        }, 300 + (index * 150)); // Stagger by 150ms
      }
    });

    // Animate contact items and social links when sidebar is expanded
    this.animateSidebarContent();
  }

  /**
   * Animate sidebar content (contacts and social links) with stagger
   */
  private animateSidebarContent(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target instanceof HTMLElement && 
            mutation.target.classList.contains("sidebar") &&
            mutation.target.classList.contains("active")) {
          this.staggerAnimateContent();
        }
      });
    });

    if (this.sidebar) {
      observer.observe(this.sidebar, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  }

  /**
   * Stagger animate contact items and social links
   */
  private staggerAnimateContent(): void {
    const contactItems = document.querySelectorAll<HTMLElement>(".contact-item");
    const socialItems = document.querySelectorAll<HTMLElement>(".social-item");
    const resumeLink = document.querySelector<HTMLElement>(".resume");

    // Animate resume link first
    if (resumeLink) {
      resumeLink.style.opacity = "0";
      resumeLink.style.transform = "translateY(-10px)";
      setTimeout(() => {
        resumeLink.style.transition = "opacity 0.4s ease-out, transform 0.4s ease-out";
        resumeLink.style.opacity = "1";
        resumeLink.style.transform = "translateY(0)";
      }, 100);
    }

    // Animate contact items
    contactItems.forEach((item, index) => {
      item.style.opacity = "0";
      item.style.transform = "translateY(-10px)";
      
      setTimeout(() => {
        item.style.transition = "opacity 0.4s ease-out, transform 0.4s ease-out";
        item.style.opacity = "1";
        item.style.transform = "translateY(0)";
      }, 200 + (index * 100));
    });

    // Animate social items
    socialItems.forEach((item, index) => {
      item.style.opacity = "0";
      item.style.transform = "scale(0.5) translateY(-10px)";
      
      setTimeout(() => {
        item.style.transition = "opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
        item.style.opacity = "1";
        item.style.transform = "scale(1) translateY(0)";
      }, 400 + (index * 80));
    });
  }

  /**
   * Setup bounce effect on expand/collapse
   */
  private setupBounceEffect(): void {
    if (!this.sidebar || !this.sidebarBtn) return;

    this.sidebarBtn.addEventListener("click", () => {
      if (this.sidebar) {
        // Add bounce animation class
        this.sidebar.classList.add("sidebar-bounce");
        
        // Remove class after animation completes
        setTimeout(() => {
          this.sidebar?.classList.remove("sidebar-bounce");
        }, 600);
      }
    });
  }

  /**
   * Setup ripple effect on button clicks
   */
  private setupRippleEffect(): void {
    if (!this.sidebarBtn) return;

    this.sidebarBtn.addEventListener("click", (e: MouseEvent) => {
      this.createRipple(e, this.sidebarBtn!);
    });

    // Also add ripple to social links
    const socialLinks = document.querySelectorAll<HTMLElement>(".social-link");
    socialLinks.forEach((link) => {
      link.addEventListener("click", (e: MouseEvent) => {
        this.createRipple(e, link);
      });
    });

    // Add ripple to contact links
    const contactLinks = document.querySelectorAll<HTMLElement>(".contact-link");
    contactLinks.forEach((link) => {
      link.addEventListener("click", (e: MouseEvent) => {
        this.createRipple(e, link);
      });
    });

    // Add ripple to resume link
    const resumeLink = document.querySelector<HTMLElement>(".resume");
    if (resumeLink) {
      resumeLink.addEventListener("click", (e: MouseEvent) => {
        this.createRipple(e, resumeLink);
      });
    }
  }

  /**
   * Create ripple effect at click position
   */
  private createRipple(event: MouseEvent, element: HTMLElement): void {
    const ripple = document.createElement("span");
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add("ripple-effect");

    // Remove any existing ripples
    const existingRipple = element.querySelector(".ripple-effect");
    if (existingRipple) {
      existingRipple.remove();
    }

    element.style.position = "relative";
    element.style.overflow = "hidden";
    element.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /**
   * Add entrance animation to new elements (useful for dynamic content)
   */
  public animateElement(element: HTMLElement, delay: number = 0): void {
    element.style.opacity = "0";
    element.style.transform = "translateY(-10px)";

    setTimeout(() => {
      element.style.transition = "opacity 0.4s ease-out, transform 0.4s ease-out";
      element.style.opacity = "1";
      element.style.transform = "translateY(0)";
    }, delay);
  }

  /**
   * Reset animations (useful for testing or re-triggering)
   */
  public reset(): void {
    if (this.sidebar) {
      this.sidebar.style.opacity = "";
      this.sidebar.style.transform = "";
    }
  }
}
