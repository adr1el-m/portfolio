/**
 * Site-wide motion layer: cursor spotlights on cards, cascading page
 * entrances, below-the-fold reveals, and magnetic CTAs.
 * Inert under reduced motion (CSS also neutralises it).
 */
const SPOTLIGHT_SELECTOR = [
  '.featured-project',
  '.service-item',
  '.achievement-card',
  '.project-item',
  '.timeline-item',
  '.gear-card',
  '.stack-item',
  '.github-heatmap',
  '.recruiter-cta',
].join(',');

const REVEAL_SELECTOR = 'article[data-page] > section, .achievements-list > li:nth-child(-n + 8)';
const MAGNETIC_SELECTOR = '[data-magnetic], .recruiter-cta-primary';

export class MotionFx {
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly finePointer = window.matchMedia('(pointer: fine)');
  private spotTarget: HTMLElement | null = null;
  private spotFrame = 0;
  private spotX = 0;
  private spotY = 0;

  init(): void {
    this.setupNavIndicator();
    if (this.reducedMotion.matches) return;
    this.setupReveals();
    this.setupPageEntrances();
    if (this.finePointer.matches) {
      this.setupSpotlights();
      this.setupMagnetic();
    }
  }

  private setupSpotlights(): void {
    document.addEventListener('pointerover', (e) => {
      const host = (e.target as Element | null)?.closest?.<HTMLElement>(SPOTLIGHT_SELECTOR);
      if (!host || host.querySelector(':scope > .fx-spot')) return;
      host.classList.add('fx-host');
      const spot = document.createElement('span');
      spot.className = 'fx-spot';
      spot.setAttribute('aria-hidden', 'true');
      host.appendChild(spot);
    }, { passive: true });

    document.addEventListener('pointermove', (e) => {
      const host = (e.target as Element | null)?.closest?.<HTMLElement>('.fx-host');
      if (!host) return;
      this.spotTarget = host;
      this.spotX = e.clientX;
      this.spotY = e.clientY;
      if (this.spotFrame) return;
      this.spotFrame = requestAnimationFrame(() => {
        this.spotFrame = 0;
        const target = this.spotTarget;
        if (!target) return;
        const r = target.getBoundingClientRect();
        target.style.setProperty('--fx-x', `${this.spotX - r.left}px`);
        target.style.setProperty('--fx-y', `${this.spotY - r.top}px`);
      });
    }, { passive: true });
  }

  /** Only blocks that start below the fold opt in, so nothing visible blinks. */
  private setupReveals(): void {
    const fold = window.innerHeight;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('fx-in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
      const article = el.closest('article[data-page]');
      if (!article?.classList.contains('active')) return;
      if (el.getBoundingClientRect().top < fold) return;
      el.classList.add('fx-reveal');
      observer.observe(el);
    });
  }

  private setupPageEntrances(): void {
    let timer = 0;
    window.addEventListener('portfolio:pagechange', (event) => {
      const detail = (event as CustomEvent<{ initialLoad?: boolean }>).detail;
      if (detail?.initialLoad) return;
      const article = document.querySelector<HTMLElement>('article[data-page].active');
      if (!article) return;
      document.querySelectorAll('article.fx-enter').forEach((el) => el.classList.remove('fx-enter'));
      Array.from(article.children).forEach((child, i) => {
        (child as HTMLElement).style.setProperty('--fx-i', String(Math.min(i, 8)));
        // Entrance replaces the scroll reveal for this article's blocks.
        child.classList.remove('fx-reveal');
      });
      void article.offsetWidth; // restart the animation on repeat visits
      article.classList.add('fx-enter');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => article.classList.remove('fx-enter'), 1600);
    });
  }

  /** A single pill that glides between tabs instead of tabs repainting. */
  private setupNavIndicator(): void {
    const nav = document.querySelector<HTMLElement>('.navbar');
    const list = nav?.querySelector<HTMLElement>('.navbar-list');
    if (!nav || !list) return;
    // Lives in <nav>, not the <ul>, so the list keeps only <li> children.
    const indicator = document.createElement('span');
    indicator.className = 'nav-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    nav.prepend(indicator);
    nav.classList.add('has-indicator');

    const place = (): void => {
      const active = list.querySelector<HTMLElement>('.navbar-link.active');
      if (!active || !active.offsetWidth) {
        indicator.style.opacity = '0';
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const rect = active.getBoundingClientRect();
      indicator.style.opacity = '1';
      indicator.style.width = `${rect.width}px`;
      indicator.style.height = `${rect.height}px`;
      indicator.style.transform = `translate3d(${rect.left - navRect.left - nav.clientLeft}px, ${rect.top - navRect.top - nav.clientTop}px, 0)`;
    };

    place();
    window.addEventListener('portfolio:pagechange', () => requestAnimationFrame(place));
    window.addEventListener('resize', place, { passive: true });
    new MutationObserver(place).observe(list, { subtree: true, attributes: true, attributeFilter: ['class'] });
    document.fonts?.ready.then(place).catch(() => undefined);
  }

  private setupMagnetic(): void {
    document.querySelectorAll<HTMLElement>(MAGNETIC_SELECTOR).forEach((el) => {
      if (el.closest('.stage')) return; // the stage binds its own
      el.setAttribute('data-magnetic', '');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * 0.22}px`);
        el.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * 0.32}px`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  }
}
