
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
          // Optional: Stop observing once revealed
          // this.observer.unobserve(entry.target); 
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
    // Select all elements to be revealed
    // We can add the 'reveal' class to sections, cards, headers, etc.
    const elements = document.querySelectorAll('.reveal, article, .content-card, .timeline-item');
    elements.forEach((el) => {
      el.classList.add('reveal'); // Ensure they have the base class
      this.observer.observe(el);
    });
  }
}
