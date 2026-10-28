/**
 * Stage — the cinematic intro.
 *
 * - Kinetic wordmark: letters rise in, then lean toward the pointer
 *   (weight + lift via the variable display face).
 * - Orbit: proof photos travel an elliptical path around the name, passing
 *   behind the copy at the back and in front of it at the front. Drag to
 *   spin (with inertia), hover/focus to pause, scroll to fling outward.
 * - Counters, a word rotator, and a scroll-linked exit (--p).
 *
 * Under reduced motion the stage stays in its static CSS layout.
 */
import { navigateToPage, openPortfolioProject, type PortfolioPage } from './portfolio-actions';

type OrbitCard = { el: HTMLElement; link: HTMLAnchorElement | null; tilt: number };
type WordChar = { el: HTMLElement; x: number; y: number };

const TAU = Math.PI * 2;
const BASE_SPEED = 0.085; // rad/s — one revolution in ~74s
const PODIUM_RIBBON = /^(champion|1st place|2nd place|3rd place|2nd runner-up|winner|best in pitching)$/i;

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export class Stage {
  private readonly root: HTMLElement;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly finePointer = window.matchMedia('(pointer: fine)');

  private cards: OrbitCard[] = [];
  private chars: WordChar[] = [];
  private plane: SVGGElement | null = null;

  private width = 0;
  private height = 0;
  private centerY = 0;
  private radiusX = 0;
  private radiusY = 0;

  private angle = 0;
  private velocity = 0; // extra rad/s from drag/scroll, decays to 0
  private speedFactor = 1; // eased toward 0 while a card is hovered
  private hovering = false;
  private roll = -7;
  private targetRoll = -7;
  private pointerX = -9999;
  private pointerY = -9999;
  private progress = 0;
  private lastScrollY = window.scrollY;

  private dragging = false;
  private dragMoved = false;
  private dragLastX = 0;
  private dragLastT = 0;

  private rafId = 0;
  private lastFrame = 0;
  private visible = true;
  private settled = false;

  private readonly calm: boolean;

  constructor(root: HTMLElement, options: { calm?: boolean } = {}) {
    this.root = root;
    this.calm = Boolean(options.calm);
  }

  init(): void {
    if (document.documentElement.classList.contains('stage-off')) return;

    this.syncStats();
    this.bindNavigation();
    this.tuckSiteNav();

    if (this.calm || this.reducedMotion.matches) return;

    this.cards = Array.from(this.root.querySelectorAll<HTMLElement>('.orbit-card')).map((el, i) => ({
      el,
      link: el.querySelector('a'),
      tilt: ((i * 37) % 11) - 5, // deterministic, slightly hand-placed look
    }));
    this.cards.forEach(({ el, tilt }) => el.style.setProperty('--tilt', `${tilt}deg`));
    this.plane = this.root.querySelector<SVGGElement>('[data-stage-plane]');

    const marquee = this.root.querySelector<HTMLElement>('.stage-marquee-track');
    if (marquee) marquee.innerHTML += marquee.innerHTML; // seamless loop

    this.root.classList.add('is-live');
    const visible = this.cards.filter((c) => c.el.offsetParent !== null).length || 1;
    this.angle = -Math.PI / 2 + Math.PI / visible; // matches the CSS ring's first card
    this.measure();
    this.bindInteractions();
    this.startLoop();
    // Keep the descriptive copy stable while the orbit animates.

    // The CSS entrance starts at first paint; only count up if the stats
    // haven't appeared yet (fast load), otherwise leave the final numbers.
    if (performance.now() < 650) this.countUp(Math.max(0, 700 - performance.now()));

    // The wordmark ships pre-split (no runtime DOM change, no repaint). Measure
    // letter centres for pointer play once the entrance and font have settled.
    const entranceLeft = Math.max(0, 1300 - performance.now());
    void Promise.all([this.whenFontReady(), new Promise((r) => window.setTimeout(r, entranceLeft))]).then(() => {
      this.measureChars();
      this.settled = true;
    });
  }

  // ---------- setup ----------

  private whenFontReady(): Promise<void> {
    const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 1100));
    if (!document.fonts?.load) return timeout;
    const font = document.fonts.ready.then(() => undefined).catch(() => undefined);
    return Promise.race([font, timeout]);
  }

  /** The intro has its own bar; keep the site nav tucked away until it's left. */
  private tuckSiteNav(): void {
    const root = document.documentElement;
    new IntersectionObserver(([entry]) => {
      root.classList.toggle('nav-free', !entry?.isIntersecting);
    }, { rootMargin: '0px 0px -88% 0px' }).observe(this.root);
  }

  /** Keep headline numbers honest: derive them from the award cards. */
  private syncStats(): void {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.awards-timeline .achievement-card'));
    if (!cards.length) return;
    const ribbons = cards.map((card) => card.querySelector('.award-ribbon')?.textContent?.trim() || '');
    const values: Record<string, number> = {
      honors: cards.length,
      podiums: ribbons.filter((r) => PODIUM_RIBBON.test(r)).length,
      champions: ribbons.filter((r) => /^champion$/i.test(r)).length,
    };
    this.root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      const value = values[el.dataset.count || ''];
      if (value) {
        el.textContent = String(value);
        el.dataset.target = String(value);
      }
    });
  }

  private measure(): void {
    const rect = this.root.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    const mobile = this.width <= 720;
    const firstCard = this.cards[0]?.el;
    const cardCenterTop = firstCard ? parseFloat(getComputedStyle(firstCard).top) : this.height * 0.46;
    this.centerY = cardCenterTop;

    if (mobile) {
      this.radiusX = window.innerWidth * 0.4;
      this.radiusY = clamp(window.innerHeight * 0.09, 56, 90);
    } else {
      // Keep in sync with .orbit-card --rx / --ry in stage.css.
      this.radiusX = Math.min(window.innerWidth * 0.43, 660);
      this.radiusY = clamp(window.innerHeight * 0.27, 140, 290);
    }

    if (this.plane) {
      // SVG viewBox is 1400x800 centered on 0,0; map the orbit ellipse into it.
      const scale = Math.max(1400 / this.width, 800 / this.height);
      const ty = (this.centerY - this.height / 2) * scale;
      this.plane.querySelectorAll('ellipse').forEach((ellipse, i) => {
        const k = [1, 1, 1.09, 0.84][i] ?? 1;
        const ky = [1, 1, 1.25, 0.74][i] ?? 1;
        ellipse.setAttribute('rx', String(this.radiusX * scale * k));
        ellipse.setAttribute('ry', String(this.radiusY * scale * ky));
        ellipse.setAttribute('cy', String(ty));
      });
    }
    if (this.settled) this.measureChars();
  }

  private measureChars(): void {
    const rootRect = this.root.getBoundingClientRect();
    this.chars = Array.from(this.root.querySelectorAll<HTMLElement>('.wm-char')).map((el) => {
      const r = el.getBoundingClientRect();
      return { el, x: r.left - rootRect.left + r.width / 2, y: r.top - rootRect.top + r.height / 2 };
    });
  }

  // ---------- interaction ----------

  private bindInteractions(): void {
    const onResize = (): void => this.measure();
    window.addEventListener('resize', onResize, { passive: true });
    document.fonts?.addEventListener?.('loadingdone', onResize);

    this.root.addEventListener('pointermove', (e) => {
      const rect = this.root.getBoundingClientRect();
      this.pointerX = e.clientX - rect.left;
      this.pointerY = e.clientY - rect.top;
      const nx = this.pointerX / Math.max(1, this.width) - 0.5;
      this.targetRoll = -7 + nx * 10;
      if (this.dragging) this.onDrag(e);
    }, { passive: true });

    this.root.addEventListener('pointerleave', () => {
      this.pointerX = this.pointerY = -9999;
      this.targetRoll = -7;
    });

    // Drag anywhere that isn't a control to spin the orbit.
    this.root.addEventListener('pointerdown', (e) => {
      const target = e.target as Element;
      if (e.button !== 0 || target.closest('.stage-center a, .stage-nav, .stage-stats, .stage-scroll')) return;
      this.dragging = true;
      this.dragMoved = false;
      this.dragLastX = e.clientX;
      this.dragLastT = performance.now();
      this.root.classList.add('is-dragging');
    });
    const endDrag = (): void => {
      if (!this.dragging) return;
      this.dragging = false;
      this.root.classList.remove('is-dragging');
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    // A drag that started on a card must not also follow its link.
    this.root.querySelector('[data-orbit]')?.addEventListener('click', (e) => {
      if (this.dragMoved) {
        e.preventDefault();
        e.stopPropagation();
        this.dragMoved = false;
      }
    }, true);

    const orbit = this.root.querySelector<HTMLElement>('[data-orbit]');
    orbit?.addEventListener('pointerover', (e) => {
      if ((e.target as Element).closest('.orbit-card')) this.hovering = true;
    });
    orbit?.addEventListener('pointerout', (e) => {
      if (!(e.relatedTarget as Element | null)?.closest?.('.orbit-card')) this.hovering = false;
    });
    orbit?.addEventListener('focusin', (e) => {
      this.hovering = true;
      (e.target as Element).closest<HTMLElement>('.orbit-card')?.style.setProperty('z-index', '12');
    });
    orbit?.addEventListener('focusout', () => {
      this.hovering = false;
    });

    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      const delta = y - this.lastScrollY;
      this.lastScrollY = y;
      if (this.visible) this.velocity = clamp(this.velocity + delta * 0.0025, -3, 3);
    }, { passive: true });

    new IntersectionObserver(([entry]) => {
      this.visible = Boolean(entry?.isIntersecting);
      if (this.visible) this.startLoop();
    }).observe(this.root);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stopLoop();
      else this.startLoop();
    });

    if (this.finePointer.matches) this.bindMagnetic();
  }

  private onDrag(e: PointerEvent): void {
    const now = performance.now();
    const dx = e.clientX - this.dragLastX;
    const dt = Math.max(8, now - this.dragLastT);
    if (Math.abs(dx) > 2) this.dragMoved = true;
    this.angle += dx * 0.004;
    this.velocity = clamp((dx / dt) * 4, -6, 6);
    this.dragLastX = e.clientX;
    this.dragLastT = now;
  }

  private bindMagnetic(): void {
    this.root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * 0.28}px`);
        el.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * 0.4}px`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  }

  private bindNavigation(): void {
    this.root.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const link = (e.target as Element).closest<HTMLAnchorElement>('a');
      if (!link) return;

      if (link.matches('.stage-mark')) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: this.scrollBehavior() });
        return;
      }
      if (link.matches('[data-stage-scroll]')) {
        e.preventDefault();
        this.scrollToContent();
        return;
      }

      const page = link.dataset.stagePage as PortfolioPage | undefined;
      if (page) {
        e.preventDefault();
        const anchor = link.dataset.stageAnchor;
        void this.scrollToContent().then(() => {
          navigateToPage(page, anchor ? { scrollSelector: anchor } : {});
        });
        return;
      }

      const honor = link.dataset.orbitHonor;
      if (honor) {
        e.preventDefault();
        void this.scrollToContent().then(() => this.openHonor(honor));
        return;
      }

      const project = link.dataset.orbitProject;
      if (project) {
        e.preventDefault();
        void this.scrollToContent().then(() => openPortfolioProject(project));
      }
    });
  }

  /**
   * Opens an honor's card directly. The honor-route module (and the year
   * accordion) load lazily when the section nears the viewport, so an event
   * fired from up here would arrive before anyone is listening.
   */
  private async openHonor(title: string): Promise<void> {
    const slug = (text: string): string => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const needle = slug(title);
    const card = Array.from(document.querySelectorAll<HTMLElement>('.awards-timeline .achievement-card')).find((el) => {
      const cardTitle = slug(el.querySelector('.card-title')?.textContent || '');
      return cardTitle === needle || cardTitle.includes(needle) || needle.includes(cardTitle);
    });
    navigateToPage('about', { track: false });
    if (!card) return;

    const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));
    document.querySelector('section.achievements')?.scrollIntoView({ block: 'start' });
    const group = card.closest<HTMLElement>('.year-content');
    const header = group?.id ? document.querySelector<HTMLButtonElement>(`[aria-controls="${group.id}"]`) : null;
    // Give the accordion a moment to load, then expand the card's year.
    for (let i = 0; i < 20 && group && !group.classList.contains('active'); i++) {
      await wait(120);
      if (i % 4 === 3) header?.click();
    }
    card.scrollIntoView({ behavior: this.scrollBehavior(), block: 'center' });
    await wait(420);
    card.click();
  }

  private scrollBehavior(): ScrollBehavior {
    return this.reducedMotion.matches ? 'auto' : 'smooth';
  }

  private scrollToContent(): Promise<void> {
    const main = document.getElementById('main-content');
    if (!main) return Promise.resolve();
    const top = main.getBoundingClientRect().top + window.scrollY;
    if (Math.abs(window.scrollY - top) < 4) return Promise.resolve();
    window.scrollTo({ top, behavior: this.scrollBehavior() });
    return new Promise((resolve) => {
      let done = false;
      const finish = (): void => {
        if (done) return;
        done = true;
        window.removeEventListener('scrollend', finish);
        resolve();
      };
      window.addEventListener('scrollend', finish, { once: true });
      window.setTimeout(finish, 900);
    });
  }

  // ---------- animation ----------

  private startLoop(): void {
    if (this.rafId || !this.visible || document.hidden || !this.cards.length) return;
    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  private stopLoop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private frame = (now: number): void => {
    this.rafId = 0;
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    // Scroll progress drives the exit choreography.
    this.progress = clamp(window.scrollY / Math.max(1, this.height * 0.85), 0, 1);
    this.root.style.setProperty('--p', this.progress.toFixed(4));

    this.speedFactor = lerp(this.speedFactor, this.hovering && !this.dragging ? 0 : 1, 1 - Math.pow(0.002, dt));
    if (!this.dragging) {
      this.angle += (BASE_SPEED * this.speedFactor + this.velocity) * dt;
      this.velocity *= Math.pow(0.12, dt);
    }
    this.roll = lerp(this.roll, this.targetRoll, 1 - Math.pow(0.05, dt));

    this.renderOrbit();
    if (this.settled) this.renderWordmark();

    if (this.visible && !document.hidden) this.rafId = requestAnimationFrame(this.frame);
  };

  private renderOrbit(): void {
    const visibleCards = this.cards.filter((c) => c.el.offsetParent !== null);
    const n = visibleCards.length;
    if (!n) return;

    const spread = 1 + this.progress * 0.75;
    const rx = this.radiusX * spread;
    const ry = this.radiusY * (1 + this.progress * 1.1);
    const rollRad = (this.roll * Math.PI) / 180;
    const cosR = Math.cos(rollRad);
    const sinR = Math.sin(rollRad);
    const fade = 1 - this.progress * 0.9;

    visibleCards.forEach((card, i) => {
      const a = this.angle + (i / n) * TAU;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      const x = ex * cosR - ey * sinR;
      const y = ex * sinR + ey * cosR;
      const depth = (Math.sin(a) + 1) / 2; // 0 = far (top), 1 = near (bottom)
      const scale = 0.6 + depth * 0.55;
      const front = depth > 0.5;

      card.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      card.el.style.setProperty('--depth', depth.toFixed(3));
      if (card.el !== document.activeElement?.closest('.orbit-card')) {
        card.el.style.zIndex = front ? String(6 + Math.round(depth * 1.5)) : String(1 + Math.round(depth * 3));
      }
      card.el.style.opacity = fade < 1 ? fade.toFixed(3) : '';
    });

    if (this.plane) {
      this.plane.setAttribute('transform', `rotate(${this.roll.toFixed(2)})`);
    }
  }

  private renderWordmark(): void {
    const px = this.pointerX;
    const py = this.pointerY;
    for (const ch of this.chars) {
      const d = Math.hypot(px - ch.x, (py - ch.y) * 1.4);
      const f = clamp(1 - d / 260, 0, 1);
      const eased = f * f * (3 - 2 * f);
      const weight = 800 + eased * 100;
      ch.el.style.setProperty('--w', weight.toFixed(0));
      ch.el.style.setProperty('--lift', `${(-eased * 12).toFixed(2)}px`);
    }
  }

  private countUp(delay: number): void {
    const els = Array.from(this.root.querySelectorAll<HTMLElement>('[data-count]'));
    const targets = els.map((el) => Number(el.dataset.target || el.textContent || 0));
    els.forEach((el) => { el.textContent = '0'; });
    const start = performance.now() + delay;
    const duration = 1600;
    const tick = (now: number): void => {
      const t = clamp((now - start) / duration, 0, 1);
      if (now < start) {
        requestAnimationFrame(tick);
        return;
      }
      const eased = 1 - Math.pow(2, -10 * t);
      els.forEach((el, i) => { el.textContent = String(Math.round(targets[i] * (t === 1 ? 1 : eased))); });
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }



  destroy(): void {
    this.stopLoop();
  }
}
