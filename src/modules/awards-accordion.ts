/**
 * Awards Accordion Manager
 * Handles expanding/collapsing of year groups in the awards section
 */
export class AwardsAccordion {
  private resizeObservers: WeakMap<HTMLElement, ResizeObserver> = new WeakMap();

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
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        content.offsetHeight;
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

  private initializeTiltForVisibleCards(container: HTMLElement): void {
    const cards = container.querySelectorAll('.achievement-card');
    
    // Import VanillaTilt dynamically if needed
    if (typeof window !== 'undefined' && (window as any).VanillaTilt) {
      const VanillaTilt = (window as any).VanillaTilt;
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
