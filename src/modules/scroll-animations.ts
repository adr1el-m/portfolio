
/**
 * Handles scroll-triggered animations using IntersectionObserver.
 * Adds 'active' class to elements with 'reveal' class when they enter the viewport.
 */
export class ScrollAnimations {
  private observer: IntersectionObserver;

  constructor() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          this.observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.15
    });

    this.init();
  }

  private init(): void {
    // Only observe elements that opted into a reveal before first paint.
    // Adding .reveal to already-visible cards here makes them briefly blink out.
    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => {
      this.observer.observe(el);
    });
  }
}
