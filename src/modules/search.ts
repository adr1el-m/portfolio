// No logger needed for search overlay

interface SearchResult {
  title: string;
  section: 'about' | 'background' | 'projects' | 'organizations';
  element: HTMLElement | null;
  snippet?: string;
}

export class Search {
  private overlayEl: HTMLElement | null = null;
  private resultsEl: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('q') || '').trim();
    if (!q) return;

    this.renderOverlay();
    this.updateResults(q);
  }

  private renderOverlay(): void {
    if (this.overlayEl) return;

    const style = document.createElement('style');
    style.textContent = `
      .search-overlay{position:fixed;inset:20px 20px auto 20px;z-index:1000;background:var(--eerie-black-2);border:1px solid var(--jet);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.4);padding:16px;max-height:60vh;overflow:auto}
      .search-header{display:flex;gap:8px;margin-bottom:12px;align-items:center}
      .search-input{flex:1;padding:10px 12px;border-radius:8px;border:1px solid var(--jet);background:var(--eerie-black-1);color:var(--white-1)}
      .search-close{padding:10px 12px;border-radius:8px;border:1px solid var(--jet);background:var(--border-gradient-onyx);color:var(--white-1);cursor:pointer}
      .search-results{display:flex;flex-direction:column;gap:10px}
      .search-result{padding:10px;border-radius:10px;border:1px solid var(--jet);background:var(--bg-gradient-jet)}
      .search-result h4{margin:0 0 6px 0;color:var(--orange-yellow-crayola)}
      .search-result small{color:var(--light-gray-70)}
      .search-open{margin-top:8px;padding:8px 10px;border-radius:8px;border:1px solid var(--jet);background:var(--border-gradient-onyx);color:var(--white-1);cursor:pointer}
      .search-empty{color:var(--light-gray-70)}
      .search-highlight{outline:2px solid var(--orange-yellow-crayola);outline-offset:2px;border-radius:8px}
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';

    const header = document.createElement('div');
    header.className = 'search-header';

    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'search-input';
    input.placeholder = 'Search projects, achievements, background…';
    input.value = new URLSearchParams(window.location.search).get('q') || '';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'search-close';
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';

    const results = document.createElement('div');
    results.className = 'search-results';

    header.appendChild(input);
    header.appendChild(closeBtn);
    overlay.appendChild(header);
    overlay.appendChild(results);
    document.body.appendChild(overlay);

    this.overlayEl = overlay;
    this.resultsEl = results;

    input.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        const q = input.value.trim();
        this.updateQueryParam(q);
        this.updateResults(q);
      }
    });

    input.addEventListener('input', () => {
      const q = input.value.trim();
      this.updateResults(q);
    });

    closeBtn.addEventListener('click', () => {
      this.overlayEl?.remove();
      this.overlayEl = null;
      this.resultsEl = null;
      // Remove ?q from URL
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('q');
        window.history.replaceState({}, '', url.pathname + url.hash);
      } catch {}
    });
  }

  private updateQueryParam(q: string): void {
    try {
      const url = new URL(window.location.href);
      if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }

  private updateResults(query: string): void {
    const resultsEl = this.resultsEl;
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    const q = query.toLowerCase();
    if (!q) {
      const p = document.createElement('p');
      p.className = 'search-empty';
      p.textContent = 'Type to search. Results update as you type.';
      resultsEl.appendChild(p);
      return;
    }

    const results = this.findResults(q);
    if (results.length === 0) {
      const p = document.createElement('p');
      p.className = 'search-empty';
      p.textContent = `No matches for "${query}"`;
      resultsEl.appendChild(p);
      return;
    }

    results.slice(0, 20).forEach((r) => {
      const card = document.createElement('div');
      card.className = 'search-result';

      const title = document.createElement('h4');
      title.textContent = r.title;

      const meta = document.createElement('small');
      const sectionName = this.sectionLabel(r.section);
      meta.textContent = sectionName;

      const snippet = document.createElement('div');
      snippet.innerHTML = r.snippet ? r.snippet : '';

      const openBtn = document.createElement('button');
      openBtn.className = 'search-open';
      openBtn.type = 'button';
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', () => {
        this.activateSection(r.section);
        if (r.element) {
          // Brief highlight
          r.element.classList.add('search-highlight');
          r.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => r.element?.classList.remove('search-highlight'), 2000);
        }
        // Close overlay for focus
        this.overlayEl?.remove();
        this.overlayEl = null;
        this.resultsEl = null;
        this.updateQueryParam('');
      });

      card.appendChild(title);
      card.appendChild(meta);
      if (r.snippet) card.appendChild(snippet);
      card.appendChild(openBtn);
      resultsEl.appendChild(card);
    });
  }

  private sectionLabel(section: SearchResult['section']): string {
    switch (section) {
      case 'about': return 'About → Achievements';
      case 'background': return 'Background';
      case 'projects': return 'Projects';
      case 'organizations': return 'Organizations';
      default: return 'Section';
    }
  }

  private findResults(q: string): SearchResult[] {
    const res: SearchResult[] = [];

    // Projects
    document.querySelectorAll<HTMLElement>('.project-item').forEach((el) => {
      const title = el.querySelector('.project-title')?.textContent?.trim() || '';
      const desc = el.getAttribute('data-description') || '';
      const tech = el.getAttribute('data-technologies') || '';
      const cat = el.getAttribute('data-category') || '';
      const hay = (title + ' ' + desc + ' ' + tech + ' ' + cat).toLowerCase();
      if (hay.includes(q)) {
        res.push({
          title: title || 'Project',
          section: 'projects',
          element: el,
          snippet: desc ? `<span style="color:var(--light-gray-70)">${this.trimSnippet(desc, q)}</span>` : undefined,
        });
      }
    });

    // Achievements (inside About)
    document.querySelectorAll<HTMLElement>('.achievement-card, .achievement-item .achievement-card').forEach((el) => {
      const title = el.querySelector('.card-title, .h4.card-title')?.textContent?.trim() || '';
      const desc = el.querySelector('.card-subtitle')?.textContent?.trim() || '';
      const organizer = el.getAttribute('data-organizer') || '';
      const loc = el.getAttribute('data-location') || '';
      const date = el.getAttribute('data-date') || '';
      const hay = (title + ' ' + desc + ' ' + organizer + ' ' + loc + ' ' + date).toLowerCase();
      if (hay.includes(q)) {
        res.push({
          title: title || 'Achievement',
          section: 'about',
          element: el,
          snippet: desc ? `<span style="color:var(--light-gray-70)">${this.trimSnippet(desc, q)}</span>` : undefined,
        });
      }
    });

    // Background → Timeline
    document.querySelectorAll<HTMLElement>('.timeline-item').forEach((el) => {
      const title = el.querySelector('.timeline-title, .h4.timeline-title')?.textContent?.trim() || '';
      const company = el.querySelector('.company-name')?.textContent?.trim() || '';
      const period = el.querySelector('.timeline-period')?.textContent?.trim() || '';
      const text = el.querySelector('.timeline-text')?.textContent?.trim() || '';
      const hay = (title + ' ' + company + ' ' + period + ' ' + text).toLowerCase();
      if (hay.includes(q)) {
        res.push({
          title: title || 'Background',
          section: 'background',
          element: el,
          snippet: text ? `<span style="color:var(--light-gray-70)">${this.trimSnippet(text, q)}</span>` : undefined,
        });
      }
    });

    // Organizations page (cards)
    document.querySelectorAll<HTMLElement>('[data-page="organizations"] .organizations-list .organization-card, .org-item, .org-card').forEach((el) => {
      const title = el.querySelector('.organization-title, .h4, h4')?.textContent?.trim() || '';
      const text = el.textContent?.trim() || '';
      const hay = (title + ' ' + text).toLowerCase();
      if (hay.includes(q)) {
        res.push({
          title: title || 'Organization',
          section: 'organizations',
          element: el,
          snippet: text ? `<span style="color:var(--light-gray-70)">${this.trimSnippet(text, q)}</span>` : undefined,
        });
      }
    });

    return res;
  }

  private trimSnippet(text: string, q: string, len: number = 120): string {
    const t = text.replace(/\s+/g, ' ').trim();
    const i = t.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return t.slice(0, len) + (t.length > len ? '…' : '');
    const start = Math.max(0, i - Math.floor(len / 2));
    const end = Math.min(t.length, start + len);
    return (start > 0 ? '…' : '') + t.slice(start, end) + (end < t.length ? '…' : '');
  }

  private activateSection(section: SearchResult['section']): void {
    const labelMap: Record<SearchResult['section'], string> = {
      about: 'about',
      background: 'background',
      projects: 'projects',
      organizations: 'organizations',
    };

    // Use existing navigation manager handlers by simulating a click on the navbar
    const targetLabel = this.navButtonLabel(section);
    const btns = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-link]'));
    const targetBtn = btns.find((b) => (b.textContent || '').trim().toLowerCase() === targetLabel);
    if (targetBtn) {
      targetBtn.click();
      return;
    }

    // Fallback: toggle articles directly
    document.querySelectorAll<HTMLElement>('[data-page]').forEach((a) => a.classList.remove('active'));
    const art = document.querySelector<HTMLElement>(`[data-page="${labelMap[section]}"]`);
    art?.classList.add('active');
  }

  private navButtonLabel(section: SearchResult['section']): string {
    switch (section) {
      case 'about': return 'about';
      case 'background': return 'background';
      case 'projects': return 'projects';
      case 'organizations': return 'organizations';
    }
  }
}

export default Search;