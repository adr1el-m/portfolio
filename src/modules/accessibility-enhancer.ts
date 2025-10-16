/**
 * Accessibility Enhancement Module
 * Adds dynamic ARIA attributes and keyboard navigation support
 */

import { logger } from '../config';

export class AccessibilityEnhancer {
  private static instance: AccessibilityEnhancer;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): AccessibilityEnhancer {
    if (!AccessibilityEnhancer.instance) {
      AccessibilityEnhancer.instance = new AccessibilityEnhancer();
    }
    return AccessibilityEnhancer.instance;
  }

  private initialize(): void {
    this.enhanceAchievementCards();
    this.enhanceModalKeyboardNavigation();
    this.enhanceChatbotKeyboardSupport();
    this.enhanceFilterTabBehavior();
    this.announcePageChanges();
    logger.info('✅ Accessibility enhancements initialized');
  }

  /**
   * Add accessibility attributes to all achievement cards
   */
  private enhanceAchievementCards(): void {
    const achievementCards = document.querySelectorAll('.achievement-card');
    
    achievementCards.forEach((card) => {
      // Add role and tabindex if not already present
      if (!card.hasAttribute('role')) {
        card.setAttribute('role', 'button');
      }
      if (!card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
      }

      // Add keyboard support (Enter and Space)
      card.addEventListener('keydown', (e: Event) => {
        const event = e as KeyboardEvent;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          (card as HTMLElement).click();
        }
      });

      // Add aria-label based on card content
      if (!card.hasAttribute('aria-label')) {
        const title = card.querySelector('.card-title')?.textContent || '';
        const subtitle = card.querySelector('.card-subtitle')?.textContent || '';
        const ariaLabel = `View details: ${title}${subtitle ? ' - ' + subtitle : ''}`;
        card.setAttribute('aria-label', ariaLabel);
      }

      // Add role="img" and aria-label to emojis
      const emojis = card.querySelectorAll('.card-date, .card-location');
      emojis.forEach((element) => {
        const text = element.textContent || '';
        if (text.includes('📅')) {
          const span = element.querySelector('span') || document.createElement('span');
          if (!span.hasAttribute('role')) {
            span.setAttribute('role', 'img');
            span.setAttribute('aria-label', 'Calendar');
            if (!element.querySelector('span')) {
              element.innerHTML = element.innerHTML.replace('📅', '<span role="img" aria-label="Calendar">📅</span>');
            }
          }
        }
        if (text.includes('📍')) {
          const span = element.querySelector('span') || document.createElement('span');
          if (!span.hasAttribute('role')) {
            span.setAttribute('role', 'img');
            span.setAttribute('aria-label', 'Location');
            if (!element.querySelector('span')) {
              element.innerHTML = element.innerHTML.replace('📍', '<span role="img" aria-label="Location">📍</span>');
            }
          }
        }
      });

      // Make award badges accessible
      const badge = card.querySelector('.award-badge');
      if (badge && !badge.hasAttribute('role')) {
        const emoji = badge.textContent?.trim() || '';
        let ariaLabel = 'Award';
        if (emoji === '🏆') ariaLabel = 'Trophy';
        else if (emoji === '🎖️') ariaLabel = 'Medal';
        else if (emoji === '🥇') ariaLabel = 'First place medal';
        else if (emoji === '🥈') ariaLabel = 'Second place medal';
        else if (emoji === '🥉') ariaLabel = 'Third place medal';
        
        badge.setAttribute('role', 'img');
        badge.setAttribute('aria-label', ariaLabel);
      }
    });

    logger.info(`✅ Enhanced ${achievementCards.length} achievement cards for accessibility`);
  }

  /**
   * Enhance modal keyboard navigation
   */
  private enhanceModalKeyboardNavigation(): void {
    const modals = document.querySelectorAll('.project-modal, .achievement-modal, .chatbox');

    modals.forEach((modal) => {
      // Trap focus within modal when open
      modal.addEventListener('keydown', (e: Event) => {
        const event = e as KeyboardEvent;
        
        // Close modal on Escape key
        if (event.key === 'Escape') {
          const closeBtn = modal.querySelector('.close-btn, .project-modal-close, .achievement-modal-close') as HTMLElement;
          if (closeBtn) {
            closeBtn.click();
          }
        }

        // Focus trapping
        if (event.key === 'Tab') {
          const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      });

      // Manage aria-hidden state
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const isHidden = (modal as HTMLElement).style.display === 'none' || 
                           !modal.classList.contains('active');
            modal.setAttribute('aria-hidden', isHidden.toString());
          }
        });
      });

      observer.observe(modal, { attributes: true, attributeFilter: ['style', 'class'] });
    });

    logger.info('✅ Modal keyboard navigation enhanced');
  }

  /**
   * Enhance chatbot keyboard support
   */
  private enhanceChatbotKeyboardSupport(): void {
    const chatbotBtn = document.querySelector('.chatbot-btn');
    const chatbox = document.querySelector('.chatbox');
    const chatInput = document.querySelector('#chat-input') as HTMLInputElement;

    if (chatbotBtn) {
      // Open chatbot with Enter/Space
      chatbotBtn.addEventListener('keydown', (e: Event) => {
        const event = e as KeyboardEvent;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          (chatbotBtn as HTMLElement).click();
        }
      });
    }

    if (chatbox && chatInput) {
      // Focus input when chatbox opens
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const isVisible = (chatbox as HTMLElement).style.display !== 'none';
            if (isVisible) {
              setTimeout(() => chatInput.focus(), 100);
            }
          }
        });
      });

      observer.observe(chatbox, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    logger.info('✅ Chatbot keyboard support enhanced');
  }

  /**
   * Enhance filter tab behavior with proper ARIA states
   */
  private enhanceFilterTabBehavior(): void {
    const filterButtons = document.querySelectorAll('[data-filter-btn]');

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        // Update aria-selected for all buttons
        filterButtons.forEach((btn) => btn.setAttribute('aria-selected', 'false'));
        button.setAttribute('aria-selected', 'true');

        // Announce filter change to screen readers
        const category = button.textContent?.trim() || 'All';
        this.announceToScreenReader(`Showing ${category} projects`);
      });
    });

    logger.info('✅ Filter tab behavior enhanced');
  }

  /**
   * Announce page/section changes to screen readers
   */
  private announcePageChanges(): void {
    const navButtons = document.querySelectorAll('[data-nav-link]');

    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const pageName = button.textContent?.trim() || '';
        
        // Update aria-current
        navButtons.forEach((btn) => btn.removeAttribute('aria-current'));
        button.setAttribute('aria-current', 'page');

        // Announce to screen readers
        this.announceToScreenReader(`Navigated to ${pageName} section`);

        // Focus the section heading
        setTimeout(() => {
          const article = document.querySelector('article.active');
          const heading = article?.querySelector('h2');
          if (heading) {
            (heading as HTMLElement).setAttribute('tabindex', '-1');
            (heading as HTMLElement).focus();
          }
        }, 100);
      });
    });

    logger.info('✅ Page change announcements configured');
  }

  /**
   * Announce message to screen readers using live region
   */
  private announceToScreenReader(message: string): void {
    const liveRegion = this.getOrCreateLiveRegion();
    liveRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }

  /**
   * Get or create ARIA live region for announcements
   */
  private getOrCreateLiveRegion(): HTMLElement {
    let liveRegion = document.getElementById('a11y-announcer');
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'a11y-announcer';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'visually-hidden';
      document.body.appendChild(liveRegion);
    }

    return liveRegion;
  }

  /**
   * Add landmark roles to improve navigation
   */
  public enhanceLandmarks(): void {
    // Main content is already marked with <main>
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && !sidebar.hasAttribute('role')) {
      sidebar.setAttribute('role', 'complementary');
      sidebar.setAttribute('aria-label', 'Contact information and social links');
    }

    // Service sections
    const serviceSection = document.querySelector('.service');
    if (serviceSection && !serviceSection.hasAttribute('role')) {
      serviceSection.setAttribute('role', 'region');
      serviceSection.setAttribute('aria-labelledby', 'service-title');
      const title = serviceSection.querySelector('.service-title');
      if (title) {
        title.id = 'service-title';
      }
    }

    logger.info('✅ Landmark roles enhanced');
  }
}
