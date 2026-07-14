function slugify(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class HonorRoutes {
  private routeMap = new Map<string, HTMLElement>();

  constructor() {
    this.init();
  }

  private init(): void {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.achievement-card'));
    cards.forEach((card) => {
      const title = card.querySelector('.card-title')?.textContent?.trim();
      if (!title) return;
      const year = card.closest('.year-group')?.querySelector('.year-title')?.textContent?.trim() || 'honor';
      const slug = slugify(title);
      const path = `/honors/${year}/${slug}`;
      card.dataset.honorPath = path;
      card.dataset.honorSlug = slug;
      this.routeMap.set(path, card);
      this.routeMap.set(`/honors/${slug}`, card);
    });

    document.addEventListener('click', (event) => {
      if ((event.target as Element | null)?.closest('[data-honor-project-link]')) return;
      const card = (event.target as Element | null)?.closest<HTMLElement>('.achievement-card');
      if (!card?.dataset.honorPath) return;
      if (window.location.pathname === card.dataset.honorPath) return;
      window.history.pushState({}, '', card.dataset.honorPath);
    }, { capture: true });

    window.addEventListener('popstate', () => this.applyRoute(window.location.pathname));
    window.addEventListener('portfolio:open-honor', (event) => {
      const detail = (event as CustomEvent<{ title?: string }>).detail;
      this.openByTitle(detail?.title || '');
    });

    this.applyRoute(window.location.pathname);
  }

  private openByTitle(title: string): void {
    const needle = slugify(title);
    if (!needle) return;
    const match = Array.from(this.routeMap.values()).find((card) => {
      const cardTitle = card.querySelector('.card-title')?.textContent?.trim() || '';
      return slugify(cardTitle).includes(needle) || needle.includes(slugify(cardTitle));
    });
    if (!match) return;
    this.openCard(match);
  }

  private applyRoute(pathname: string): void {
    const card = this.routeMap.get(pathname);
    if (!card) return;
    requestAnimationFrame(() => this.openCard(card));
  }

  private openCard(card: HTMLElement): void {
    const aboutArticle = document.querySelector<HTMLElement>('article[data-page="about"]');
    if (aboutArticle && !aboutArticle.classList.contains('active')) {
      document.querySelectorAll<HTMLElement>('article[data-page]').forEach((article) => article.classList.remove('active'));
      aboutArticle.classList.add('active');
      document.querySelectorAll<HTMLElement>('[data-nav-link]').forEach((button) => {
        button.classList.toggle('active', (button.textContent || '').trim().toLowerCase() === 'about');
      });
    }
    this.updateMetadata(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => card.click(), 180);
  }

  private updateMetadata(card: HTMLElement): void {
    const title = card.querySelector('.card-title')?.textContent?.trim() || 'Honor';
    const path = card.dataset.honorPath || window.location.pathname;
    const description = card.getAttribute('data-description')
      ?.replace(/&#10;/g, ' ')
      .replace(/\b(Recognition|Participation|Scope|Contribution):/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);

    document.title = `${title} | Adriel Magalona`;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    canonical?.setAttribute('href', `https://www.adrielmagalona.dev${path}`);
    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    ogUrl?.setAttribute('content', `https://www.adrielmagalona.dev${path}`);
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    ogTitle?.setAttribute('content', `${title} | Adriel Magalona`);
    if (description) {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      meta?.setAttribute('content', description);
      const ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
      ogDescription?.setAttribute('content', description);
    }
  }
}
