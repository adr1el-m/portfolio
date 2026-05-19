/**
 * Lightweight canvas particle background.
 * Keeps the portfolio ambience without loading Three.js or running expensive
 * 3D connection checks on every frame.
 */
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
};

export class ParticleBackground {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrame = 0;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private mouseX = -9999;
  private mouseY = -9999;
  private readonly particleCount: number;
  private readonly maxDistance: number;

  private readonly handleResize = (): void => this.resize();
  private readonly handleMouseMove = (event: MouseEvent): void => {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
  };
  private readonly handleMouseLeave = (): void => {
    this.mouseX = -9999;
    this.mouseY = -9999;
  };
  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.stop();
    } else {
      this.start();
    }
  };

  constructor(containerId: string) {
    const canvas = document.getElementById(containerId);
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas with id "${containerId}" not found.`);
    }

    const isMobile = window.innerWidth < 768;
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      throw new Error('Canvas 2D context is unavailable.');
    }
    this.ctx = ctx;
    this.particleCount = isMobile ? 45 : 110;
    this.maxDistance = isMobile ? 95 : 130;

    this.configureCanvasStyle();
    this.resize();
    this.createParticles();
    this.bindEvents();
    this.start();
  }

  private configureCanvasStyle(): void {
    Object.assign(this.canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '-1',
    });
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private createParticles(): void {
    this.particles = Array.from({ length: this.particleCount }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      radius: Math.random() * 1.7 + 0.6,
      alpha: Math.random() * 0.45 + 0.25,
    }));
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', this.handleMouseLeave, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private start(): void {
    if (this.animationFrame) return;
    this.animationFrame = window.requestAnimationFrame(() => this.animate());
  }

  private stop(): void {
    if (!this.animationFrame) return;
    window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  private animate(): void {
    this.animationFrame = window.requestAnimationFrame(() => this.animate());
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.updateParticles();
    this.drawConnections();
    this.drawParticles();
  }

  private updateParticles(): void {
    this.particles.forEach((particle) => {
      const dx = particle.x - this.mouseX;
      const dy = particle.y - this.mouseY;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared < 9000 && distanceSquared > 0.01) {
        const distance = Math.sqrt(distanceSquared);
        const force = (1 - distance / 95) * 0.018;
        particle.vx += (dx / distance) * force;
        particle.vy += (dy / distance) * force;
      }

      particle.vx *= 0.992;
      particle.vy *= 0.992;
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < -20) particle.x = this.width + 20;
      if (particle.x > this.width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = this.height + 20;
      if (particle.y > this.height + 20) particle.y = -20;
    });
  }

  private drawParticles(): void {
    this.particles.forEach((particle) => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 219, 112, ${particle.alpha})`;
      this.ctx.fill();
    });
  }

  private drawConnections(): void {
    this.ctx.lineWidth = 0.6;

    for (let i = 0; i < this.particles.length; i++) {
      const a = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j++) {
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSquared = dx * dx + dy * dy;
        const maxDistanceSquared = this.maxDistance * this.maxDistance;

        if (distanceSquared > maxDistanceSquared) continue;

        const alpha = (1 - Math.sqrt(distanceSquared) / this.maxDistance) * 0.16;
        this.ctx.beginPath();
        this.ctx.moveTo(a.x, a.y);
        this.ctx.lineTo(b.x, b.y);
        this.ctx.strokeStyle = `rgba(255, 219, 112, ${alpha})`;
        this.ctx.stroke();
      }
    }
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseleave', this.handleMouseLeave);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
