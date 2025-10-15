/**
 * Awards Accordion Manager
 * Handles expanding/collapsing of year groups in the awards section
 */
export class AwardsAccordion {
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
      header.classList.remove('active');
      content.classList.remove('active');
    } else {
      // Expand
      header.classList.add('active');
      content.classList.add('active');
      
      // Re-initialize tilt for newly visible cards
      setTimeout(() => {
        this.initializeTiltForVisibleCards(content);
      }, 100);
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
}
