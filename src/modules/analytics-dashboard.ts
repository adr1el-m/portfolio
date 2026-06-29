type AnalyticsEventType =
  | 'page-view'
  | 'project-open'
  | 'honor-open'
  | 'contact-action'
  | 'chatbot-question'
  | 'contact-submit';

type AnalyticsEvent = {
  type: AnalyticsEventType;
  label: string;
  at: string;
};

type AnalyticsState = {
  firstSeen: string;
  lastSeen: string;
  sessionCount: number;
  pageViews: Record<string, number>;
  projectOpens: Record<string, number>;
  honorOpens: Record<string, number>;
  contactActions: Record<string, number>;
  chatbotQuestions: AnalyticsEvent[];
};

type RemoteSummary = {
  totalEvents: number;
  lastSeen: string | null;
  pageViews: Array<{ label: string; count: number }>;
  projectOpens: Array<{ label: string; count: number }>;
  honorOpens: Array<{ label: string; count: number }>;
  contactActions: Array<{ label: string; count: number }>;
  contactSubmissions?: Array<{ label: string; count: number }>;
  recentQuestions: Array<{ label: string; at: string }>;
};

const STORAGE_KEY = 'portfolio:analytics:v1';

function nowIso(): string {
  return new Date().toISOString();
}

function emptyState(): AnalyticsState {
  const now = nowIso();
  return {
    firstSeen: now,
    lastSeen: now,
    sessionCount: 0,
    pageViews: {},
    projectOpens: {},
    honorOpens: {},
    contactActions: {},
    chatbotQuestions: [],
  };
}

function increment(record: Record<string, number>, key: string): void {
  const safeKey = key.trim() || 'Unknown';
  record[safeKey] = (record[safeKey] || 0) + 1;
}

function topEntries(record: Record<string, number>, limit = 4): Array<[string, number]> {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class AnalyticsDashboard {
  private state: AnalyticsState = emptyState();
  private dashboard: HTMLElement | null = null;
  private toggleButton: HTMLButtonElement | null = null;
  private isAdmin = false;
  private refreshTimer: number | null = null;
  private remoteSummary: RemoteSummary | null = null;

  constructor() {
    this.state = this.loadState();
    this.isAdmin = this.checkIfAdmin();
    this.markSession();
    this.bindTracking();
    this.track('page-view', this.activePageLabel());

    if (this.isAdmin) {
      this.createDashboard();
      void this.loadRemoteSummary();
      this.refresh();
      this.refreshTimer = window.setInterval(() => this.refresh(), 3500);
    }
  }

  private checkIfAdmin(): boolean {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true' || params.get('analytics') === '1') {
      localStorage.setItem('portfolio-admin', 'true');
      return true;
    }
    return localStorage.getItem('portfolio-admin') === 'true';
  }

  private loadState(): AnalyticsState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw) as Partial<AnalyticsState>;
      return {
        ...emptyState(),
        ...parsed,
        pageViews: parsed.pageViews || {},
        projectOpens: parsed.projectOpens || {},
        honorOpens: parsed.honorOpens || {},
        contactActions: parsed.contactActions || {},
        chatbotQuestions: Array.isArray(parsed.chatbotQuestions) ? parsed.chatbotQuestions.slice(-20) : [],
      };
    } catch {
      return emptyState();
    }
  }

  private saveState(): void {
    this.state.lastSeen = nowIso();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage can fail in private windows; the dashboard simply becomes session-only.
    }
  }

  private markSession(): void {
    const sessionKey = 'portfolio:analytics:session';
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, '1');
      this.state.sessionCount += 1;
      this.saveState();
    }
  }

  private bindTracking(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      if (!target) return;

      const nav = target.closest('[data-nav-link]');
      if (nav) {
        window.setTimeout(() => this.track('page-view', this.activePageLabel()), 80);
        return;
      }

      const project = target.closest('.project-item') as HTMLElement | null;
      if (project) {
        const title = project.querySelector('.project-title')?.textContent?.trim();
        if (title) this.track('project-open', title);
        return;
      }

      const honor = target.closest('.achievement-card') as HTMLElement | null;
      if (honor) {
        const title = honor.querySelector('.card-title')?.textContent?.trim();
        if (title) this.track('honor-open', title);
        return;
      }

      const contact = target.closest('.contact-link, .social-link, .contact-flow-action') as HTMLElement | null;
      if (contact) {
        const label = contact.getAttribute('data-analytics-label')
          || contact.getAttribute('aria-label')
          || contact.textContent?.trim()
          || 'Contact click';
        this.track('contact-action', label);
      }
    }, { capture: true });

    window.addEventListener('portfolio:analytics', (event) => {
      const detail = (event as CustomEvent<{ type?: AnalyticsEventType; label?: string }>).detail;
      if (!detail?.type || !detail.label) return;
      this.track(detail.type, detail.label);
    });
  }

  private activePageLabel(): string {
    const activeArticle = document.querySelector<HTMLElement>('article.active[data-page]');
    return activeArticle?.dataset.page || window.location.pathname || 'about';
  }

  private track(type: AnalyticsEventType, label: string): void {
    const safeLabel = label.trim().replace(/\s+/g, ' ').slice(0, 140);
    if (!safeLabel) return;

    switch (type) {
      case 'page-view':
        increment(this.state.pageViews, safeLabel);
        break;
      case 'project-open':
        increment(this.state.projectOpens, safeLabel);
        break;
      case 'honor-open':
        increment(this.state.honorOpens, safeLabel);
        break;
      case 'contact-action':
        increment(this.state.contactActions, safeLabel);
        break;
      case 'contact-submit':
        increment(this.state.contactActions, `Submit: ${safeLabel}`);
        break;
      case 'chatbot-question':
        this.state.chatbotQuestions.push({ type, label: safeLabel, at: nowIso() });
        this.state.chatbotQuestions = this.state.chatbotQuestions.slice(-20);
        break;
    }

    this.saveState();
    void this.sendRemote(type, safeLabel);
    this.refresh();
  }

  private async sendRemote(type: AnalyticsEventType, label: string): Promise<void> {
    if (window.location.protocol === 'file:') return;
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, label, path: window.location.pathname }),
        keepalive: true,
      });
    } catch {
      // Remote analytics is optional; local dashboard remains useful.
    }
  }

  private async loadRemoteSummary(): Promise<void> {
    if (window.location.protocol === 'file:') return;
    try {
      const adminKey = localStorage.getItem('portfolio-admin-key') || '';
      const response = await fetch('/api/analytics', {
        headers: adminKey ? { 'X-Portfolio-Admin-Key': adminKey } : {},
      });
      if (!response.ok) return;
      this.remoteSummary = await response.json() as RemoteSummary;
      this.refresh();
    } catch {
      this.remoteSummary = null;
    }
  }

  private createDashboard(): void {
    if (document.getElementById('portfolio-analytics-dashboard')) return;
    this.injectStyles();

    this.toggleButton = document.createElement('button');
    this.toggleButton.type = 'button';
    this.toggleButton.className = 'analytics-toggle';
    this.toggleButton.setAttribute('aria-label', 'Open visitor analytics dashboard');
    this.toggleButton.setAttribute('aria-expanded', 'false');
    this.toggleButton.innerHTML = '<ion-icon name="analytics-outline" aria-hidden="true"></ion-icon>';

    this.dashboard = document.createElement('aside');
    this.dashboard.id = 'portfolio-analytics-dashboard';
    this.dashboard.className = 'analytics-dashboard';
    this.dashboard.setAttribute('aria-label', 'Visitor analytics dashboard');
    this.dashboard.setAttribute('aria-hidden', 'true');

    this.toggleButton.addEventListener('click', () => this.toggleDashboard());
    document.body.append(this.toggleButton, this.dashboard);
  }

  private toggleDashboard(force?: boolean): void {
    if (!this.dashboard || !this.toggleButton) return;
    const shouldOpen = force ?? !this.dashboard.classList.contains('active');
    this.dashboard.classList.toggle('active', shouldOpen);
    this.dashboard.setAttribute('aria-hidden', String(!shouldOpen));
    this.toggleButton.setAttribute('aria-expanded', String(shouldOpen));
    if (shouldOpen) this.refresh();
  }

  private visitorCount(): string {
    return document.getElementById('visitor-count')?.textContent?.trim() || '...';
  }

  private renderList(entries: Array<[string, number]>, emptyLabel: string): string {
    if (!entries.length) return `<li class="analytics-empty">${escapeHtml(emptyLabel)}</li>`;
    return entries
      .map(([label, count]) => `<li><span>${escapeHtml(label)}</span><strong>${count}</strong></li>`)
      .join('');
  }

  private refresh(): void {
    if (!this.dashboard) return;
    const recentQuestions = this.state.chatbotQuestions.slice(-5).reverse();
    const remote = this.remoteSummary;
    this.dashboard.innerHTML = `
      <div class="analytics-dashboard-header">
        <div>
          <span class="analytics-eyebrow">Private</span>
          <h2>Visitor Analytics</h2>
          <span class="analytics-remote-badge">${remote ? `Server ${remote.totalEvents} events` : 'Local + server-ready'}</span>
        </div>
        <button type="button" class="analytics-close" aria-label="Close analytics dashboard">Close</button>
      </div>
      <div class="analytics-metrics">
        <div><span>Total visits</span><strong>${escapeHtml(this.visitorCount())}</strong></div>
        <div><span>Local sessions</span><strong>${this.state.sessionCount}</strong></div>
        <div><span>Tracked views</span><strong>${Object.values(this.state.pageViews).reduce((sum, count) => sum + count, 0)}</strong></div>
      </div>
      <section>
        <h3>Top Pages</h3>
        <ul>${this.renderList(topEntries(this.state.pageViews), 'No page views yet')}</ul>
      </section>
      <section>
        <h3>Project Interest</h3>
        <ul>${this.renderList(topEntries(this.state.projectOpens), 'No project opens yet')}</ul>
      </section>
      <section>
        <h3>Honors Interest</h3>
        <ul>${this.renderList(topEntries(this.state.honorOpens), 'No honors opened yet')}</ul>
      </section>
      <section>
        <h3>Contact Actions</h3>
        <ul>${this.renderList(topEntries(this.state.contactActions), 'No contact actions yet')}</ul>
      </section>
      <section>
        <h3>Recent AdrAI Questions</h3>
        <ul>${recentQuestions.length
        ? recentQuestions.map((event) => `<li><span>${escapeHtml(event.label)}</span></li>`).join('')
        : '<li class="analytics-empty">No chatbot questions yet</li>'}</ul>
      </section>
      ${remote ? `
      <section>
        <h3>Server Snapshot</h3>
        <ul>
          <li><span>Total server events</span><strong>${remote.totalEvents}</strong></li>
          <li><span>Last event</span><strong>${remote.lastSeen ? new Date(remote.lastSeen).toLocaleString() : 'None'}</strong></li>
        </ul>
      </section>` : ''}
      <div class="analytics-dashboard-actions">
        <button type="button" data-analytics-refresh>Refresh Server</button>
        <button type="button" data-analytics-export>Copy JSON</button>
        <button type="button" data-analytics-reset>Reset Local</button>
      </div>
    `;

    this.dashboard.querySelector('.analytics-close')?.addEventListener('click', () => this.toggleDashboard(false));
    this.dashboard.querySelector('[data-analytics-refresh]')?.addEventListener('click', () => {
      void this.loadRemoteSummary();
    });
    this.dashboard.querySelector('[data-analytics-export]')?.addEventListener('click', () => {
      void navigator.clipboard?.writeText(JSON.stringify(this.state, null, 2));
    });
    this.dashboard.querySelector('[data-analytics-reset]')?.addEventListener('click', () => {
      this.state = emptyState();
      this.markSession();
      this.saveState();
      this.refresh();
    });
  }

  private injectStyles(): void {
    if (document.getElementById('analytics-dashboard-styles')) return;
    const style = document.createElement('style');
    style.id = 'analytics-dashboard-styles';
    style.textContent = `
      .analytics-toggle {
        position: fixed;
        left: calc(22px + env(safe-area-inset-left));
        bottom: calc(22px + env(safe-area-inset-bottom));
        width: 46px;
        height: 46px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        color: var(--orange-yellow-crayola);
        background: linear-gradient(145deg, rgba(37, 37, 39, 0.96), rgba(19, 19, 20, 0.96));
        border: 1px solid rgba(255, 219, 112, 0.28);
        box-shadow: var(--shadow-2);
        z-index: 1050;
      }

      .analytics-toggle ion-icon { font-size: 22px; }

      .analytics-dashboard {
        position: fixed;
        left: calc(22px + env(safe-area-inset-left));
        bottom: calc(78px + env(safe-area-inset-bottom));
        width: min(380px, calc(100vw - 28px));
        max-height: min(720px, calc(100dvh - 110px));
        overflow: auto;
        padding: 16px;
        border-radius: 14px;
        background: rgba(24, 24, 26, 0.97);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
        z-index: 1050;
        opacity: 0;
        pointer-events: none;
        transform: translateY(10px);
        transition: opacity 180ms ease, transform 180ms ease;
      }

      .analytics-dashboard.active {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }

      .analytics-dashboard-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .analytics-eyebrow {
        color: var(--orange-yellow-crayola);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .analytics-dashboard h2 {
        color: var(--white-2);
        font-size: 18px;
        line-height: 1.2;
      }

      .analytics-close,
      .analytics-dashboard-actions button {
        min-height: 34px;
        padding: 7px 10px;
        border-radius: 8px;
        color: var(--white-2);
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .analytics-metrics {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 14px;
      }

      .analytics-metrics div,
      .analytics-dashboard section {
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.035);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .analytics-metrics div {
        padding: 10px;
      }

      .analytics-metrics span {
        color: var(--light-gray-70);
        font-size: 11px;
        line-height: 1.2;
      }

      .analytics-metrics strong {
        color: var(--white-2);
        font-size: 18px;
        line-height: 1.4;
      }

      .analytics-dashboard section {
        padding: 12px;
        margin-top: 10px;
      }

      .analytics-dashboard h3 {
        color: var(--orange-yellow-crayola);
        font-size: 13px;
        margin-bottom: 8px;
      }

      .analytics-dashboard li {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        color: var(--light-gray);
        font-size: 12px;
        line-height: 1.35;
        padding: 5px 0;
      }

      .analytics-dashboard li span {
        min-width: 0;
      }

      .analytics-dashboard li strong {
        color: var(--white-2);
        flex: none;
      }

      .analytics-empty {
        opacity: 0.68;
      }

      .analytics-dashboard-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      @media (max-width: 580px) {
        .analytics-toggle {
          left: 12px;
          bottom: calc(76px + env(safe-area-inset-bottom));
        }

        .analytics-dashboard {
          left: 10px;
          bottom: calc(130px + env(safe-area-inset-bottom));
          width: calc(100vw - 20px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  public destroy(): void {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer);
    this.dashboard?.remove();
    this.toggleButton?.remove();
  }
}
