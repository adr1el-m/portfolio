/**
 * Tooltip Portal
 * Renders `[data-tooltip]` messages in a body-level overlay to avoid clipping
 * inside containers with `overflow: hidden` (e.g., the sidebar).
 */

export class TooltipPortal {
  private portal: HTMLDivElement | null = null;
  private arrow: HTMLDivElement | null = null;
  private activeEl: HTMLElement | null = null;
  private hideTimeout: number | null = null;

  constructor() {
    this.injectStyles();
    this.createPortal();
    this.bindEvents();
    document.body.classList.add('has-tooltip-portal');
  }

  private injectStyles(): void {
    if (document.getElementById('tooltip-portal-styles')) return;

    const style = document.createElement('style');
    style.id = 'tooltip-portal-styles';
    style.textContent = `
      #tooltip-portal {
        position: fixed;
        z-index: 10000;
        background: linear-gradient(145deg, #2c2c2c, #1a1a1a);
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
        border: 1px solid rgba(255, 219, 112, 0.3);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        opacity: 0;
        transform: translateY(-2px) scale(0.98);
        transition: opacity 160ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
        pointer-events: none;
        visibility: hidden;
        will-change: transform, opacity;
        contain: paint;
      }
      #tooltip-portal.show {
        opacity: 1;
        transform: translateY(0) scale(1);
        visibility: visible;
      }
      #tooltip-portal .tooltip-arrow {
        position: absolute;
        bottom: -6px;
        left: 12px;
        width: 0; height: 0;
        border: 6px solid transparent;
        border-top-color: #2c2c2c;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
      }
      @media (pointer: coarse) {
        #tooltip-portal { font-size: 12px; }
      }
      @media (prefers-reduced-motion: reduce) {
        #tooltip-portal { transition: opacity 1ms linear; transform: none; }
        #tooltip-portal.show { transform: none; }
      }
    `;
    document.head.appendChild(style);
  }

  private createPortal(): void {
    this.portal = document.createElement('div');
    this.portal.id = 'tooltip-portal';
    this.arrow = document.createElement('div');
    this.arrow.className = 'tooltip-arrow';
    this.portal.appendChild(this.arrow);
    document.body.appendChild(this.portal);
  }

  private bindEvents(): void {
    const targets = document.querySelectorAll<HTMLElement>('.sidebar [data-tooltip]');
    targets.forEach(el => {
      el.addEventListener('mouseenter', () => this.show(el));
      el.addEventListener('mouseleave', () => this.hide());
      el.addEventListener('focus', () => this.show(el));
      el.addEventListener('blur', () => this.hide());
      el.addEventListener('touchstart', () => this.show(el), { passive: true });
      el.addEventListener('touchend', () => this.hide(), { passive: true });
      el.addEventListener('touchcancel', () => this.hide(), { passive: true });
    });

    window.addEventListener('scroll', () => this.reposition());
    window.addEventListener('resize', () => this.reposition());
  }

  private show(el: HTMLElement): void {
    if (!this.portal) return;
    this.activeEl = el;

    const text = el.getAttribute('data-tooltip') || '';
    this.portal.textContent = text;
    // Re-append arrow after textContent replacement
    if (this.arrow) this.portal.appendChild(this.arrow);

    // Position before showing to avoid top-left flicker
    this.positionPortal(el);

    // Show with fade/slide ease
    this.portal.classList.add('show');

    // Auto-hide after 3s on touch devices
    if (matchMedia('(pointer: coarse)').matches) {
      if (this.hideTimeout) {
        window.clearTimeout(this.hideTimeout);
      }
      this.hideTimeout = window.setTimeout(() => this.hide(), 3000);
    }
  }

  private hide(): void {
    if (!this.portal) return;
    this.portal.classList.remove('show');
    this.portal.style.left = '-9999px';
    this.portal.style.top = '-9999px';
    this.activeEl = null;
  }

  private reposition(): void {
    if (this.activeEl) {
      this.positionPortal(this.activeEl);
    }
  }

  private positionPortal(el: HTMLElement): void {
    if (!this.portal) return;
    const rect = el.getBoundingClientRect();

    // Measure current portal size (works even when hidden)
    const portalRect = this.portal.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top - portalRect.height - 10; // 10px gap

    // Keep within viewport horizontally
    left = Math.max(8, Math.min(left, window.innerWidth - portalRect.width - 8));

    // If clipped at the top, place below the element
    if (top < 8) {
      top = rect.bottom + 10;
      if (this.arrow) {
        this.arrow.style.top = '-6px';
        this.arrow.style.bottom = 'auto';
        this.arrow.style.borderTopColor = 'transparent';
        this.arrow.style.borderBottomColor = '#2c2c2c';
      }
    } else if (this.arrow) {
      this.arrow.style.top = 'auto';
      this.arrow.style.bottom = '-6px';
      this.arrow.style.borderBottomColor = 'transparent';
      this.arrow.style.borderTopColor = '#2c2c2c';
    }

    this.portal.style.left = `${left}px`;
    this.portal.style.top = `${top}px`;
  }
}