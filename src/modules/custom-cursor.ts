
export class CustomCursor {
  private cursor: HTMLElement | null = null;
  private cursorDot: HTMLElement | null = null;

  private targetX = 0;
  private targetY = 0;
  private cursorX = 0;
  private cursorY = 0;
  private rafId: number | null = null;
  private hasMoved = false;
  private readonly finePointer = window.matchMedia('(pointer: fine)');
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  private readonly clickableSelector = 'a, button, .content-card, input, textarea, .clickable';

  private onPointerMove = (e: PointerEvent) => {
    if (!this.finePointer.matches || this.reducedMotion.matches || e.pointerType === 'touch') {
      this.deactivate();
      return;
    }
    this.targetX = e.clientX;
    this.targetY = e.clientY;
    if (!this.hasMoved) {
      this.hasMoved = true;
      this.cursorX = this.targetX;
      this.cursorY = this.targetY;
      this.render(true);
      document.documentElement.classList.add('custom-cursor-active');
      this.startLoop();
      return;
    }
    this.startLoop();
  };

  private onPointerOver = (e: PointerEvent) => {
    const target = e.target as Element | null;
    if (!target) return;
    if (target.closest(this.clickableSelector)) {
      this.cursor?.classList.add('hovered');
    }
  };

  private onPointerOut = (e: PointerEvent) => {
    const from = e.target as Element | null;
    if (!from) return;
    const fromClickable = from.closest(this.clickableSelector);
    if (!fromClickable) return;

    const to = e.relatedTarget as Element | null;
    if (to && fromClickable.contains(to)) return;

    this.cursor?.classList.remove('hovered');
  };

  private onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') {
      this.deactivate();
    }
  };

  private deactivate = () => {
    document.documentElement.classList.remove('custom-cursor-active');
    this.cursor?.classList.remove('hovered');
    this.stopLoop();
    this.hasMoved = false;
  };

  constructor() {
    // Keep the native cursor until the first eligible pointer movement.
    document.documentElement.classList.remove('custom-cursor-active');
    document.querySelectorAll('.custom-cursor, .custom-cursor-dot').forEach((el) => el.remove());

    this.cursor = document.createElement('div');
    this.cursor.classList.add('custom-cursor');
    this.cursor.setAttribute('aria-hidden', 'true');
    
    this.cursorDot = document.createElement('div');
    this.cursorDot.classList.add('custom-cursor-dot');
    this.cursorDot.setAttribute('aria-hidden', 'true');

    document.body.appendChild(this.cursor);
    document.body.appendChild(this.cursorDot);

    this.init();
  }

  private init(): void {
    if (!this.cursor || !this.cursorDot) return;

    this.setTransform(this.cursor, -9999, -9999);
    this.setTransform(this.cursorDot, -9999, -9999);

    document.addEventListener('pointermove', this.onPointerMove, { passive: true });
    document.addEventListener('pointerover', this.onPointerOver, { passive: true });
    document.addEventListener('pointerout', this.onPointerOut, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    document.documentElement.addEventListener('pointerleave', this.deactivate);
    window.addEventListener('blur', this.deactivate);
    this.finePointer.addEventListener('change', this.deactivate);
    this.reducedMotion.addEventListener('change', this.deactivate);
  }

  private startLoop(): void {
    if (this.rafId !== null) return;
    const tick = () => {
      this.render(false);
      if (this.rafId !== null) {
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.rafId === null) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private render(force: boolean): void {
    if (!this.cursor || !this.cursorDot) return;
    if (!this.hasMoved) return;

    const dx = this.targetX - this.cursorX;
    const dy = this.targetY - this.cursorY;
    const dist = Math.hypot(dx, dy);
    const easing = force ? 1 : Math.min(0.65, Math.max(0.25, 0.22 + dist * 0.0045));

    if (force) {
      this.cursorX = this.targetX;
      this.cursorY = this.targetY;
    } else {
      this.cursorX += dx * easing;
      this.cursorY += dy * easing;
    }

    this.setTransform(this.cursorDot, this.targetX, this.targetY);
    this.setTransform(this.cursor, this.cursorX, this.cursorY);

    if (!force && dist < 0.25) {
      this.cursorX = this.targetX;
      this.cursorY = this.targetY;
      this.setTransform(this.cursor, this.cursorX, this.cursorY);
      this.stopLoop();
    }
  }

  private setTransform(el: HTMLElement, x: number, y: number): void {
    el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }
}
