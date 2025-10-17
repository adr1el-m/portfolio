/**
 * Dynamic Page Loader
 * Loads page content on-demand to reduce initial HTML payload
 */

import { logger } from '../config';

interface PageCache {
  [key: string]: string;
}

export class PageLoader {
  private static instance: PageLoader;
  private cache: PageCache = {};
  private currentPage: string = 'about';
  private loading: Set<string> = new Set();

  private constructor() {
    this.init();
  }

  public static getInstance(): PageLoader {
    if (!PageLoader.instance) {
      PageLoader.instance = new PageLoader();
    }
    return PageLoader.instance;
  }

  /**
   * Initialize page loader
   */
  private init(): void {
    // Pre-cache the initial page (about) since it's already in DOM
    const aboutPage = document.querySelector('article[data-page="about"]');
    if (aboutPage) {
      this.cache['about'] = aboutPage.outerHTML;
    }
  }

  /**
   * Load a page dynamically
   */
  public async loadPage(pageName: string): Promise<void> {
    try {
      // If already on this page, do nothing
      if (this.currentPage === pageName) {
        return;
      }

      // If already loading, wait
      if (this.loading.has(pageName)) {
        logger.log(`⏳ Page "${pageName}" is already loading...`);
        return;
      }

      logger.log(`📄 Loading page: ${pageName}`);
      
      // Check cache first
      if (this.cache[pageName]) {
        this.renderPage(pageName, this.cache[pageName]);
        return;
      }

      // Mark as loading
      this.loading.add(pageName);

      // Show loading state
      this.showLoadingState();

      // Fetch page content
      const response = await fetch(`/pages/${pageName}.html`);
      
      if (!response.ok) {
        throw new Error(`Failed to load page: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Cache the content
      this.cache[pageName] = html;
      
      // Remove loading state
      this.loading.delete(pageName);
      
      // Render the page
      this.renderPage(pageName, html);
      
      logger.log(`✓ Page "${pageName}" loaded successfully`);

    } catch (error) {
      this.loading.delete(pageName);
      logger.error(`❌ Failed to load page "${pageName}":`, error);
      this.showErrorState(pageName);
    }
  }

  /**
   * Render page content
   */
  private renderPage(pageName: string, html: string): void {
    const mainContent = document.querySelector('main');
    
    if (!mainContent) {
      logger.error('Main content container not found');
      return;
    }

    // Remove all existing articles
    const existingArticles = mainContent.querySelectorAll('article');
    existingArticles.forEach(article => article.remove());

    // Create temporary container to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Get the article element
    const article = temp.querySelector('article');
    
    if (!article) {
      logger.error('No article element found in page content');
      return;
    }

    // Add to DOM
    mainContent.appendChild(article);

    // Set current page
    this.currentPage = pageName;

    // Dispatch custom event for other modules to react
    window.dispatchEvent(new CustomEvent('pageLoaded', { 
      detail: { pageName } 
    }));

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Show loading state while fetching
   */
  private showLoadingState(): void {
    const mainContent = document.querySelector('main');
    
    if (!mainContent) return;

    // Remove existing articles
    const existingArticles = mainContent.querySelectorAll('article');
    existingArticles.forEach(article => article.remove());

    // Create loading article
    const loadingArticle = document.createElement('article');
    loadingArticle.className = 'loading';
    loadingArticle.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading content...</p>
      </div>
    `;

    mainContent.appendChild(loadingArticle);
  }

  /**
   * Show error state if page fails to load
   */
  private showErrorState(pageName: string): void {
    const mainContent = document.querySelector('main');
    
    if (!mainContent) return;

    // Remove existing articles
    const existingArticles = mainContent.querySelectorAll('article');
    existingArticles.forEach(article => article.remove());

    // Create error article
    const errorArticle = document.createElement('article');
    errorArticle.className = 'error';
    errorArticle.innerHTML = `
      <header>
        <h2 class="h2 article-title">Error</h2>
      </header>
      <section class="error-content">
        <p>Failed to load page: <strong>${pageName}</strong></p>
        <p>Please try again or contact support if the issue persists.</p>
        <button class="retry-btn" onclick="window.location.reload()">
          Reload Page
        </button>
      </section>
    `;

    mainContent.appendChild(errorArticle);
  }

  /**
   * Preload pages for better UX
   */
  public preloadPages(pageNames: string[]): void {
    pageNames.forEach(pageName => {
      if (!this.cache[pageName] && !this.loading.has(pageName)) {
        // Preload in the background
        fetch(`/pages/${pageName}.html`)
          .then(response => response.text())
          .then(html => {
            this.cache[pageName] = html;
            logger.log(`✓ Preloaded page: ${pageName}`);
          })
          .catch(error => {
            logger.warn(`Failed to preload page "${pageName}":`, error);
          });
      }
    });
  }

  /**
   * Get current page name
   */
  public getCurrentPage(): string {
    return this.currentPage;
  }

  /**
   * Clear cache (useful for development)
   */
  public clearCache(): void {
    this.cache = {};
    logger.log('Page cache cleared');
  }
}
