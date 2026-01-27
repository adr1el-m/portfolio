/**
 * Awards Accordion Manager
 * Handles expanding/collapsing of year groups in the awards section
 */
export class AwardsAccordion {
  private resizeObservers: WeakMap<HTMLElement, ResizeObserver> = new WeakMap();
  private preloadedImages: Set<string> = new Set();

  constructor() {
    this.init();
  }

  private init(): void {
    const yearHeaders = document.querySelectorAll('[data-year-toggle]');
    
    yearHeaders.forEach(header => {
      header.addEventListener('click', () => {
        this.toggleYear(header as HTMLElement);
      });
    });
    
    // Preload images for the initially active (expanded) section
    const activeContent = document.querySelector('.year-content.active');
    if (activeContent) {
      this.preloadImagesForSection(activeContent as HTMLElement);
    }
  }

  private toggleYear(header: HTMLElement): void {
    const yearGroup = header.closest('.year-group');
    if (!yearGroup) return;

    const content = yearGroup.querySelector('.year-content') as HTMLElement;
    const isActive = header.classList.contains('active');

    if (isActive) {
      // Collapse
      // If content was set to 'none' after expansion, set it to its current
      // scroll height first to enable a smooth transition back to 0.
      if (content.style.maxHeight === 'none' || getComputedStyle(content).maxHeight === 'none') {
        content.style.maxHeight = content.scrollHeight + 'px';
        // Force reflow to apply the starting height before collapsing
        content.getBoundingClientRect();
      }

      header.classList.remove('active');
      content.classList.remove('active');
      content.style.maxHeight = '0px';

      // Stop observing size changes while collapsed
      this.unobserveContent(content);
    } else {
      // Expand
      header.classList.add('active');
      content.classList.add('active');

      // Preload images when section expands
      this.preloadImagesForSection(content);

      // Set max-height to the content's scrollHeight for full expansion.
      // Use rAF so class-based padding transition applies first.
      requestAnimationFrame(() => {
        content.style.maxHeight = content.scrollHeight + 'px';

        // After the max-height transition completes, remove the cap by setting
        // max-height to 'none' so dynamic content inside can grow naturally.
        const onTransitionEnd = (event: TransitionEvent) => {
          if (event.propertyName === 'max-height') {
            content.style.maxHeight = 'none';
          }
        };
        content.addEventListener('transitionend', onTransitionEnd, { once: true });

        // Fallback: ensure full expansion even if transitionend doesn't fire
        setTimeout(() => {
          if (getComputedStyle(content).maxHeight !== 'none') {
            content.style.maxHeight = 'none';
          }
        }, 700);
      });
      
      // Re-initialize tilt for newly visible cards
      setTimeout(() => {
        this.initializeTiltForVisibleCards(content);
      }, 100);

      // Keep content fully expanded if its size changes (e.g., fonts/images)
      this.observeContent(content);
    }
  }

  /**
   * Preload optimized images for achievement cards in a section
   */
  private preloadImagesForSection(container: HTMLElement): void {
    const cards = container.querySelectorAll('.achievement-card');
    const supportsAvif = document.documentElement.classList.contains('avif');
    const supportsWebp = document.documentElement.classList.contains('webp');
    
    cards.forEach((card) => {
      const imagesAttr = card.getAttribute('data-images');
      if (!imagesAttr) return;
      
      try {
        const images: string[] = JSON.parse(imagesAttr);
        // Preload first 2 images per card (for faster modal open)
        images.slice(0, 2).forEach((src) => {
          // Convert to optimized format
          const optimizedSrc = this.getOptimizedPath(src, supportsAvif ? 'avif' : supportsWebp ? 'webp' : null);
          
          if (this.preloadedImages.has(optimizedSrc)) return;
          
          const img = new Image();
          img.src = optimizedSrc;
          img.onload = () => {
            this.preloadedImages.add(optimizedSrc);
          };
        });
      } catch {
        // Ignore parse errors
      }
    });
  }

  /**
   * Convert image path to optimized format
   */
  private getOptimizedPath(src: string, format: 'avif' | 'webp' | null): string {
    if (!format) return src;
    return src.replace(/\.(jpe?g|png)$/i, `.${format}`);
  }

  private initializeTiltForVisibleCards(container: HTMLElement): void {
    const cards = container.querySelectorAll('.achievement-card');
    
    // Import VanillaTilt dynamically if needed
    const w = window as unknown as { VanillaTilt?: { init: (elements: NodeListOf<Element> | Element[], options?: Record<string, unknown>) => void } };
    if (typeof window !== 'undefined' && w.VanillaTilt) {
      const VanillaTilt = w.VanillaTilt;
      VanillaTilt.init(cards, {
        max: 15,
        speed: 400,
        glare: true,
        "max-glare": 0.15,
      });
    }
  }

  private observeContent(content: HTMLElement): void {
    if (this.resizeObservers.has(content)) return;

    const ro = new ResizeObserver(() => {
      // If expanded, keep max-height unrestricted
      if (content.classList.contains('active')) {
        content.style.maxHeight = 'none';
      }
    });

    ro.observe(content);
    this.resizeObservers.set(content, ro);
  }

  private unobserveContent(content: HTMLElement): void {
    const ro = this.resizeObservers.get(content);
    if (ro) {
      ro.disconnect();
      this.resizeObservers.delete(content);
    }
  }
}
