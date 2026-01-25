import { logger } from '@/config';

/**
 * Scroll Progress Module
 * Displays a progress bar at the top of the viewport indicating scroll position
 */
export class ScrollProgress {
    private progressBar: HTMLElement | null = null;

    constructor() {
        this.init();
    }

    private init(): void {
        // Create progress bar element
        this.progressBar = document.createElement('div');
        this.progressBar.id = 'scroll-progress';
        this.progressBar.setAttribute('role', 'progressbar');
        this.progressBar.setAttribute('aria-label', 'Page scroll progress');
        this.progressBar.setAttribute('aria-valuemin', '0');
        this.progressBar.setAttribute('aria-valuemax', '100');
        this.progressBar.setAttribute('aria-valuenow', '0');

        // Apply styles
        Object.assign(this.progressBar.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '0%',
            height: '3px',
            background: 'linear-gradient(90deg, #ffdb70, #ffd93d)',
            zIndex: '9999',
            transition: 'width 50ms ease-out',
            boxShadow: '0 0 10px rgba(255, 219, 112, 0.5)',
            pointerEvents: 'none',
        });

        document.body.appendChild(this.progressBar);

        // Listen for scroll events with passive option for performance
        window.addEventListener('scroll', () => this.updateProgress(), { passive: true });

        // Initial update
        this.updateProgress();

        logger.log('ScrollProgress: initialized');
    }

    private updateProgress(): void {
        if (!this.progressBar) return;

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;

        this.progressBar.style.width = `${progress}%`;
        this.progressBar.setAttribute('aria-valuenow', String(Math.round(progress)));
    }

    public destroy(): void {
        this.progressBar?.remove();
        this.progressBar = null;
    }
}
