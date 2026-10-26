/**
 * Site-wide motion layer.
 *
 * - Reveals: below-the-fold cards and blocks rise, sharpen and settle in a
 *   stagger as they enter (never anything already on screen, so no blink).
 * - Kinetic headings: titles split into words that rise into place.
 * - Page switches: the panel wipes open and its sections cascade.
 * - Pointer: cursor spotlights, 3D tilt, magnetic CTAs, sliding nav pill.
 * - Section set pieces: timeline line drawn by scroll, heatmap ripple,
 *   stat count-ups, floating gear, velocity-reactive tech marquee.
 *
 * Dynamic content (tech stack, honors, explorer) is picked up by a debounced
 * MutationObserver. Under reduced motion only the nav indicator runs.
 */
const SPOTLIGHT_SELECTOR = [
  '.featured-project', '.service-item', '.achievement-card', '.project-item',
  '.timeline-content', '.gear-card', '.stack-item', '.github-heatmap', '.recruiter-cta',
  '.selected-work-card', '.web-destination-card', '.workflow-grid > li', '.honors-stats > div',
].join(',');

const REVEAL_SELECTOR = [
  '.featured-project', '.service-item', '.selected-work-card', '.gear-card', '.web-destination-card',
  '.stack-item', '.timeline-content', '.honors-stats > div', '.workflow-grid > li', '.project-item',
  '.achievement-card', '.project-explorer-timeline > li', '.github-heatmap', '.section-header',
  '.honors-filter-bar', '.workflow-pill-grid', '.year-header', '.featured-projects-heading',
  '.footer-cta', '.site-footer .sidebar', '.site-footer .release-sidebar', '.project-group-header',
].join(',');

const SCRUB_SELECTOR = '.recruiter-cta-copy > p:last-child, .gear-lead, .selected-work-intro > p:last-child';

const SPLIT_SELECTOR = [
  '.article-title', '.featured-projects-heading h3', '.service-title', '.achievements-title',
  '.selected-work h3', '.project-explorer-heading h3', '.workflow-heading h3', '.project-group-title',
].join(',');
// (.section-title is gradient-clipped text; splitting it into transformed
// spans would drop the clip, so it only gets a number and a reveal.)

const NUMBERED_SELECTOR = [
  '.featured-projects-heading h3', '.service-title', '.github-heatmap-title', '.achievements-title',
  '.timeline-section .section-title', '.selected-work h3', '.project-explorer-heading h3', '.workflow-heading h3',
].join(',');

const TILT_SELECTOR = '.featured-project, .selected-work-card, .gear-card, .project-item, .web-destination-card, .achievement-card';
const MAGNETIC_SELECTOR = '[data-magnetic], .recruiter-cta-primary';
const COUNT_SELECTOR = '.honors-stats strong, .github-drilldown-stat strong';

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export class MotionFx {
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly finePointer = window.matchMedia('(pointer: fine)');
  private revealObserver: IntersectionObserver | null = null;
  private scanTimer = 0;
  private spotTarget: HTMLElement | null = null;
  private spotFrame = 0;
  private spotX = 0;
  private spotY = 0;
  private tiltTarget: HTMLElement | null = null;
  private scrollFrame = 0;
  private lastScrollY = window.scrollY;
  private skew = 0;
  private skewFrame = 0;

  init(): void {
    this.setupNavIndicator();
    this.numberSections();
    if (this.reducedMotion.matches) return;

    this.revealObserver = new IntersectionObserver((entries) => this.onReveal(entries), {
      rootMargin: '0px 0px -6% 0px',
      threshold: 0.08,
    });
    this.scan();
    this.setupPageEntrances();
    this.setupScrollEffects();
    new MutationObserver(() => this.scheduleScan())
      .observe(document.querySelector('.main-content') || document.body, { childList: true, subtree: true });

    if (this.finePointer.matches) {
      this.setupGlow();
      this.setupSpotlights();
      this.setupTilt();
      this.setupMagnetic();
    }
  }

  /** 01, 02, 03 … per page, in document order. */
  private numberSections(): void {
    document.querySelectorAll<HTMLElement>('article[data-page]').forEach((article) => {
      article.querySelectorAll<HTMLElement>(NUMBERED_SELECTOR).forEach((heading, i) => {
        heading.dataset.fxIndex = String(i + 1).padStart(2, '0');
      });
    });
  }

  // ---------- discovery ----------

  private scheduleScan(): void {
    window.clearTimeout(this.scanTimer);
    this.scanTimer = window.setTimeout(() => this.scan(), 120);
  }

  /** Opt new elements into motion. Idempotent: everything is flagged once. */
  private scan(): void {
    const fold = window.innerHeight;
    const offscreen = (el: HTMLElement): boolean => {
      const rect = el.getBoundingClientRect();
      return rect.height === 0 || rect.top > fold * 0.98;
    };

    document.querySelectorAll<HTMLElement>(SPLIT_SELECTOR).forEach((el) => {
      if (el.dataset.fxSplit || el.children.length || !el.textContent?.trim()) return;
      el.dataset.fxSplit = '1';
      // Never rebuild a heading that's already painted: it may be the page's
      // LCP element, and swapping its text nodes would void that paint.
      if (!offscreen(el)) return;
      this.splitWords(el);
      el.classList.add('fx-split');
      this.revealObserver?.observe(el);
    });

    document.querySelectorAll<HTMLElement>(SCRUB_SELECTOR).forEach((el) => {
      if (el.dataset.fxScrub || el.children.length || !offscreen(el)) return;
      el.dataset.fxScrub = '1';
      el.classList.add('fx-scrub');
      const words = (el.textContent || '').trim().split(/\s+/);
      el.textContent = '';
      words.forEach((word, i) => {
        const span = document.createElement('span');
        span.className = 'fx-sw';
        span.textContent = word;
        el.appendChild(span);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });

    document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
      if (el.dataset.fx || el.closest('.stage')) return;
      el.dataset.fx = '1';
      if (!offscreen(el)) return;
      el.classList.add('fx-r');
      this.revealObserver?.observe(el);
    });

    this.numberSections();
    document.querySelectorAll<HTMLElement>('.gear-card').forEach((el, i) => el.style.setProperty('--fx-float', String(i)));
    this.armHeatmap();
    this.updateTimelines();
  }

  private splitWords(el: HTMLElement): void {
    const words = (el.textContent || '').trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const outer = document.createElement('span');
      outer.className = 'fx-word';
      const inner = document.createElement('span');
      inner.textContent = word;
      inner.style.setProperty('--w', String(i));
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  private onReveal(entries: IntersectionObserverEntry[]): void {
    this.reveal(entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target as HTMLElement));
  }

  private reveal(elements: HTMLElement[]): void {
    const visible = elements
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

    visible.forEach((el, i) => {
      this.revealObserver?.unobserve(el);
      el.style.setProperty('--fx-d', String(Math.min(i, 8)));
      el.classList.add('fx-in');
      el.querySelectorAll<HTMLElement>(COUNT_SELECTOR).forEach((n) => this.countUp(n, i * 75 + 150));
      if (el.classList.contains('fx-r')) {
        // Hand the element back its own transitions once settled.
        window.setTimeout(() => {
          el.classList.remove('fx-r', 'fx-in');
          el.style.removeProperty('--fx-d');
        }, 1300 + i * 75);
      }
    });
  }

  private countUp(el: HTMLElement, delay: number): void {
    const raw = el.textContent?.trim() || '';
    if (!/^\d[\d,]*$/.test(raw) || el.dataset.fxCounted) return;
    el.dataset.fxCounted = '1';
    const target = Number(raw.replace(/,/g, ''));
    const format = (n: number): string => (raw.includes(',') ? n.toLocaleString() : String(n));
    const start = performance.now() + delay;
    const duration = 1400;
    el.textContent = format(0);
    const tick = (now: number): void => {
      const t = clamp((now - start) / duration, 0, 1);
      el.textContent = format(Math.round(target * (1 - Math.pow(2, -10 * t))));
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = raw;
    };
    requestAnimationFrame(tick);
  }

  // ---------- page switches ----------

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
      });
      void article.offsetWidth; // restart the animation on repeat visits
      article.classList.add('fx-enter');
      // Replay the kinetic title on every visit, not just the first.
      article.querySelectorAll<HTMLElement>('.page-hero .fx-split.fx-in').forEach((title) => {
        title.classList.remove('fx-in');
        requestAnimationFrame(() => requestAnimationFrame(() => title.classList.add('fx-in')));
      });
      requestAnimationFrame(() => this.updateScrubs());
      window.clearTimeout(timer);
      timer = window.setTimeout(() => article.classList.remove('fx-enter'), 1600);
      this.scheduleScan();
    });
  }

  // ---------- scroll-linked ----------

  private setupScrollEffects(): void {
    let idleTimer = 0;
    const settle = (): void => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => this.revealOnScreen(), 180);
    };
    window.addEventListener('resize', settle, { passive: true });
    window.addEventListener('portfolio:pagechange', settle);
    window.addEventListener('load', settle);

    window.addEventListener('scroll', () => {
      settle();
      const y = window.scrollY;
      const delta = y - this.lastScrollY;
      this.lastScrollY = y;
      this.skew = clamp(this.skew - delta * 0.12, -9, 9);
      if (!this.skewFrame) this.skewFrame = requestAnimationFrame(this.settleSkew);
      if (this.scrollFrame) return;
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = 0;
        this.updateTimelines();
        this.updateScrubs();
        this.revealAtPageEnd();
      });
    }, { passive: true });
  }

  /** Marquee leans into fast scrolls, then springs back upright. */
  private settleSkew = (): void => {
    this.skewFrame = 0;
    this.skew *= 0.88;
    document.querySelectorAll<HTMLElement>('.fx-marquee').forEach((m) => m.style.setProperty('--skew', `${this.skew.toFixed(2)}deg`));
    if (Math.abs(this.skew) > 0.02) this.skewFrame = requestAnimationFrame(this.settleSkew);
  };

  private updateTimelines(): void {
    const vh = window.innerHeight;
    document.querySelectorAll<HTMLElement>('article.active .timeline-container').forEach((tl) => {
      const rect = tl.getBoundingClientRect();
      if (!rect.height) return;
      const progress = clamp((vh * 0.78 - rect.top) / rect.height, 0, 1);
      tl.style.setProperty('--tl', progress.toFixed(3));
    });
  }

  /**
   * Items hugging the very bottom of the page can never cross the reveal
   * threshold, so once the reader reaches the end, show whatever is on screen.
   */
  private revealAtPageEnd(): void {
    const doc = document.documentElement;
    if (window.scrollY + window.innerHeight < doc.scrollHeight - 4) return;
    this.revealOnScreen();
  }

  /**
   * Safety net behind the observer: reveal anything on screen that is still
   * hidden. Observers can miss elements whose box moves mid-transition, that
   * grow while lazy content loads, or that sit at the very end of a page.
   */
  private revealOnScreen(): void {
    const vh = window.innerHeight;
    const pending = Array.from(document.querySelectorAll<HTMLElement>('.fx-r:not(.fx-in), .fx-split:not(.fx-in)'))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.height > 0 && rect.top < vh && rect.bottom > 0;
      });
    if (pending.length) this.reveal(pending);
  }

  /** Words light up in reading order as the paragraph travels up the screen. */
  private updateScrubs(): void {
    const vh = window.innerHeight;
    document.querySelectorAll<HTMLElement>('article.active .fx-scrub, .fx-scrub:not(article *)').forEach((p) => {
      const rect = p.getBoundingClientRect();
      if (!rect.height || rect.top > vh || rect.bottom < 0) return;
      const progress = clamp((vh * 0.88 - rect.top) / (rect.height + vh * 0.32), 0, 1);
      const words = p.querySelectorAll<HTMLElement>('.fx-sw');
      const lit = Math.round(progress * words.length);
      if (Number(p.dataset.lit) === lit) return;
      p.dataset.lit = String(lit);
      words.forEach((w, i) => w.classList.toggle('on', i < lit));
    });
  }

  /** A soft light that trails the cursor across the backdrop. */
  private setupGlow(): void {
    const glow = document.createElement('div');
    glow.className = 'fx-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 3;
    let x = tx;
    let y = ty;
    let frame = 0;
    const loop = (): void => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      glow.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    window.addEventListener('pointermove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!frame) frame = requestAnimationFrame(loop);
    }, { passive: true });
    loop();
  }

  private armHeatmap(): void {
    const grid = document.querySelector<HTMLElement>('.github-heatmap-grid');
    if (!grid || grid.dataset.fxArmed) return;
    const cells = grid.querySelectorAll<HTMLElement>('.github-heatmap-cell');
    if (!cells.length) return;
    grid.dataset.fxArmed = '1';
    cells.forEach((cell, i) => cell.style.setProperty('--hc', String(Math.floor(i / 7))));
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      grid.classList.add('fx-ripple');
    }, { threshold: 0.25 });
    io.observe(grid);
  }

  // ---------- pointer ----------

  private setupSpotlights(): void {
    document.addEventListener('pointerover', (e) => {
      const host = (e.target as Element | null)?.closest?.<HTMLElement>(SPOTLIGHT_SELECTOR);
      if (!host || host.closest('.stage') || host.querySelector(':scope > .fx-spot')) return;
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

  /** Gentle 3D tilt toward the pointer on large cards. */
  private setupTilt(): void {
    const reset = (el: HTMLElement | null): void => {
      if (!el) return;
      el.classList.remove('is-tilting');
      el.style.transform = '';
    };
    document.addEventListener('pointermove', (e) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(TILT_SELECTOR) || null;
      if (el !== this.tiltTarget) {
        reset(this.tiltTarget);
        this.tiltTarget = el;
      }
      if (!el || el.closest('.stage')) return;
      el.classList.add('fx-tilt', 'is-tilting');
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(1100px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-4px)`;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => reset(this.tiltTarget));
    window.addEventListener('blur', () => reset(this.tiltTarget));
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
}
