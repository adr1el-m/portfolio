import { logger } from '@/config';

/** Displays a count supplied by the server. Browser code never writes Firebase. */
export class VisitorCounter {
    private visitorCountEl: HTMLElement | null = null;

    constructor() {
        void this.init();
    }

    private async init(): Promise<void> {
        this.createCounterUI();
        const excluded = this.isExcluded();
        const counted = sessionStorage.getItem('portfolio-visit-counted') === 'true';
        const method = !excluded && !counted ? 'POST' : 'GET';

        try {
            const response = await fetch('/api/visits', {
                method,
                headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
                cache: 'no-store',
                credentials: 'same-origin',
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const payload = await response.json() as { count?: unknown };
            if (typeof payload.count !== 'number' || !Number.isFinite(payload.count)) throw new Error('Invalid count');
            if (method === 'POST') sessionStorage.setItem('portfolio-visit-counted', 'true');
            this.updateDisplay(payload.count);
        } catch (error) {
            logger.warn('VisitorCounter: secure count unavailable', error);
            this.updateUnavailable();
        }
    }

    private isExcluded(): boolean {
        const value = new URLSearchParams(window.location.search).get('admin') || new URLSearchParams(window.location.search).get('exclude');
        if (['1', 'true', 'yes', 'me'].includes((value || '').toLowerCase())) {
            sessionStorage.setItem('portfolio-visitor-counter-excluded', 'true');
        }
        return sessionStorage.getItem('portfolio-visitor-counter-excluded') === 'true';
    }

    private createCounterUI(): void {
        const sidebarInfo = document.querySelector('.sidebar-info_more');
        if (!sidebarInfo || document.querySelector('.visitor-counter')) return;
        const counterWrapper = document.createElement('div');
        counterWrapper.className = 'visitor-counter';
        counterWrapper.innerHTML = `<div class="visitor-counter-inner"><ion-icon name="eye-outline" class="visitor-icon"></ion-icon><span class="visitor-count" id="visitor-count">…</span><span class="visitor-label">Total Visits</span></div>`;
        sidebarInfo.insertBefore(counterWrapper, sidebarInfo.querySelector('.contacts-list') || sidebarInfo.firstChild);
        this.visitorCountEl = document.getElementById('visitor-count');
        this.addStyles();
    }

    private addStyles(): void {
        if (document.getElementById('visitor-counter-styles')) return;
        const style = document.createElement('style');
        style.id = 'visitor-counter-styles';
        style.textContent = `.visitor-counter{display:flex;justify-content:center;margin-bottom:20px;padding:10px 0}.visitor-counter-inner{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(255,219,112,.08);border:1px solid rgba(255,219,112,.2);border-radius:20px;font-size:13px;color:var(--light-gray)}.visitor-icon{color:var(--orange-yellow-crayola);font-size:16px}.visitor-count{font-weight:600;color:var(--white-1);min-width:12px;text-align:center;font-variant-numeric:tabular-nums}.visitor-label{color:var(--light-gray-70);font-size:12px}`;
        document.head.appendChild(style);
    }

    private updateDisplay(count: number): void {
        this.visitorCountEl ||= document.getElementById('visitor-count');
        if (this.visitorCountEl) this.visitorCountEl.textContent = new Intl.NumberFormat().format(count);
    }

    private updateUnavailable(): void {
        this.visitorCountEl ||= document.getElementById('visitor-count');
        if (this.visitorCountEl) {
            this.visitorCountEl.textContent = '—';
            this.visitorCountEl.title = 'The secure visit counter is temporarily unavailable.';
        }
    }

    public destroy(): void {
        this.visitorCountEl?.closest('.visitor-counter')?.remove();
        document.getElementById('visitor-counter-styles')?.remove();
    }
}
