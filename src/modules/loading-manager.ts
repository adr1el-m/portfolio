import { logger } from '@/config';

/**
 * Loading Manager Module
 * Handles loading animations, screen transitions, and global loading indicators.
 */
export class LoadingManager {
  private globalLoader: HTMLElement | null = null;
  private loadingCount: number = 0;
  private imageObserver: IntersectionObserver | null = null;

  constructor() {
    logger.log('LoadingManager initialized');
    this.init();
  }

  private init(): void {
    // Hide preloader after initial load
    const preloader = document.querySelector<HTMLElement>("[data-preloader]");
    if (preloader) {
      window.addEventListener("load", () => {
        setTimeout(() => {
          preloader.classList.add("remove");
        }, 500);
      });
    }

    // Create global loading indicator
    this.createGlobalLoader();

    // Setup universal lazy loading
    this.setupUniversalLazyLoading();

    // Setup image loading error handling
    this.setupImageErrorHandling();
  }

  /**
   * Create global loading indicator for async operations
   */
  private createGlobalLoader(): void {
    this.globalLoader = document.createElement('div');
    this.globalLoader.id = 'global-loader';
    this.globalLoader.className = 'global-loader';
    this.globalLoader.innerHTML = `
      <div class="global-loader-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="global-loader-text">Loading...</p>
    `;
    this.globalLoader.style.display = 'none';
    document.body.appendChild(this.globalLoader);
  }

  /**
   * Show global loading indicator
   */
  public showGlobalLoader(message: string = 'Loading...'): void {
    this.loadingCount++;
    if (this.globalLoader) {
      const textEl = this.globalLoader.querySelector('.global-loader-text');
      if (textEl) {
        textEl.textContent = message;
      }
      this.globalLoader.style.display = 'flex';
      // Add animation class
      requestAnimationFrame(() => {
        this.globalLoader?.classList.add('active');
      });
    }
  }

  /**
   * Hide global loading indicator
   */
  public hideGlobalLoader(): void {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    
    if (this.loadingCount === 0 && this.globalLoader) {
      this.globalLoader.classList.remove('active');
      setTimeout(() => {
        if (this.globalLoader && this.loadingCount === 0) {
          this.globalLoader.style.display = 'none';
        }
      }, 300);
    }
  }

  /**
   * Setup universal lazy loading for all images
   */
  private setupUniversalLazyLoading(): void {
    // Use Intersection Observer for lazy loading images that don't have loading="lazy"
    this.imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.imageObserver?.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01,
      }
    );

    // Observe all images that need lazy loading
    this.observeImages();
  }

  /**
   * Observe all images for lazy loading
   */
  private observeImages(): void {
    const images = document.querySelectorAll<HTMLImageElement>('img:not([loading="eager"])');
    
    images.forEach((img) => {
      // Add loading skeleton
      if (!img.complete && !img.classList.contains('critical-image')) {
        this.addImageSkeleton(img);
      }

      // Add to observer if not already loaded
      if (!img.complete) {
        this.imageObserver?.observe(img);
      }

      // Handle load event
      img.addEventListener('load', () => {
        this.removeImageSkeleton(img);
        img.classList.add('image-loaded');
      });

      // Handle error event
      img.addEventListener('error', () => {
        this.handleImageError(img);
      });
    });
  }

  /**
   * Load image with data-src or actual src
   */
  private loadImage(img: HTMLImageElement): void {
    const dataSrc = img.getAttribute('data-src');
    if (dataSrc && !img.src) {
      img.src = dataSrc;
    }

    // Handle srcset
    const dataSrcset = img.getAttribute('data-srcset');
    if (dataSrcset && !img.srcset) {
      img.srcset = dataSrcset;
    }
  }

  /**
   * Add skeleton loader to image container
   */
  private addImageSkeleton(img: HTMLImageElement): void {
    const parent = img.parentElement;
    if (!parent || parent.querySelector('.image-skeleton')) return;

    const skeleton = document.createElement('div');
    skeleton.className = 'image-skeleton shimmer';
    skeleton.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        var(--eerie-black-1) 0%,
        var(--eerie-black-2) 50%,
        var(--eerie-black-1) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: inherit;
      z-index: 1;
    `;

    parent.style.position = parent.style.position || 'relative';
    parent.insertBefore(skeleton, img);
  }

  /**
   * Remove skeleton loader from image
   */
  private removeImageSkeleton(img: HTMLImageElement): void {
    const parent = img.parentElement;
    if (!parent) return;

    const skeleton = parent.querySelector('.image-skeleton');
    if (skeleton) {
      skeleton.classList.add('fade-out');
      setTimeout(() => skeleton.remove(), 300);
    }
  }

  /**
   * Handle image loading errors
   */
  private handleImageError(img: HTMLImageElement): void {
    logger.error('Image failed to load:', img.src);
    
    this.removeImageSkeleton(img);
    
    // Add error class
    img.classList.add('image-error');
    
    // Create fallback placeholder
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.image-error-placeholder')) {
      const placeholder = document.createElement('div');
      placeholder.className = 'image-error-placeholder';
      placeholder.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="var(--light-gray-70)"/>
        </svg>
        <span>Image unavailable</span>
      `;
      placeholder.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--eerie-black-2);
        color: var(--light-gray-70);
        font-size: var(--fs-8);
        gap: 8px;
        border-radius: inherit;
      `;
      parent.insertBefore(placeholder, img);
      img.style.display = 'none';
    }
  }

  /**
   * Setup image error handling for all images
   */
  private setupImageErrorHandling(): void {
    // This is already handled in observeImages(), but we can add global handler
    window.addEventListener('error', (e) => {
      const target = e.target as HTMLImageElement;
      if (target.tagName === 'IMG') {
        this.handleImageError(target);
      }
    }, true); // Use capture phase to catch all image errors
  }

  /**
   * Preload critical images
   */
  public preloadImages(urls: string[]): Promise<void[]> {
    this.showGlobalLoader('Loading images...');
    
    const promises = urls.map((url) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => {
          logger.error('Failed to preload image:', url);
          reject(new Error(`Failed to load ${url}`));
        };
        img.src = url;
      });
    });

    return Promise.all(promises).finally(() => {
      this.hideGlobalLoader();
    });
  }

  /**
   * Show loading state on specific element
   */
  public showLoadingState(element: HTMLElement, message?: string): void {
    element.classList.add('loading-state');
    
    const loader = document.createElement('div');
    loader.className = 'element-loader';
    loader.innerHTML = `
      <div class="element-loader-spinner">
        <div class="spinner-ring"></div>
      </div>
      ${message ? `<span class="element-loader-text">${message}</span>` : ''}
    `;
    
    element.style.position = element.style.position || 'relative';
    element.appendChild(loader);
  }

  /**
   * Hide loading state on specific element
   */
  public hideLoadingState(element: HTMLElement): void {
    element.classList.remove('loading-state');
    const loader = element.querySelector('.element-loader');
    if (loader) {
      loader.remove();
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.imageObserver?.disconnect();
    this.imageObserver = null;
    
    if (this.globalLoader) {
      this.globalLoader.remove();
      this.globalLoader = null;
    }
  }
}
