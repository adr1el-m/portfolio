import type { AchievementData, ProjectData } from '@/types';
import { logger } from '@/config';
import { SecurityManager } from '@/modules/security';
import { setPortfolioContext } from '@/modules/portfolio-actions';
import { renderProjectDescription } from '@/data/project-case-studies';
import { getProjectProof } from '@/data/project-profiles';

const TRANSPARENT_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const ICONS = {
  external: '<svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>',
  document: '<svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M8 13h8"></path><path d="M8 17h5"></path></svg>',
  edit: '<svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>',
  trophy: '<svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 22"></path><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 22"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M6 2h12v7a6 6 0 0 1-12 0Z"></path><path d="M6 22h12"></path></svg>',
  collection: '<svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 8h11"></path><path d="M10 12h11"></path><path d="M10 16h11"></path><path d="M3 8h.01"></path><path d="M3 12h.01"></path><path d="M3 16h.01"></path></svg>',
  link: '<svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.43"></path><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.33-1.33"></path></svg>',
  article: '<svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22h16"></path><path d="M6 2h9l5 5v13H6z"></path><path d="M14 2v6h6"></path><path d="M9 13h6"></path><path d="M9 17h6"></path></svg>',
};

/**
 * Modal Manager Module
 * Handles modal dialogs for projects and achievements.
 */
export class ModalManager {
  private modalEl: HTMLElement | null = null;
  private imgEl: HTMLImageElement | null = null;
  private achievementSourceWebpEl: HTMLSourceElement | null = null;
  private achievementSourceJpegEl: HTMLSourceElement | null = null;
  private projectSourceWebpEl: HTMLSourceElement | null = null;
  private projectSourceJpegEl: HTMLSourceElement | null = null;
  private titleEl: HTMLElement | null = null;
  private organizerEl: HTMLElement | null = null;
  private dateLocEl: HTMLElement | null = null;
  private images: string[] = [];
  private currentIndex = 0;
  private achievementWebpImages: string[] = [];
  private achievementJpegImages: string[] = [];
  private projectWebpImages: string[] = [];
  private projectJpegImages: string[] = [];
  private previousFocus: HTMLElement | null = null;
  private preloadedImages: Set<string> = new Set();

  constructor() {
    this.init();
  }

  /**
   * Preload images for smoother navigation
   */
  private preloadImages(imagePaths: string[]): void {
    imagePaths.forEach((src) => {
      if (this.preloadedImages.has(src)) return;
      
      const img = new Image();
      img.src = src;
      img.onload = () => {
        this.preloadedImages.add(src);
        logger.log(`Preloaded image: ${src}`);
      };
      img.onerror = () => {
        // If optimized version fails, the modal will fallback to original
        logger.warn(`Failed to preload: ${src}`);
      };
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private normalizeTitle(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private renderStructuredDescription(description?: string): string | null {
    if (!description) return null;

    const allowedLabels = new Set([
      'Recognition',
      'Participation',
      'Scope',
      'Contribution',
      'Purpose',
      'Team',
      'Build',
      'Outcome',
    ]);
    const rows = description
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([A-Za-z ]+):\s*(.+)$/);
        if (!match) return null;
        const label = match[1].trim();
        if (!allowedLabels.has(label)) return null;
        return { label, body: match[2].trim() };
      });

    if (!rows.length || rows.some((row) => row === null)) return null;

    return `<div class="structured-description">${rows.map((row) => {
      const item = row as { label: string; body: string };
      return `<section class="structured-description-item">
        <span class="structured-description-label">${this.escapeHtml(item.label)}</span>
        <p>${this.escapeHtml(item.body)}</p>
      </section>`;
    }).join('')}</div>`;
  }

  private renderAchievementEvidence(data: AchievementData): void {
    const evidence = document.querySelector<HTMLElement>('.achievement-evidence');
    if (!evidence) return;

    const summary = evidence.querySelector<HTMLElement>('.achievement-evidence-summary');
    const list = evidence.querySelector<HTMLUListElement>('.achievement-evidence-list');
    const copyButton = evidence.querySelector<HTMLButtonElement>('.achievement-copy-link');
    const status = evidence.querySelector<HTMLElement>('.achievement-copy-status');
    const card = Array.from(document.querySelectorAll<HTMLElement>('.achievement-card')).find((item) => {
      const title = item.querySelector('.card-title')?.textContent?.trim() || '';
      return this.normalizeTitle(title) === this.normalizeTitle(data.title);
    });
    const directPath = card?.dataset.honorPath || window.location.pathname;
    const directUrl = new URL(directPath, window.location.origin).href;
    const proofCount = new Set([...(data.images || []), ...(data.webpImages || [])]).size;
    const facts = [
      data.organizer ? `Organizer: ${data.organizer}` : '',
      data.date ? `Date: ${data.date}` : '',
      data.location ? `Location: ${data.location}` : '',
      proofCount ? `${proofCount} portfolio proof ${proofCount === 1 ? 'asset' : 'assets'} in the gallery` : 'Portfolio record with event details',
    ].filter(Boolean);

    if (summary) {
      summary.textContent = 'This detail page is grounded in the portfolio record and its attached proof media.';
    }
    if (list) {
      list.replaceChildren(...facts.map((fact) => {
        const item = document.createElement('li');
        item.textContent = fact;
        return item;
      }));
    }
    if (status) status.textContent = '';
    if (copyButton) {
      copyButton.onclick = () => {
        const confirm = () => {
          if (status) status.textContent = 'Evidence link copied.';
        };
        if (navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(directUrl).then(confirm).catch(() => this.copyEvidenceLinkFallback(directUrl, confirm));
        } else {
          this.copyEvidenceLinkFallback(directUrl, confirm);
        }
      };
    }
  }

  private copyEvidenceLinkFallback(value: string, onCopied: () => void): void {
    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try {
      if (document.execCommand('copy')) onCopied();
    } finally {
      input.remove();
    }
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

    // Make the entire project card anchor act as a button trigger without fake navigation
    projectItems.forEach(item => {
      const trigger = item.querySelector('a[href="#"]') as HTMLAnchorElement | null;
      if (!trigger) return;

      // Improve semantics for assistive technologies
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', 'projectModal');
      const projectTitle = item.querySelector('.project-title')?.textContent?.trim();
      trigger.setAttribute('aria-label', projectTitle ? `View details for ${projectTitle}` : 'View project details');

      // Resolve placeholder href to a meaningful destination for SEO
      const liveUrl = (item as HTMLElement).getAttribute('data-live')?.trim() || '';
      const githubUrl = (item as HTMLElement).getAttribute('data-github')?.trim() || '';
      const isHttp = (u: string) => /^https?:\/\//i.test(u);
      let canonicalHref = '#projects';
      if (isHttp(liveUrl)) {
        canonicalHref = liveUrl;
      } else if (isHttp(githubUrl)) {
        canonicalHref = githubUrl;
      }
      trigger.setAttribute('href', canonicalHref);
      if (isHttp(canonicalHref)) {
        trigger.setAttribute('target', '_blank');
        trigger.setAttribute('rel', 'noopener noreferrer');
      }

      const openFromTrigger = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const projectData = this.getProjectData(item as HTMLElement);
        if (projectData) {
          this.openProjectModal(projectData);
        }
      };

      trigger.addEventListener('click', openFromTrigger);
      trigger.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFromTrigger(e);
        }
      });
    });

    // Cache achievement modal elements
    this.modalEl = document.getElementById('achievementModal');
    this.imgEl = document.querySelector('.achievement-slide-image');
    this.achievementSourceWebpEl = document.querySelector('.achievement-image-webp');
    this.achievementSourceJpegEl = document.querySelector('.achievement-image-jpeg');
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

    window.addEventListener('portfolio:open-project', (event) => {
      const detail = (event as CustomEvent<{ title?: string }>).detail;
      this.openProjectByTitle(detail?.title || '');
    });

    window.addEventListener('portfolio:open-honor-modal', (event) => {
      const detail = (event as CustomEvent<{ title?: string }>).detail;
      this.openAchievementByTitle(detail?.title || '');
    });
  }

  public openProjectByTitle(title: string): boolean {
    const needle = this.normalizeTitle(title);
    if (!needle) return false;

    const target = Array.from(document.querySelectorAll<HTMLElement>('.project-item')).find((item) => {
      const itemTitle = item.querySelector('.project-title')?.textContent?.trim() || '';
      const normalized = this.normalizeTitle(itemTitle);
      return normalized.includes(needle) || needle.includes(normalized);
    });

    if (!target) return false;
    const data = this.getProjectData(target);
    if (!data) return false;

    this.openProjectModal(data);
    return true;
  }

  public openAchievementByTitle(title: string): boolean {
    const needle = this.normalizeTitle(title);
    if (!needle) return false;

    const target = Array.from(document.querySelectorAll<HTMLElement>('.achievement-card')).find((card) => {
      const cardTitle = card.querySelector('.card-title')?.textContent?.trim() || '';
      const normalized = this.normalizeTitle(cardTitle);
      return normalized.includes(needle) || needle.includes(normalized);
    });

    if (!target) return false;
    const data = this.getAchievementData(target);
    if (!data) return false;

    this.openAchievementModal(data);
    return true;
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
    const description = element.getAttribute('data-description') || '';
    const projectTitle = element.getAttribute('data-project-title') || '';
    const liveUrl = element.getAttribute('data-live') || '';
    const linkedinUrl = element.getAttribute('data-linkedin') || '';
    const blogUrl = element.getAttribute('data-blog') || '';
    const facebookUrl = element.getAttribute('data-facebook') || '';

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
        description: description || undefined,
        projectTitle: projectTitle || undefined,
        liveUrl: liveUrl || undefined,
        linkedinUrl: linkedinUrl || undefined,
        blogUrl: blogUrl || undefined,
        facebookUrl: facebookUrl || undefined,
      };
    } catch (e) {
      logger.error('Error parsing achievement data:', e);
      return null;
    }
  }

  public openAchievementModal(data: AchievementData): void {
    logger.log('Opening achievement modal with data:', data);
    setPortfolioContext('honor', data.title);
    this.previousFocus = document.activeElement as HTMLElement | null;
    
    // Ensure ARIA linkage between modal and title
    if (this.titleEl && !this.titleEl.id) {
      this.titleEl.id = 'achievement-modal-title';
    }
    if (this.modalEl) {
      this.modalEl.setAttribute('aria-labelledby', this.titleEl?.id || 'achievement-modal-title');
      this.modalEl.setAttribute('aria-hidden', 'false');
      this.modalEl.removeAttribute('inert');
      this.modalEl.setAttribute('tabindex', '-1');
    }

    const originalImages = data.images || [];
    const optimizedImages = data.webpImages || [];
    
    // Prefer explicitly provided optimized assets only; do not invent paths that may not exist.
    const supportsWebp = document.documentElement.classList.contains('webp');
    
    if (supportsWebp && optimizedImages.length > 0) {
      this.images = optimizedImages;
      this.achievementWebpImages = optimizedImages;
    } else {
      this.images = originalImages;
      this.achievementWebpImages = [];
    }
    this.achievementJpegImages = originalImages;
    this.currentIndex = 0;

    // Preload next images for smoother navigation
    this.preloadImages(this.images.slice(0, 3));

    logger.log('Modal element:', this.modalEl);
    logger.log('Images to display:', this.images);

    if (this.titleEl) this.titleEl.textContent = data.title;
    if (this.organizerEl) this.organizerEl.textContent = data.organizer;
    if (this.dateLocEl) this.dateLocEl.textContent = `${data.date}${data.location ? ' • ' + data.location : ''}`;
    this.renderAchievementEvidence(data);

    // New: add description content if present
    const descriptionEl = document.querySelector('.achievement-description') as HTMLElement;
    if (descriptionEl) {
      const structuredDescription = this.renderStructuredDescription(data.description);
      if (structuredDescription) {
        descriptionEl.classList.add('rich');
        descriptionEl.innerHTML = structuredDescription;
        descriptionEl.style.whiteSpace = '';
      } else {
        descriptionEl.classList.remove('rich');
        descriptionEl.textContent = data.description || '';
        descriptionEl.style.whiteSpace = data.description ? 'pre-line' : '';
      }
      descriptionEl.style.display = data.description ? '' : 'none';
    }

    // Prefer Facebook post button if provided; otherwise optional project button
    const infoSection = document.querySelector('.achievement-info') as HTMLElement;
    if (infoSection) {
      // Remove all previously added buttons to prevent stacking
      const existingButtons = infoSection.querySelectorAll('.related-project-button, .achievement-info > .github-button');
      existingButtons.forEach((btn) => btn.remove());

      const detailsBlock = infoSection.querySelector('.achievement-details');
      if (data.facebookUrl) {
        const fb = SecurityManager.createSafeAnchor(data.facebookUrl, 'View Facebook Post', 'github-button', true);
        const iconSpan = document.createElement('span');
        iconSpan.className = 'link-icon';
        iconSpan.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
        fb.prepend(iconSpan);
        if (detailsBlock && detailsBlock.parentElement) {
          detailsBlock.parentElement.insertBefore(fb, detailsBlock.nextSibling);
        } else {
          infoSection.appendChild(fb);
        }
      } else if (data.projectTitle) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'related-project-button';
        btn.textContent = `View project: ${data.projectTitle}`;
        btn.addEventListener('click', () => {
          const items = document.querySelectorAll('.project-item');
          let target: HTMLElement | null = null;
          items.forEach((item) => {
            const t = item.querySelector('.project-title')?.textContent?.trim();
            if (t === data.projectTitle) target = item as HTMLElement;
          });
          if (target) {
            const pd = this.getProjectData(target);
            if (pd) {
              this.closeAchievementModal();
              this.openProjectModal(pd);
            }
          } else {
            logger.warn(`Project "${data.projectTitle}" not found in list.`);
          }
        });
        if (detailsBlock && detailsBlock.parentElement) {
          detailsBlock.parentElement.insertBefore(btn, detailsBlock.nextSibling);
        } else {
          infoSection.appendChild(btn);
        }
      }
    }

    // Handle teammates section
    this.displayTeammates(data.teammates);

    // Handle action buttons
    {
      const isHackIt = data.title.trim() === 'Hack-it: The New Era of Banking Hackathon';
      const isBpi = data.title.trim() === 'BPI DataWave Hackathon 2025';
      const isTechnovation = data.title.trim() === 'Technovation Summit 2025 Start-up Hackathon';
      const isDlsu = data.title.trim() === 'De La Salle University Hackercup';
      const isAgentic = data.title.trim() === 'Agentic AI Hackathon 2025';
      const isCodebility = data.title.trim() === 'Codebility Portfolio Contest 2025';
      if (isHackIt || isBpi || isTechnovation || isDlsu || isAgentic || isCodebility) {
        this.displayHackItActions(data);
      } else {
        let gh = data.githubUrl;
        if (!gh && data.projectTitle) {
          const items = document.querySelectorAll('.project-item');
          items.forEach((item) => {
            const t = item.querySelector('.project-title')?.textContent?.trim();
            if (!gh && t === data.projectTitle) {
              // Prefer attribute directly to avoid parsing entire project data
              gh = (item as HTMLElement).getAttribute('data-github') || '';
              if (!gh) {
                const pd = this.getProjectData(item as HTMLElement);
                gh = pd?.githubUrl || '';
              }
            }
          });
        }
        // Render project/action links if available
        this.displayAchievementLinks({
          githubUrl: gh || undefined,
          liveUrl: data.liveUrl,
          linkedinUrl: data.linkedinUrl,
          blogUrl: data.blogUrl,
        });
        // Also render LinkedIn if present
        if (data.linkedinUrl && !data.liveUrl && !data.blogUrl && !gh) {
          const githubSection = document.querySelector('.achievement-github') as HTMLElement;
          if (githubSection) {
            githubSection.style.display = 'block';
            githubSection.textContent = '';
            const link = SecurityManager.createSafeAnchor(data.linkedinUrl, 'View LinkedIn Post', 'github-button', true);
            const icon = document.createElement('ion-icon');
            icon.setAttribute('name', 'logo-linkedin');
            link.prepend(icon);
            githubSection.appendChild(link);
          }
        }
      }
    }

    const mediaSection = document.querySelector('.achievement-media') as HTMLElement;
    const sliderControls = document.querySelector('.achievement-slider-controls') as HTMLElement;
    const sliderContainer = document.querySelector('.achievement-slider') as HTMLElement;

    // Ensure the image container is clean from any previous error/skeleton overlays
    if (sliderContainer) {
      const errorPlaceholder = sliderContainer.querySelector('.image-error-placeholder');
      if (errorPlaceholder) errorPlaceholder.remove();
      const loadingSkeleton = sliderContainer.querySelector('.image-loading-skeleton');
      if (loadingSkeleton) loadingSkeleton.remove();
      const globalSkeleton = sliderContainer.querySelector('.image-skeleton');
      if (globalSkeleton) globalSkeleton.remove();
    }

    if (this.images.length === 0) {
      // No images: hide media column and controls
      if (mediaSection) mediaSection.style.display = 'none';
      if (sliderControls) sliderControls.style.display = 'none';
      if (this.imgEl) {
        this.imgEl.style.display = 'none';
        this.imgEl.src = TRANSPARENT_PLACEHOLDER;
        this.imgEl.alt = '';
        this.imgEl.classList.remove('image-error');
        this.imgEl.removeAttribute('loading');
      }
    } else {
      // Images present: show media and initialize first image
      if (mediaSection) mediaSection.style.display = '';
      if (sliderControls) sliderControls.style.display = this.images.length > 1 ? 'flex' : 'none';

      // Reset image element state and force eager loading while modal is visible
      if (this.imgEl) {
        this.imgEl.style.display = 'block';
        this.imgEl.classList.remove('image-error');
        this.imgEl.setAttribute('loading', 'lazy');
        this.imgEl.alt = `${data.title} - Image ${this.currentIndex + 1}`;
      }

      this.updateImage();
    }
    
    if (this.modalEl) {
      this.modalEl.classList.add('active');
      (this.modalEl as HTMLElement).focus();
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
    const codedexUrl = element.getAttribute('data-codedex') || '';
    const videoUrl = element.getAttribute('data-video') || '';
    const docsUrl = element.getAttribute('data-docs') || '';

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
        codedexUrl: codedexUrl || undefined,
        docsUrl: docsUrl || undefined,
        proof: getProjectProof(title),
      };
    } catch (e) {
      logger.error('Error parsing project data:', e);
      return null;
    }
  }

  public openProjectModal(data: ProjectData): void {
    logger.log('Opening project modal for:', data.title);
    setPortfolioContext('project', data.title);
    this.previousFocus = document.activeElement as HTMLElement | null;
    
    // Use WebP if supported, fallback to regular images
    const supportsWebp = document.documentElement.classList.contains('webp');
    this.projectWebpImages = (data.webpImages || []).filter((p) => p.endsWith('.webp') || p.endsWith('.avif'));
    this.projectJpegImages = (data.images || []);
    this.images = supportsWebp && this.projectWebpImages.length > 0 ? this.projectWebpImages : this.projectJpegImages;
    this.currentIndex = 0;

    // Get project modal elements
    const projectModal = document.getElementById('projectModal');
    const projectImage = document.getElementById('project-modal-image') as HTMLImageElement;
    this.projectSourceWebpEl = document.querySelector('.project-image-webp');
    this.projectSourceJpegEl = document.querySelector('.project-image-jpeg');
    const projectTitle = document.getElementById('project-modal-title');
    const projectDescription = document.querySelector('.project-info-description');
    const projectTechStack = document.querySelector('.tech-stack');
    const projectGithub = document.querySelector('.project-github') as HTMLAnchorElement;
    const projectLive = document.querySelector('.project-live') as HTMLAnchorElement;

    // Ensure Codédex button exists in links container
    const linksContainer = document.querySelector('.project-info-links') as HTMLElement;
    let projectCodedex = document.querySelector('.project-codedex') as HTMLAnchorElement | null;
    if (linksContainer && !projectCodedex) {
      projectCodedex = document.createElement('a');
      projectCodedex.className = 'project-link project-codedex';
      projectCodedex.target = '_blank';
      projectCodedex.rel = 'noopener noreferrer';
      projectCodedex.setAttribute('aria-label', 'View Codédex post (opens in new tab)');
      projectCodedex.style.display = 'none';
      projectCodedex.innerHTML = `${ICONS.edit} View Codédex Post`;
      linksContainer.appendChild(projectCodedex);
    }
    let projectDevpost = document.querySelector('.project-devpost') as HTMLAnchorElement | null;
    if (linksContainer && !projectDevpost) {
      projectDevpost = document.createElement('a');
      projectDevpost.className = 'project-link project-devpost';
      projectDevpost.target = '_blank';
      projectDevpost.rel = 'noopener noreferrer';
      projectDevpost.setAttribute('aria-label', 'View Devpost submission (opens in new tab)');
      projectDevpost.style.display = 'none';
      projectDevpost.innerHTML = `${ICONS.trophy} Devpost Submission`;
      linksContainer.appendChild(projectDevpost);
    }

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

    // Update modal link buttons (GitHub/Live) based on project data
    const ghLink = document.querySelector('.project-link.project-github') as HTMLAnchorElement | null;
    const liveLink = document.querySelector('.project-link.project-live') as HTMLAnchorElement | null;
    if (ghLink) {
      if (data.githubUrl) {
        ghLink.href = data.githubUrl;
        ghLink.style.display = '';
      } else {
        ghLink.style.display = 'none';
      }
    }
    if (liveLink) {
      if (data.liveUrl) {
        const isVideoDemo = /youtube\.com|youtu\.be/i.test(data.liveUrl) || data.title.trim() === 'GeneSync';
        liveLink.href = data.liveUrl;
        liveLink.setAttribute('aria-label', isVideoDemo ? 'Watch demo video (opens in new tab)' : 'View live demo (opens in new tab)');
        liveLink.innerHTML = `${ICONS.external} ${isVideoDemo ? 'Demo Video' : 'Live Demo'}`;
        liveLink.style.display = '';
      } else {
        liveLink.style.display = 'none';
      }
    }
    const docsLink = document.querySelector('.project-link.project-docs') as HTMLAnchorElement | null;
    if (docsLink) {
      if (data.docsUrl) {
        docsLink.href = data.docsUrl;
        docsLink.innerHTML = `${ICONS.document} Documentation`;
        docsLink.style.display = '';
      } else {
        docsLink.style.display = 'none';
      }
    }
    const devpostLink = document.querySelector('.project-link.project-devpost') as HTMLAnchorElement | null;
    if (devpostLink) {
      if (data.title.trim() === 'FinanceWise') {
        devpostLink.href = 'https://devpost.com/software/financewise';
        devpostLink.style.display = '';
      } else {
        devpostLink.style.display = 'none';
      }
    }
    if (projectDescription) renderProjectDescription(projectDescription as HTMLElement, data);
    this.renderProjectProof(data);
    if (projectTechStack) projectTechStack.innerHTML = data.technologies;
    
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

    // Handle Codédex link (dynamic button)
    const codedexAnchor = document.querySelector('.project-codedex') as HTMLAnchorElement | null;
    if (codedexAnchor) {
      if (data.codedexUrl) {
        codedexAnchor.href = data.codedexUrl;
        codedexAnchor.style.display = 'inline-flex';
      } else {
        codedexAnchor.style.display = 'none';
      }
    }

    // Set initial media (video or image)
    if (data.videoUrl && projectVideo) {
      // Show video, hide image
      if (projectImage) {
        projectImage.style.display = 'none';
        projectImage.src = TRANSPARENT_PLACEHOLDER;
        projectImage.classList.remove('image-error');
      }
      projectVideo.style.display = 'block';
      projectVideo.poster = data.videoUrl.replace(/\.mp4(?:\?.*)?$/i, '.poster.jpg');
      projectVideo.src = data.videoUrl;
      projectVideo.load();
    } else if (projectImage && this.images.length > 0) {
      // Show image, hide video
      if (projectVideo) {
        projectVideo.pause();
        projectVideo.removeAttribute('src');
        projectVideo.removeAttribute('poster');
        projectVideo.load();
        projectVideo.style.display = 'none';
      }
      projectImage.style.display = 'block';
      const firstSrc = this.images[0];
      const firstWebp = this.projectWebpImages[0] || '';
      const firstJpeg = this.projectJpegImages[0] || firstSrc;

      if (this.projectSourceWebpEl) {
        if (firstWebp) {
          this.projectSourceWebpEl.srcset = firstWebp;
          this.projectSourceWebpEl.sizes = '(max-width: 768px) 95vw, 70vw';
        } else {
          this.projectSourceWebpEl.removeAttribute('srcset');
          this.projectSourceWebpEl.removeAttribute('sizes');
        }
      }
      if (this.projectSourceJpegEl) {
        if (firstJpeg) {
          this.projectSourceJpegEl.srcset = firstJpeg;
          this.projectSourceJpegEl.sizes = '(max-width: 768px) 95vw, 70vw';
        } else {
          this.projectSourceJpegEl.removeAttribute('srcset');
          this.projectSourceJpegEl.removeAttribute('sizes');
        }
      }

      projectImage.src = firstSrc;
      projectImage.srcset = firstJpeg;
      projectImage.sizes = '(max-width: 768px) 95vw, 70vw';
      projectImage.alt = `${data.title} - Screenshot 1`;
    }

    // Show modal
    if (projectModal) {
      projectModal.classList.add('active');
      projectModal.style.display = 'flex';
      projectModal.setAttribute('aria-hidden', 'false');
      projectModal.removeAttribute('inert');
      projectModal.setAttribute('tabindex', '-1');
      (projectModal as HTMLElement).focus();
      logger.log('Modal opened for project:', data.title);
    }
    
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  private renderProjectProof(data: ProjectData): void {
    const section = document.querySelector<HTMLElement>('.project-proof');
    if (!section) return;
    const proof = data.proof;
    if (!proof) {
      section.hidden = true;
      section.textContent = '';
      return;
    }
    section.hidden = false;
    const facts = [
      ['Role', proof.role], ['Team', proof.team], ['Timeframe', proof.timeframe],
      ['Constraint', proof.constraints], ['Outcome', proof.outcome], ['Architecture', proof.architecture],
    ];
    section.innerHTML = `<h3>Project proof</h3><dl>${facts.map(([label, value]) => `<div><dt>${this.escapeHtml(label)}</dt><dd>${this.escapeHtml(value)}</dd></div>`).join('')}</dl>${proof.evidence?.length ? `<div class="project-proof-links">${proof.evidence.map((item) => `<a href="${this.escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(item.label)} ↗</a>`).join('')}</div>` : ''}`;
  }

  private closeProjectModal(): void {
    const projectModal = document.getElementById('projectModal');
    const projectVideo = document.getElementById('project-modal-video') as HTMLVideoElement | null;

    // Stop and reset video audio when closing modal
    if (projectVideo) {
      try {
        projectVideo.pause();
        projectVideo.currentTime = 0;
        projectVideo.removeAttribute('src');
        projectVideo.load();
        projectVideo.style.display = 'none';
      } catch (e) {
        logger.error('Error stopping project video on close:', e);
      }
    }

    // Restore focus before hiding to avoid aria-hidden on focused descendants
    const active = document.activeElement as HTMLElement | null;
    if (projectModal && active && projectModal.contains(active)) {
      active.blur();
    }
    if (this.previousFocus) {
      try { this.previousFocus.focus(); } catch { /* ignore */ }
    }

    if (projectModal) {
      projectModal.classList.remove('active');
      projectModal.style.display = 'none';
      projectModal.setAttribute('aria-hidden', 'true');
      projectModal.setAttribute('inert', '');
    }
    this.previousFocus = null;
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
    const webpSrc = this.projectWebpImages[this.currentIndex] || '';
    const jpegSrc = this.projectJpegImages[this.currentIndex] || src;
    
    // Update image with fade effect
    projectImage.style.opacity = '0';
    setTimeout(() => {
      if (this.projectSourceWebpEl) {
        if (webpSrc) {
          this.projectSourceWebpEl.srcset = webpSrc;
          this.projectSourceWebpEl.sizes = '(max-width: 768px) 95vw, 70vw';
        } else {
          this.projectSourceWebpEl.removeAttribute('srcset');
          this.projectSourceWebpEl.removeAttribute('sizes');
        }
      }
      if (this.projectSourceJpegEl) {
        if (jpegSrc) {
          this.projectSourceJpegEl.srcset = jpegSrc;
          this.projectSourceJpegEl.sizes = '(max-width: 768px) 95vw, 70vw';
        } else {
          this.projectSourceJpegEl.removeAttribute('srcset');
          this.projectSourceJpegEl.removeAttribute('sizes');
        }
      }

      projectImage.src = src;
      projectImage.srcset = jpegSrc;
      projectImage.sizes = '(max-width: 768px) 95vw, 70vw';
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
    const teammatesList = document.querySelector('.teammates-list') as HTMLUListElement;
    
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
      
      const teammateEl = document.createElement('li');
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

  private displayAchievementLinks(links: {
    githubUrl?: string;
    liveUrl?: string;
    linkedinUrl?: string;
    blogUrl?: string;
  }): void {
    const section = document.querySelector('.achievement-github') as HTMLElement;
    if (!section) return;

    const actions = [
      links.liveUrl ? { href: links.liveUrl, label: 'Open Live Demo', icon: 'open-outline' } : null,
      links.githubUrl ? { href: links.githubUrl, label: 'View GitHub', icon: 'logo-github' } : null,
      links.linkedinUrl ? { href: links.linkedinUrl, label: 'View LinkedIn Post', icon: 'logo-linkedin' } : null,
      links.blogUrl ? { href: links.blogUrl, label: 'Read Article', icon: 'newspaper-outline' } : null,
    ].filter(Boolean) as Array<{ href: string; label: string; icon: string }>;

    if (!actions.length) {
      section.style.display = 'none';
      section.textContent = '';
      return;
    }

    section.style.display = 'block';
    section.textContent = '';
    actions.forEach((action) => {
      const link = SecurityManager.createSafeAnchor(action.href, action.label, 'github-button', true);
      const icon = document.createElement('ion-icon');
      icon.setAttribute('name', action.icon);
      link.prepend(icon);
      section.appendChild(link);
    });
  }

  private displayHackItActions(data: AchievementData): void {
    const section = document.querySelector('.achievement-github') as HTMLElement;
    if (!section) return;

    section.style.display = 'block';
    section.textContent = '';

    // Visit Project button
    const visit = document.createElement('a');
    visit.href = '#projects';
    visit.className = 'github-button';
    // accessibility: rely on link semantics and visible label
    // remove role and aria-label to avoid label/content mismatch
    visit.innerHTML = `${ICONS.collection} Visit Project`;
    visit.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTitle = (data.projectTitle || 'Kita-Kita').trim();
      const items = document.querySelectorAll('.project-item');
      let target: HTMLElement | null = null;
      items.forEach((item) => {
        const t = item.querySelector('.project-title')?.textContent?.trim();
        if (t === targetTitle) target = item as HTMLElement;
      });
      if (target) {
        const pd = this.getProjectData(target);
        if (pd) {
          this.closeAchievementModal();
          this.openProjectModal(pd);
        }
      } else {
        logger.warn(`Project "${targetTitle}" not found in list.`);
      }
    });
    section.appendChild(visit);

    // LinkedIn Post link
    if (data.linkedinUrl) {
      const link = SecurityManager.createSafeAnchor(data.linkedinUrl, 'View LinkedIn Post', 'github-button', true);
      const iconSpan = document.createElement('span');
      iconSpan.className = 'link-icon';
      iconSpan.innerHTML = ICONS.link;
      link.prepend(iconSpan);
      section.appendChild(link);
    }

    // Blog link (below existing buttons)
    if (data.blogUrl) {
      const blog = SecurityManager.createSafeAnchor(data.blogUrl, 'View Blog', 'github-button', true);
      const blogIcon = document.createElement('span');
      blogIcon.className = 'link-icon';
      blogIcon.innerHTML = ICONS.article;
      blog.prepend(blogIcon);
      section.appendChild(blog);
    }
  }

  public closeAchievementModal(): void {
    // Move focus back to the element that opened the modal before hiding
    const active = document.activeElement as HTMLElement | null;
    if (this.modalEl && active && this.modalEl.contains(active)) {
      active.blur();
    }
    if (this.previousFocus) {
      try { this.previousFocus.focus(); } catch { /* ignore */ }
    }

    this.modalEl?.classList.remove('active');
    if (this.modalEl) {
      this.modalEl.setAttribute('aria-hidden', 'true');
      this.modalEl.setAttribute('inert', '');
    }
    this.previousFocus = null;
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
    const webpSrc = this.achievementWebpImages[this.currentIndex] || '';
    const jpegSrc = this.achievementJpegImages[this.currentIndex] || src;
    
    // Show loading skeleton
    const slider = img.parentElement;
    if (slider) {
      this.showImageLoader(slider);
      // Also ensure any lingering error placeholders are removed
      const errorPlaceholder = slider.querySelector('.image-error-placeholder');
      if (errorPlaceholder) errorPlaceholder.remove();
    }
    
    // Update <picture> sources before swapping image
    if (this.achievementSourceWebpEl) {
      if (webpSrc) {
        this.achievementSourceWebpEl.srcset = webpSrc;
        this.achievementSourceWebpEl.sizes = '(max-width: 768px) 90vw, 50vw';
      } else {
        this.achievementSourceWebpEl.removeAttribute('srcset');
        this.achievementSourceWebpEl.removeAttribute('sizes');
      }
    }
    if (this.achievementSourceJpegEl) {
      if (jpegSrc) {
        this.achievementSourceJpegEl.srcset = jpegSrc;
        this.achievementSourceJpegEl.sizes = '(max-width: 768px) 90vw, 50vw';
      } else {
        this.achievementSourceJpegEl.removeAttribute('srcset');
        this.achievementSourceJpegEl.removeAttribute('sizes');
      }
    }
    
    // Fade out, swap, fade in
    img.style.opacity = '0';
    img.style.display = 'block';
    setTimeout(() => {
      // Set fallback <img> for browsers without <picture> support
      // Keep <img> on a reliable JPEG source; optimized variants are handled by <picture><source>
      img.src = jpegSrc || src;
      img.srcset = jpegSrc || src;
      img.sizes = '(max-width: 768px) 90vw, 50vw';
      img.onload = () => {
        this.hideImageLoader(slider);
        img.classList.remove('image-error');
        img.style.display = 'block';
        slider?.querySelector('.image-error-placeholder')?.remove();
        // Apply adaptive fit on mobile to avoid letterboxing/cropping
        this.applyAchievementImageFit(img, slider as HTMLElement | null);
        requestAnimationFrame(() => (img.style.opacity = '1'));
      };
      img.onerror = () => {
        // Fallback to original JPEG if optimized format fails
        const fallbackSrc = jpegSrc;
        if (fallbackSrc && fallbackSrc !== src) {
          logger.warn('Optimized image failed, falling back to:', fallbackSrc);
          img.src = fallbackSrc;
          img.onload = () => {
            this.hideImageLoader(slider);
            img.classList.remove('image-error');
            img.style.display = 'block';
            slider?.querySelector('.image-error-placeholder')?.remove();
            this.applyAchievementImageFit(img, slider as HTMLElement | null);
            requestAnimationFrame(() => (img.style.opacity = '1'));
          };
          img.onerror = () => {
            this.hideImageLoader(slider);
            logger.error('Failed to load fallback image:', fallbackSrc);
            img.style.display = 'block';
          };
        } else {
          this.hideImageLoader(slider);
          logger.error('Failed to load image:', src);
          img.style.display = 'block';
        }
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

  /**
   * Dynamically choose contain vs cover for mobile images to fill space without odd bars.
   */
  private applyAchievementImageFit(img: HTMLImageElement, slider: HTMLElement | null): void {
    if (!slider) return;
    const isMobile = window.innerWidth <= 600;
    if (!isMobile) return;

    // Always prioritize showing the full image on mobile
    img.classList.remove('fit-cover', 'fit-contain');
    img.classList.add('fit-contain');
  }
}
