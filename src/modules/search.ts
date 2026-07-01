import type { PortfolioSearchEntry } from './portfolio-data';
import { getPortfolioSearchEntries, normalizeKey } from './portfolio-data';
import {
  filterTimeline,
  navigateToPage,
  openAdrAI,
  openExternalUrl,
  openPortfolioHonor,
  openPortfolioProject,
  openResumePreview,
} from './portfolio-actions';

type SearchResult = PortfolioSearchEntry & {
  score: number;
};

export class Search {
  private overlayEl: HTMLElement | null = null;
  private resultsEl: HTMLElement | null = null;
  private inputRef: HTMLInputElement | null = null;
  private countEl: HTMLElement | null = null;

  constructor() {
    this.init();
    this.bindGlobalHotkeys();
    this.bindEvents();
  }

  private init(): void {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('q') || '').trim();
    if (q) this.open(q);
  }

  public open(initialQuery = ''): void {
    this.renderOverlay();
    this.updateQueryParam(initialQuery);
    if (this.inputRef) {
      this.inputRef.value = initialQuery;
      try { this.inputRef.focus({ preventScroll: true }); } catch { void 0; }
    }
    this.updateResults(initialQuery);
  }

  private renderOverlay(): void {
    if (this.overlayEl) return;

    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'portfolio-search-title');
    overlay.innerHTML = `
      <div class="search-panel">
        <div class="search-header">
          <div>
            <p class="search-kicker">Global Search</p>
            <h2 id="portfolio-search-title">Find anything in the portfolio</h2>
          </div>
          <button type="button" class="search-close" aria-label="Close search">
            <ion-icon name="close-outline" aria-hidden="true"></ion-icon>
          </button>
        </div>
        <div class="search-box">
          <ion-icon name="search-outline" aria-hidden="true"></ion-icon>
          <input type="search" class="search-input" placeholder="Search projects, honors, tech, background, contact" autocomplete="off" spellcheck="false" />
        </div>
        <div class="search-meta" aria-live="polite">
          <span data-search-count>Type to search the full site.</span>
          <span>/ opens search · Esc closes</span>
        </div>
        <div class="search-results" role="listbox" aria-label="Search results"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayEl = overlay;
    this.resultsEl = overlay.querySelector<HTMLElement>('.search-results');
    this.inputRef = overlay.querySelector<HTMLInputElement>('.search-input');
    this.countEl = overlay.querySelector<HTMLElement>('[data-search-count]');

    this.inputRef?.addEventListener('input', () => {
      const q = this.inputRef?.value.trim() || '';
      this.updateQueryParam(q);
      this.updateResults(q);
    });

    this.inputRef?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const first = this.resultsEl?.querySelector<HTMLButtonElement>('[data-search-open]');
        first?.click();
      }
    });

    overlay.querySelector<HTMLButtonElement>('.search-close')?.addEventListener('click', () => this.closeOverlay());
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) this.closeOverlay();
    });
  }

  private bindEvents(): void {
    window.addEventListener('portfolio:open-search', (event) => {
      const detail = (event as CustomEvent<{ query?: string }>).detail;
      this.open(detail?.query || '');
    });
  }

  private updateQueryParam(q: string): void {
    try {
      const url = new URL(window.location.href);
      if (q) url.searchParams.set('q', q);
      else url.searchParams.delete('q');
      window.history.replaceState({}, '', url.toString());
    } catch { void 0; }
  }

  private updateResults(query: string): void {
    if (!this.resultsEl) return;
    this.resultsEl.innerHTML = '';
    const q = query.trim();
    if (!q) {
      if (this.countEl) {
        this.countEl.textContent = 'Search pages, projects, honors, tech, and contact actions.';
      }
      this.renderSuggestedResults();
      return;
    }

    const results = this.findResults(q);
    if (this.countEl) {
      this.countEl.textContent = results.length
        ? `${results.length} match${results.length === 1 ? '' : 'es'} for "${q}"`
        : `No matches for "${q}"`;
    }

    if (results.length === 0) {
      this.renderEmpty(q);
      return;
    }

    results.slice(0, 24).forEach((result) => this.resultsEl?.appendChild(this.createResultButton(result, q)));
  }

  private renderSuggestedResults(): void {
    const suggestions = getPortfolioSearchEntries()
      .filter((entry) => ['page', 'action', 'contact'].includes(entry.type))
      .slice(0, 8)
      .map((entry) => ({ ...entry, score: 1 }));
    suggestions.forEach((result) => this.resultsEl?.appendChild(this.createResultButton(result, '')));
  }

  private renderEmpty(query: string): void {
    if (!this.resultsEl) return;
    const empty = document.createElement('div');
    empty.className = 'search-empty';
    empty.innerHTML = `
      <ion-icon name="search-outline" aria-hidden="true"></ion-icon>
      <strong>No exact match yet</strong>
      <span>Try a project name, award, tech stack term, scholarship, or contact action.</span>
    `;
    const askBtn = document.createElement('button');
    askBtn.type = 'button';
    askBtn.textContent = 'Ask AdrAI';
    askBtn.addEventListener('click', () => {
      this.closeOverlay();
      openAdrAI(`Search the portfolio for ${query}`);
    });
    empty.appendChild(askBtn);
    this.resultsEl.appendChild(empty);
  }

  private createResultButton(result: SearchResult, query: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-result';
    button.dataset.searchOpen = result.id;
    button.setAttribute('role', 'option');

    const icon = document.createElement('span');
    icon.className = 'search-result-icon';
    icon.innerHTML = `<ion-icon name="${this.iconFor(result.type)}" aria-hidden="true"></ion-icon>`;

    const copy = document.createElement('span');
    copy.className = 'search-result-copy';

    const title = document.createElement('strong');
    title.textContent = result.title;

    const subtitle = document.createElement('small');
    subtitle.textContent = [this.typeLabel(result.type), result.subtitle].filter(Boolean).join(' • ');

    const snippet = document.createElement('span');
    snippet.className = 'search-result-snippet';
    snippet.textContent = result.description ? this.trimSnippet(result.description, query) : this.sectionLabel(result.section);

    copy.append(title, subtitle, snippet);

    const action = document.createElement('span');
    action.className = 'search-result-action';
    action.textContent = this.actionLabel(result);

    button.append(icon, copy, action);
    button.addEventListener('click', () => this.activateResult(result));
    return button;
  }

  private findResults(query: string): SearchResult[] {
    const normalized = normalizeKey(query);
    const tokens = normalized.split(' ').filter(Boolean);
    if (!tokens.length) return [];

    return getPortfolioSearchEntries()
      .map((entry) => {
        const title = normalizeKey(entry.title);
        const subtitle = normalizeKey(entry.subtitle || '');
        const description = normalizeKey(entry.description || '');
        const keywords = normalizeKey(entry.keywords.join(' '));
        const haystack = `${title} ${subtitle} ${description} ${keywords}`;
        const score = tokens.reduce((sum, token) => {
          let tokenScore = 0;
          if (title === token || title.startsWith(token)) tokenScore += 7;
          if (title.includes(token)) tokenScore += 5;
          if (keywords.includes(token)) tokenScore += 3;
          if (subtitle.includes(token)) tokenScore += 2;
          if (description.includes(token)) tokenScore += 1;
          return sum + tokenScore;
        }, haystack.includes(normalized) ? 4 : 0);
        return { ...entry, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || this.typeWeight(a.type) - this.typeWeight(b.type) || a.title.localeCompare(b.title));
  }

  private activateResult(result: PortfolioSearchEntry): void {
    this.closeOverlay();

    switch (result.type) {
      case 'project':
        openPortfolioProject(result.target || result.title);
        break;
      case 'honor':
        openPortfolioHonor(result.target || result.title);
        break;
      case 'timeline':
        navigateToPage('background', { track: false });
        if (result.target === 'education' || result.target === 'experience' || result.target === 'scholarship') {
          filterTimeline(result.target);
        }
        this.highlightElement(result.element);
        break;
      case 'skill':
        navigateToPage('about', { scrollSelector: '.tech-stack-section', track: false });
        break;
      case 'contact':
        if (result.id === 'contact-github' && result.url) openExternalUrl(result.url, 'GitHub profile');
        else if (result.id === 'contact-linkedin' && result.url) openExternalUrl(result.url, 'LinkedIn profile');
        else navigateToPage('contact', { track: false });
        break;
      case 'action':
        if (result.id === 'action-resume') openResumePreview(result.url);
        else if (result.id === 'action-adrai') openAdrAI();
        break;
      default:
        if (result.target === 'about' || result.target === 'background' || result.target === 'projects' || result.target === 'gear' || result.target === 'contact') {
          navigateToPage(result.target, { track: false });
        }
        break;
    }
  }

  private highlightElement(element?: HTMLElement): void {
    if (!element) return;
    window.setTimeout(() => {
      element.classList.add('search-highlight');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => element.classList.remove('search-highlight'), 2000);
    }, 220);
  }

  private trimSnippet(text: string, query: string, len = 132): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!query) return cleaned.length > len ? `${cleaned.slice(0, len).trim()}...` : cleaned;
    const normalizedText = cleaned.toLowerCase();
    const i = normalizedText.indexOf(query.toLowerCase());
    if (i < 0) return cleaned.length > len ? `${cleaned.slice(0, len).trim()}...` : cleaned;
    const start = Math.max(0, i - Math.floor(len / 2));
    const end = Math.min(cleaned.length, start + len);
    return `${start > 0 ? '...' : ''}${cleaned.slice(start, end)}${end < cleaned.length ? '...' : ''}`;
  }

  private iconFor(type: PortfolioSearchEntry['type']): string {
    switch (type) {
      case 'project': return 'cube-outline';
      case 'honor': return 'trophy-outline';
      case 'timeline': return 'time-outline';
      case 'contact': return 'mail-outline';
      case 'action': return 'flash-outline';
      case 'skill': return 'construct-outline';
      default: return 'document-text-outline';
    }
  }

  private typeLabel(type: PortfolioSearchEntry['type']): string {
    switch (type) {
      case 'project': return 'Project';
      case 'honor': return 'Honor';
      case 'timeline': return 'Background';
      case 'contact': return 'Contact';
      case 'action': return 'Action';
      case 'skill': return 'Tech';
      default: return 'Page';
    }
  }

  private actionLabel(result: PortfolioSearchEntry): string {
    if (result.type === 'contact' && result.url && result.id !== 'contact-email') return 'Open';
    if (result.type === 'action') return 'Run';
    return 'Go';
  }

  private sectionLabel(section: PortfolioSearchEntry['section']): string {
    switch (section) {
      case 'about': return 'About section';
      case 'background': return 'Background section';
      case 'projects': return 'Projects section';
      case 'gear': return 'Gear section';
      case 'contact': return 'Contact section';
      default: return 'Portfolio action';
    }
  }

  private typeWeight(type: PortfolioSearchEntry['type']): number {
    const weights: Record<PortfolioSearchEntry['type'], number> = {
      page: 0,
      project: 1,
      honor: 2,
      timeline: 3,
      contact: 4,
      action: 5,
      skill: 6,
    };
    return weights[type] ?? 9;
  }

  private closeOverlay(): void {
    this.overlayEl?.remove();
    this.overlayEl = null;
    this.resultsEl = null;
    this.inputRef = null;
    this.countEl = null;
    this.updateQueryParam('');
  }

  private bindGlobalHotkeys(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = (target?.tagName || '').toLowerCase();
      const editable = tag === 'input' || tag === 'textarea' || target?.isContentEditable === true;

      if (this.overlayEl && event.key === 'Escape') {
        event.preventDefault();
        this.closeOverlay();
        return;
      }

      if (editable) return;

      if (event.key === '/' && !event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        this.open('');
      }
    });
  }
}

export default Search;
