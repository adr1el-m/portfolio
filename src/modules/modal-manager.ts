import type { AchievementData, ProjectData } from '@/types';
import { logger } from '@/config';
import { SecurityManager } from '@/modules/security';

/**
 * Modal Manager Module
 * Handles modal dialogs for projects and achievements.
 */
export class ModalManager {
  private modalEl: HTMLElement | null = null;
  private imgEl: HTMLImageElement | null = null;
  private titleEl: HTMLElement | null = null;
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
    logger.log('Found achievement cards:', achievementCards.length);
    
    achievementCards.forEach(card => {
      card.addEventListener('click', () => {
        logger.log('Achievement card clicked!');
        const achievementData = this.getAchievementData(card as HTMLElement);
        logger.log('Achievement data:', achievementData);
        if (achievementData) {
          this.openAchievementModal(achievementData);
        }
      });
    });

    // Setup project eye icon clicks
    const projectItems = document.querySelectorAll('.project-item');
    logger.log('Found project items:', projectItems.length);
    
    projectItems.forEach(item => {
      const eyeIcon = item.querySelector('.project-item-icon-box');
      if (eyeIcon) {
        eyeIcon.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          logger.log('Project eye icon clicked!');
          const projectData = this.getProjectData(item as HTMLElement);
          logger.log('Project data:', projectData);
          if (projectData) {
            this.openProjectModal(projectData);
          }
        });
      }
    });

    // Cache achievement modal elements
    this.modalEl = document.getElementById('achievementModal');
    this.imgEl = document.querySelector('.achievement-slide-image');
    this.titleEl = document.querySelector('.achievement-title-modal');
    this.organizerEl = document.querySelector('.achievement-organizer');
    this.dateLocEl = document.querySelector('.achievement-date-location');

    // Achievement modal close button
    const achievementCloseBtn = document.querySelector('.achievement-modal-close');
    achievementCloseBtn?.addEventListener('click', () => this.closeAchievementModal());
    
    // Achievement modal backdrop click
    this.modalEl?.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.closeAchievementModal();
      }
    });
    
    // Achievement modal Prev/Next
    document.querySelector('.achievement-slider-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateAchievementPrevious();
    });
    document.querySelector('.achievement-slider-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateAchievementNext();
    });

    // Setup project modal event listeners
    this.setupProjectModalListeners();
  }

  private setupProjectModalListeners(): void {
    const projectModal = document.getElementById('projectModal');
    const projectCloseBtn = document.querySelector('.project-modal-close');
    const projectPrevBtn = document.querySelector('.project-gallery-prev');
    const projectNextBtn = document.querySelector('.project-gallery-next');

    // Project modal close button
    projectCloseBtn?.addEventListener('click', () => this.closeProjectModal());
    
    // Project modal backdrop click
    projectModal?.addEventListener('click', (e) => {
      if (e.target === projectModal) {
        this.closeProjectModal();
      }
    });

    // Project modal Previous button
    projectPrevBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateProjectPrevious();
    });

    // Project modal Next button
    projectNextBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateProjectNext();
    });
  }

  private getAchievementData(element: HTMLElement): AchievementData | null {
    const title = element.querySelector('.card-title')?.textContent || '';
    const imagesStr = element.getAttribute('data-images') || '[]';
    const webpImagesStr = element.getAttribute('data-webp-images') || '[]';
    const organizer = element.getAttribute('data-organizer') || '';
    const date = element.getAttribute('data-date') || '';
    const location = element.getAttribute('data-location') || '';
    const teammatesStr = element.getAttribute('data-teammates') || '[]';
    const githubUrl = element.getAttribute('data-github') || '';

    try {
      const images = JSON.parse(imagesStr);
      const webpImages = JSON.parse(webpImagesStr);
      const teammates = JSON.parse(teammatesStr);
      
      return {
        title,
        images,
        webpImages,
        organizer,
        date,
        location,
        teammates: teammates.length > 0 ? teammates : undefined,
        githubUrl: githubUrl || undefined,
      };
    } catch (e) {
      logger.error('Error parsing achievement data:', e);
      return null;
    }
  }

  public openAchievementModal(data: AchievementData): void {
    logger.log('Opening achievement modal with data:', data);
    
    // Use WebP if supported, fallback to regular images
    const supportsWebp = document.documentElement.classList.contains('webp');
    this.images = supportsWebp && data.webpImages.length > 0 ? data.webpImages : data.images;
    this.currentIndex = 0;

    logger.log('Modal element:', this.modalEl);
    logger.log('Images to display:', this.images);

    if (this.titleEl) this.titleEl.textContent = data.title;
    if (this.organizerEl) this.organizerEl.textContent = data.organizer;
    if (this.dateLocEl) this.dateLocEl.textContent = `${data.date}${data.location ? ' • ' + data.location : ''}`;

    // Handle teammates section
    this.displayTeammates(data.teammates);

    // Handle GitHub button
    this.displayGithubButton(data.githubUrl);

    // Show/hide slider controls based on number of images
    const sliderControls = document.querySelector('.achievement-slider-controls') as HTMLElement;
    if (sliderControls) {
      sliderControls.style.display = this.images.length > 1 ? 'flex' : 'none';
    }

    // Ensure the image container is clean from any previous error/skeleton overlays
    const sliderContainer = document.querySelector('.achievement-slider') as HTMLElement;
    if (sliderContainer) {
      const errorPlaceholder = sliderContainer.querySelector('.image-error-placeholder');
      if (errorPlaceholder) errorPlaceholder.remove();
      const loadingSkeleton = sliderContainer.querySelector('.image-loading-skeleton');
      if (loadingSkeleton) loadingSkeleton.remove();
      const globalSkeleton = sliderContainer.querySelector('.image-skeleton');
      if (globalSkeleton) globalSkeleton.remove();
    }

    // Reset image element state and force eager loading while modal is visible
    if (this.imgEl) {
      this.imgEl.style.display = 'block';
      this.imgEl.classList.remove('image-error');
      this.imgEl.setAttribute('loading', 'eager');
      this.imgEl.alt = `${data.title} - Image ${this.currentIndex + 1}`;
    }

    this.updateImage();
    
    if (this.modalEl) {
      this.modalEl.classList.add('active');
      logger.log('Modal class list after adding active:', this.modalEl.classList);
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
    const videoUrl = element.getAttribute('data-video') || '';

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
        videoUrl: videoUrl || undefined,
        githubUrl,
        liveUrl,
      };
    } catch (e) {
      logger.error('Error parsing project data:', e);
      return null;
    }
  }

  public openProjectModal(data: ProjectData): void {
    logger.log('Opening project modal for:', data.title);
    
    // Use WebP if supported, fallback to regular images
    const supportsWebp = document.documentElement.classList.contains('webp');
    this.images = supportsWebp && data.webpImages.length > 0 ? data.webpImages : data.images;
    this.currentIndex = 0;

    // Get project modal elements
    const projectModal = document.getElementById('projectModal');
    const projectImage = document.getElementById('project-modal-image') as HTMLImageElement;
    const projectTitle = document.getElementById('project-modal-title');
    const projectDescription = document.querySelector('.project-info-description');
    const projectTechStack = document.querySelector('.tech-stack');
    const projectGithub = document.querySelector('.project-github') as HTMLAnchorElement;
    const projectLive = document.querySelector('.project-live') as HTMLAnchorElement;
    const currentImageNum = document.querySelector('.current-image-number');
    const totalImagesNum = document.querySelector('.total-images');
    const imageContainer = document.querySelector('.project-gallery-image-container') as HTMLElement;

    // Clean up any image error placeholders that may overlay the media container
    if (imageContainer) {
      const errorPlaceholder = imageContainer.querySelector('.image-error-placeholder');
      if (errorPlaceholder) errorPlaceholder.remove();
      const skeleton = imageContainer.querySelector('.image-loading-skeleton');
      if (skeleton) skeleton.remove();
    }

    // Set project data
    if (projectTitle) projectTitle.textContent = data.title;
    if (projectDescription) projectDescription.textContent = data.description;
    if (projectTechStack) projectTechStack.textContent = data.technologies;
    
    // Update image counter
    if (currentImageNum) currentImageNum.textContent = '1';
    if (totalImagesNum) totalImagesNum.textContent = this.images.length.toString();

    // Show media controls (image slider or video)
    const prevBtn = document.querySelector('.project-gallery-prev') as HTMLElement;
    const nextBtn = document.querySelector('.project-gallery-next') as HTMLElement;
    const counter = document.querySelector('.project-gallery-counter') as HTMLElement;
    const projectVideo = document.getElementById('project-modal-video') as HTMLVideoElement;

    if (data.videoUrl) {
      // Hide slider controls when video is present
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (counter) counter.style.display = 'none';
    } else {
      if (this.images.length > 1) {
        if (prevBtn) prevBtn.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'flex';
        if (counter) counter.style.display = 'block';
      } else {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (counter) counter.style.display = 'none';
      }
    }

    // Handle GitHub link
    if (projectGithub) {
      if (data.githubUrl) {
        projectGithub.href = data.githubUrl;
        projectGithub.style.display = 'inline-flex';
      } else {
        projectGithub.style.display = 'none';
      }
    }

    // Handle Live Demo link
    if (projectLive) {
      if (data.liveUrl) {
        projectLive.href = data.liveUrl;
        projectLive.style.display = 'inline-flex';
      } else {
        projectLive.style.display = 'none';
      }
    }

    // Set initial media (video or image)
    if (data.videoUrl && projectVideo) {
      // Show video, hide image
      if (projectImage) {
        projectImage.style.display = 'none';
        projectImage.src = '';
        projectImage.classList.remove('image-error');
      }
      projectVideo.style.display = 'block';
      projectVideo.src = data.videoUrl;
      projectVideo.load();
    } else if (projectImage && this.images.length > 0) {
      // Show image, hide video
      if (projectVideo) {
        projectVideo.pause();
        projectVideo.removeAttribute('src');
        projectVideo.load();
        projectVideo.style.display = 'none';
      }
      projectImage.style.display = 'block';
      projectImage.src = this.images[0];
      projectImage.alt = `${data.title} - Screenshot 1`;
    }

    // Show modal
    if (projectModal) {
      projectModal.style.display = 'flex';
      logger.log('Modal opened for project:', data.title);
    }
    
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  private closeProjectModal(): void {
    const projectModal = document.getElementById('projectModal');
    if (projectModal) {
      projectModal.style.display = 'none';
    }
    document.body.style.overflow = ''; // Restore scrolling
  }

  private navigateProjectPrevious(): void {
    if (this.images.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateProjectImage();
  }

  private navigateProjectNext(): void {
    if (this.images.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateProjectImage();
  }

  private updateProjectImage(): void {
    const projectImage = document.getElementById('project-modal-image') as HTMLImageElement;
    const currentImageNum = document.querySelector('.current-image-number');
    
    if (!projectImage) return;
    
    const src = this.images[this.currentIndex] || '';
    
    // Update image with fade effect
    projectImage.style.opacity = '0';
    setTimeout(() => {
      projectImage.src = src;
      projectImage.onload = () => {
        requestAnimationFrame(() => {
          projectImage.style.opacity = '1';
        });
      };
    }, 150);

    // Update counter
    if (currentImageNum) {
      currentImageNum.textContent = (this.currentIndex + 1).toString();
    }
  }

  private displayTeammates(teammates?: Array<{name: string; role?: string}>): void {
    const teammatesSection = document.querySelector('.achievement-teammates') as HTMLElement;
    const teammatesList = document.querySelector('.teammates-list') as HTMLElement;
    
    if (!teammatesSection || !teammatesList) return;
    
    if (!teammates || teammates.length === 0) {
      teammatesSection.style.display = 'none';
      return;
    }
    
    teammatesSection.style.display = 'block';
    teammatesList.textContent = '';
    // Build teammate items using safe DOM APIs
    teammates.forEach((teammate) => {
      const initials = teammate.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      const teammateEl = document.createElement('div');
      teammateEl.className = 'teammate-item';
      
      const avatarEl = document.createElement('div');
      avatarEl.className = 'teammate-avatar';
      avatarEl.textContent = initials;
      
      const infoEl = document.createElement('div');
      infoEl.className = 'teammate-info';
      
      const nameEl = document.createElement('h5');
      nameEl.className = 'teammate-name';
      nameEl.textContent = teammate.name;
      infoEl.appendChild(nameEl);
      
      if (teammate.role) {
        const roleEl = document.createElement('p');
        roleEl.className = 'teammate-role';
        roleEl.textContent = teammate.role;
        infoEl.appendChild(roleEl);
      }
      
      teammateEl.appendChild(avatarEl);
      teammateEl.appendChild(infoEl);
      teammatesList.appendChild(teammateEl);
    });
  }

  private displayGithubButton(githubUrl?: string): void {
    const githubSection = document.querySelector('.achievement-github') as HTMLElement;
    
    if (!githubSection) return;
    
    if (!githubUrl) {
      githubSection.style.display = 'none';
      return;
    }
    
    githubSection.style.display = 'block';
    githubSection.textContent = '';
    const link = SecurityManager.createSafeAnchor(githubUrl, 'Visit Project on GitHub', 'github-button', true);
    const icon = document.createElement('ion-icon');
    icon.setAttribute('name', 'logo-github');
    link.prepend(icon);
    githubSection.appendChild(link);
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
    
    // Show loading skeleton
    const slider = img.parentElement;
    if (slider) {
      this.showImageLoader(slider);
      // Also ensure any lingering error placeholders are removed
      const errorPlaceholder = slider.querySelector('.image-error-placeholder');
      if (errorPlaceholder) errorPlaceholder.remove();
    }
    
    // Fade out, swap, fade in
    img.style.opacity = '0';
    img.style.display = 'block';
    setTimeout(() => {
      img.src = src;
      img.onload = () => {
        this.hideImageLoader(slider);
        requestAnimationFrame(() => (img.style.opacity = '1'));
      };
      img.onerror = () => {
        this.hideImageLoader(slider);
        logger.error('Failed to load image:', src);
        // Make sure image remains visible for a retry if needed
        img.style.display = 'block';
      };
    }, 120);
  }

  /**
   * Show image loading skeleton
   */
  private showImageLoader(container: HTMLElement | null): void {
    if (!container || container.querySelector('.image-loading-skeleton')) return;
    
    const skeleton = document.createElement('div');
    skeleton.className = 'image-loading-skeleton shimmer';
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
      border-radius: 12px;
      z-index: 5;
    `;
    
    container.appendChild(skeleton);
  }

  /**
   * Hide image loading skeleton
   */
  private hideImageLoader(container: HTMLElement | null): void {
    if (!container) return;
    
    const skeleton = container.querySelector('.image-loading-skeleton');
    if (skeleton) {
      skeleton.classList.add('fade-out');
      setTimeout(() => skeleton.remove(), 300);
    }
  }
}
