/**
 * Skeleton Loader Module
 * Handles skeleton loaders, progressive disclosure, shimmer effects, and spinners
 */

export class SkeletonLoader {
  private loadedStages: Set<string> = new Set();
  private shimmerElements: HTMLElement[] = [];

  constructor() {
    this.init();
  }

  /**
   * Initialize skeleton loader system
   */
  private init(): void {
    this.createSidebarSkeleton();
    this.setupProgressiveDisclosure();
    this.addShimmerEffect();
  }

  /**
   * Create skeleton loader for sidebar
   */
  private createSidebarSkeleton(): void {
    const sidebar = document.querySelector<HTMLElement>("[data-sidebar]");
    if (!sidebar) return;

    // Create skeleton overlay
    const skeleton = document.createElement("div");
    skeleton.className = "sidebar-skeleton";
    skeleton.innerHTML = `
      <div class="skeleton-avatar shimmer"></div>
      <div class="skeleton-content">
        <div class="skeleton-line skeleton-line-title shimmer"></div>
        <div class="skeleton-line skeleton-line-subtitle shimmer"></div>
      </div>
      <div class="skeleton-button shimmer"></div>
    `;

    // Insert skeleton before sidebar content
    const sidebarInfo = sidebar.querySelector(".sidebar-info");
    if (sidebarInfo) {
      sidebar.insertBefore(skeleton, sidebarInfo);
    }

    // Hide actual content initially
    this.hideElementsForLoading(sidebar);

    // Simulate loading and progressive reveal
    this.startProgressiveLoading(sidebar, skeleton);
  }

  /**
   * Hide elements initially for loading effect
   */
  private hideElementsForLoading(sidebar: HTMLElement): void {
    const elementsToHide = [
      sidebar.querySelector(".sidebar-info"),
      sidebar.querySelector(".sidebar-info_more"),
    ];

    elementsToHide.forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.opacity = "0";
        el.style.visibility = "hidden";
      }
    });
  }

  /**
   * Start progressive loading stages
   */
  private startProgressiveLoading(sidebar: HTMLElement, skeleton: HTMLElement): void {
    // Stage 1: Avatar loads (500ms)
    setTimeout(() => {
      this.loadStage("avatar", sidebar, skeleton);
    }, 500);

    // Stage 2: Name and title load (800ms)
    setTimeout(() => {
      this.loadStage("info", sidebar, skeleton);
    }, 800);

    // Stage 3: Button loads (1100ms)
    setTimeout(() => {
      this.loadStage("button", sidebar, skeleton);
    }, 1100);

    // Stage 4: Remove skeleton completely (1400ms)
    setTimeout(() => {
      this.removeSkeletonLoader(sidebar, skeleton);
    }, 1400);
  }

  /**
   * Load a specific stage of content
   */
  private loadStage(stage: string, sidebar: HTMLElement, skeleton: HTMLElement): void {
    if (this.loadedStages.has(stage)) return;

    this.loadedStages.add(stage);

    switch (stage) {
      case "avatar":
        this.revealElement(sidebar.querySelector(".avatar-box"));
        skeleton.querySelector(".skeleton-avatar")?.classList.add("loaded");
        break;

      case "info":
        this.revealElement(sidebar.querySelector(".info-content"));
        skeleton.querySelectorAll(".skeleton-line").forEach((el) => {
          el.classList.add("loaded");
        });
        break;

      case "button":
        this.revealElement(sidebar.querySelector(".info_more-btn"));
        skeleton.querySelector(".skeleton-button")?.classList.add("loaded");
        break;
    }
  }

  /**
   * Reveal an element with animation
   */
  private revealElement(element: Element | null): void {
    if (element instanceof HTMLElement) {
      element.style.visibility = "visible";
      element.style.opacity = "0";
      element.style.transform = "translateY(10px)";

      requestAnimationFrame(() => {
        element.style.transition = "opacity 0.4s ease-out, transform 0.4s ease-out";
        element.style.opacity = "1";
        element.style.transform = "translateY(0)";
      });
    }
  }

  /**
   * Remove skeleton loader after all content is loaded
   */
  private removeSkeletonLoader(sidebar: HTMLElement, skeleton: HTMLElement): void {
    skeleton.style.transition = "opacity 0.3s ease-out";
    skeleton.style.opacity = "0";

    setTimeout(() => {
      skeleton.remove();
      
      // Reveal hidden content
      const sidebarInfo = sidebar.querySelector<HTMLElement>(".sidebar-info");
      const sidebarMore = sidebar.querySelector<HTMLElement>(".sidebar-info_more");

      if (sidebarInfo) {
        sidebarInfo.style.visibility = "visible";
        sidebarInfo.style.opacity = "1";
      }
      if (sidebarMore) {
        sidebarMore.style.visibility = "visible";
      }
    }, 300);
  }

  /**
   * Setup progressive disclosure for main content sections
   */
  private setupProgressiveDisclosure(): void {
    // Create intersection observer for progressive content loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            this.loadContentSection(element);
            observer.unobserve(element);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
      }
    );

    // Observe all article sections
    const articles = document.querySelectorAll<HTMLElement>("article");
    articles.forEach((article) => {
      article.classList.add("content-loading");
      observer.observe(article);
    });

    // Observe project and achievement items
    const projectItems = document.querySelectorAll<HTMLElement>(".project-item");
    const achievementCards = document.querySelectorAll<HTMLElement>(".achievement-card");

    [...projectItems, ...achievementCards].forEach((item) => {
      item.classList.add("content-loading");
      observer.observe(item);
    });
  }

  /**
   * Load content section progressively
   */
  private loadContentSection(element: HTMLElement): void {
    // Add loading state
    element.classList.add("content-loading-active");

    // Create shimmer overlay for the section
    const shimmer = this.createShimmerOverlay();
    element.appendChild(shimmer);

    // Simulate loading time
    setTimeout(() => {
      shimmer.style.opacity = "0";
      element.classList.remove("content-loading", "content-loading-active");
      element.classList.add("content-loaded");

      setTimeout(() => {
        shimmer.remove();
      }, 300);
    }, 300);
  }

  /**
   * Add shimmer effect to loading elements
   */
  private addShimmerEffect(): void {
    const style = document.createElement("style");
    style.id = "shimmer-effect-styles";
    style.textContent = `
      .shimmer {
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.05) 20%,
          rgba(255, 219, 112, 0.1) 50%,
          rgba(255, 255, 255, 0.05) 80%,
          rgba(255, 255, 255, 0) 100%
        );
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
      }

      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
    `;

    if (!document.getElementById("shimmer-effect-styles")) {
      document.head.appendChild(style);
    }
  }

  /**
   * Create shimmer overlay for content sections
   */
  private createShimmerOverlay(): HTMLElement {
    const overlay = document.createElement("div");
    overlay.className = "shimmer-overlay";
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 219, 112, 0.05) 50%,
        transparent 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      pointer-events: none;
      z-index: 10;
      border-radius: inherit;
      transition: opacity 0.3s ease-out;
    `;
    return overlay;
  }

  /**
   * Create and show a spinner for dynamic content
   */
  public showSpinner(container: HTMLElement, size: "small" | "medium" | "large" = "medium"): HTMLElement {
    const spinner = document.createElement("div");
    spinner.className = `dynamic-spinner spinner-${size}`;
    spinner.innerHTML = `
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
    `;

    container.appendChild(spinner);
    container.classList.add("loading-dynamic-content");

    return spinner;
  }

  /**
   * Hide and remove spinner
   */
  public hideSpinner(spinner: HTMLElement): void {
    spinner.style.opacity = "0";
    setTimeout(() => {
      spinner.remove();
      const container = spinner.parentElement;
      if (container) {
        container.classList.remove("loading-dynamic-content");
      }
    }, 300);
  }

  /**
   * Create skeleton placeholder for specific element type
   */
  public createSkeletonPlaceholder(type: "card" | "list" | "text" | "image"): HTMLElement {
    const skeleton = document.createElement("div");
    skeleton.className = `skeleton-placeholder skeleton-${type}`;

    switch (type) {
      case "card":
        skeleton.innerHTML = `
          <div class="skeleton-image shimmer"></div>
          <div class="skeleton-content">
            <div class="skeleton-line skeleton-line-title shimmer"></div>
            <div class="skeleton-line skeleton-line-text shimmer"></div>
            <div class="skeleton-line skeleton-line-text shimmer"></div>
          </div>
        `;
        break;

      case "list":
        skeleton.innerHTML = `
          <div class="skeleton-line skeleton-line-full shimmer"></div>
          <div class="skeleton-line skeleton-line-full shimmer"></div>
          <div class="skeleton-line skeleton-line-full shimmer"></div>
        `;
        break;

      case "text":
        skeleton.innerHTML = `
          <div class="skeleton-line skeleton-line-text shimmer"></div>
        `;
        break;

      case "image":
        skeleton.innerHTML = `
          <div class="skeleton-image shimmer"></div>
        `;
        break;
    }

    return skeleton;
  }

  /**
   * Show loading state on element
   */
  public showLoadingState(element: HTMLElement): void {
    element.classList.add("loading-state");
    const shimmer = this.createShimmerOverlay();
    element.appendChild(shimmer);
    this.shimmerElements.push(shimmer);
  }

  /**
   * Hide loading state on element
   */
  public hideLoadingState(element: HTMLElement): void {
    element.classList.remove("loading-state");
    const shimmers = element.querySelectorAll(".shimmer-overlay");
    shimmers.forEach((shimmer) => {
      (shimmer as HTMLElement).style.opacity = "0";
      setTimeout(() => shimmer.remove(), 300);
    });
  }

  /**
   * Cleanup all loading states
   */
  public cleanup(): void {
    this.shimmerElements.forEach((shimmer) => {
      if (shimmer.parentElement) {
        shimmer.remove();
      }
    });
    this.shimmerElements = [];
    this.loadedStages.clear();
  }
}
