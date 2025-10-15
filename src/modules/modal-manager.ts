import type { AchievementData, ProjectData } from '@/types';

/**
 * Modal Manager Module
 * Handles modal dialogs for projects and achievements.
 */
export class ModalManager {
  private modalEl: HTMLElement | null = null;
  private imgEl: HTMLImageElement | null = null;
  private titleEl: HTMLElement | null = null;
  private descEl: HTMLElement | null = null;
  private organizerEl: HTMLElement | null = null;
  private dateLocEl: HTMLElement | null = null;
  private images: string[] = [];
  private currentIndex = 0;

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const achievementCards = document.querySelectorAll('.achievement-card');
    console.log('Found achievement cards:', achievementCards.length);
    
    achievementCards.forEach(card => {
      card.addEventListener('click', () => {
        console.log('Achievement card clicked!');
        const achievementData = this.getAchievementData(card as HTMLElement);
        console.log('Achievement data:', achievementData);
        if (achievementData) {
          this.openAchievementModal(achievementData);
        }
      });
    });

    // Setup project eye icon clicks
    const projectItems = document.querySelectorAll('.project-item');
    console.log('Found project items:', projectItems.length);
    
    projectItems.forEach(item => {
      const eyeIcon = item.querySelector('.project-item-icon-box');
      if (eyeIcon) {
        eyeIcon.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Project eye icon clicked!');
          const projectData = this.getProjectData(item as HTMLElement);
          console.log('Project data:', projectData);
          if (projectData) {
            this.openProjectModal(projectData);
          }
        });
      }
    });

    // Cache modal elements
    this.modalEl = document.getElementById('achievementModal');
    this.imgEl = document.querySelector('.achievement-slide-image');
    this.titleEl = document.querySelector('.achievement-title-modal');
    this.descEl = document.querySelector('.achievement-desc-modal');
    this.organizerEl = document.querySelector('.achievement-organizer');
    this.dateLocEl = document.querySelector('.achievement-date-location');

    // Close button
    const closeBtn = document.querySelector('.achievement-modal-close');
    closeBtn?.addEventListener('click', () => this.closeAchievementModal());
    
    // Close on backdrop click
    this.modalEl?.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.closeAchievementModal();
      }
    });
    
    // Prev/Next
    document.querySelector('.achievement-slider-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateAchievementPrevious();
    });
    document.querySelector('.achievement-slider-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateAchievementNext();
    });
  }

  private getAchievementData(element: HTMLElement): AchievementData | null {
    const title = element.querySelector('.card-title')?.textContent || '';
    const imagesStr = element.getAttribute('data-images') || '[]';
    const webpImagesStr = element.getAttribute('data-webp-images') || '[]';
    const organizer = element.getAttribute('data-organizer') || '';
    const date = element.getAttribute('data-date') || '';
    const location = element.getAttribute('data-location') || '';

    try {
      const images = JSON.parse(imagesStr);
      const webpImages = JSON.parse(webpImagesStr);
      
      return {
        title,
        images,
        webpImages,
        organizer,
        date,
        location,
      };
    } catch (e) {
      console.error('Error parsing achievement data:', e);
      return null;
    }
  }

  public openAchievementModal(data: AchievementData): void {
    console.log('Opening achievement modal with data:', data);
    
    // Use WebP if supported, fallback to regular images
    const supportsWebp = document.documentElement.classList.contains('webp');
    this.images = supportsWebp && data.webpImages.length > 0 ? data.webpImages : data.images;
    this.currentIndex = 0;

    console.log('Modal element:', this.modalEl);
    console.log('Images to display:', this.images);

    if (this.titleEl) this.titleEl.textContent = data.title;
    if (this.organizerEl) this.organizerEl.textContent = data.organizer;
    if (this.dateLocEl) this.dateLocEl.textContent = `${data.date}${data.location ? ' • ' + data.location : ''}`;

    // Show/hide slider controls based on number of images
    const sliderControls = document.querySelector('.achievement-slider-controls') as HTMLElement;
    if (sliderControls) {
      sliderControls.style.display = this.images.length > 1 ? 'flex' : 'none';
    }

    this.updateImage();
    
    if (this.modalEl) {
      this.modalEl.classList.add('active');
      console.log('Modal class list after adding active:', this.modalEl.classList);
    }
    
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  private getProjectData(element: HTMLElement): ProjectData | null {
    const title = element.querySelector('.project-title')?.textContent || '';
    const category = element.querySelector('.project-category')?.textContent || '';
    const imagesStr = element.getAttribute('data-images') || '[]';
    const webpImagesStr = element.getAttribute('data-webp-images') || '[]';
    const description = element.getAttribute('data-description') || '';
    const technologies = element.getAttribute('data-technologies') || '';
    const githubUrl = element.getAttribute('data-github') || '';
    const liveUrl = element.getAttribute('data-live') || '';

    try {
      const images = JSON.parse(imagesStr);
      const webpImages = JSON.parse(webpImagesStr);
      
      return {
        title,
        category,
        images,
        webpImages,
        description,
        technologies,
        githubUrl,
        liveUrl,
      };
    } catch (e) {
      console.error('Error parsing project data:', e);
      return null;
    }
  }

  public openProjectModal(data: ProjectData): void {
    console.log('Opening project modal for:', data.title);
    
    // Use WebP if supported, fallback to regular images
    const supportsWebp = document.documentElement.classList.contains('webp');
    this.images = supportsWebp && data.webpImages.length > 0 ? data.webpImages : data.images;
    this.currentIndex = 0;

    if (this.titleEl) this.titleEl.textContent = data.title;
    if (this.organizerEl) this.organizerEl.textContent = data.category;
    if (this.descEl) this.descEl.textContent = data.description;
    if (this.dateLocEl) this.dateLocEl.textContent = data.technologies;

    // Show/hide slider controls based on number of images
    const sliderControls = document.querySelector('.achievement-slider-controls') as HTMLElement;
    if (sliderControls) {
      sliderControls.style.display = this.images.length > 1 ? 'flex' : 'none';
    }

    this.updateImage();
    
    if (this.modalEl) {
      this.modalEl.classList.add('active');
      console.log('Modal opened for project:', data.title);
    }
    
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  public closeAchievementModal(): void {
    this.modalEl?.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  }

  public navigateAchievementPrevious(): void {
    if (this.images.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateImage();
  }

  public navigateAchievementNext(): void {
    if (this.images.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateImage();
  }

  private updateImage(): void {
    if (!this.imgEl) return;
    const img = this.imgEl;
    const src = this.images[this.currentIndex] || '';
    // Fade out, swap, fade in
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = src;
      img.onload = () => {
        requestAnimationFrame(() => (img.style.opacity = '1'));
      };
    }, 120);
  }
}
