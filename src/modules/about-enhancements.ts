/**
 * About Section Enhancements
 * Adds interactive effects and animations to the About page
 */
export class AboutEnhancements {
  constructor() {
    this.init();
  }

  private init(): void {
    this.setupServiceItemHover();
    this.setupSkillsObserver();
  }

  /**
   * Add mouse tracking effect to service items
   */
  private setupServiceItemHover(): void {
    const serviceItems = document.querySelectorAll('.service-item');
    
    serviceItems.forEach(item => {
      item.addEventListener('mousemove', (e: Event) => {
        const rect = (item as HTMLElement).getBoundingClientRect();
        const x = (e as MouseEvent).clientX - rect.left;
        const y = (e as MouseEvent).clientY - rect.top;
        
        (item as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
        (item as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  /**
   * Animate skills progress bars when they come into view
   */
  private setupSkillsObserver(): void {
    const skillsSection = document.querySelector('.skills');
    
    if (!skillsSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const skillBars = skillsSection.querySelectorAll('.skill-progress-fill');
            
            skillBars.forEach((bar, index) => {
              setTimeout(() => {
                (bar as HTMLElement).style.animation = 'skillProgress 1.5s ease-out forwards';
              }, index * 100);
            });
            
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2
      }
    );

    observer.observe(skillsSection);
  }
}
