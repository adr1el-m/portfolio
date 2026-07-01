type PublicAnalyticsSummary = {
  totalEvents?: number;
  lastSeen?: string | null;
  pageViews?: Array<{ label: string; count: number }>;
  projectOpens?: Array<{ label: string; count: number }>;
  honorOpens?: Array<{ label: string; count: number }>;
  contactActions?: Array<{ label: string; count: number }>;
  contactSubmissions?: Array<{ label: string; count: number }>;
  recentQuestions?: Array<{ label: string; at: string }>;
};

const LOCAL_STORAGE_KEY = 'portfolio:analytics:v1';
const PUBLIC_ANALYTICS_ENABLED = (import.meta.env.VITE_PUBLIC_ANALYTICS_SNAPSHOT || '').toLowerCase() === 'true';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function topLabel(entries?: Array<{ label: string; count: number }>, fallback = 'Collecting signal'): string {
  return entries?.[0]?.label || fallback;
}

function totalCount(entries?: Array<{ label: string; count: number }>): number {
  return (entries || []).reduce((sum, entry) => sum + entry.count, 0);
}

function readLocalSummary(): PublicAnalyticsSummary {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as {
      pageViews?: Record<string, number>;
      projectOpens?: Record<string, number>;
      honorOpens?: Record<string, number>;
      contactActions?: Record<string, number>;
      chatbotQuestions?: Array<{ label: string; at: string }>;
    };
    const toTop = (record: Record<string, number> | undefined) => Object.entries(record || {})
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([label, count]) => ({ label, count }));

    return {
      totalEvents: totalCount(toTop(parsed.pageViews)) + totalCount(toTop(parsed.projectOpens)) + totalCount(toTop(parsed.honorOpens)),
      pageViews: toTop(parsed.pageViews),
      projectOpens: toTop(parsed.projectOpens),
      honorOpens: toTop(parsed.honorOpens),
      contactActions: toTop(parsed.contactActions),
      recentQuestions: Array.isArray(parsed.chatbotQuestions) ? parsed.chatbotQuestions.slice(-8).reverse() : [],
    };
  } catch {
    return {};
  }
}

function formatTimeAgo(iso?: string | null): string {
  if (!iso) return 'Live now';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return 'Just now';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export class PublicAnalytics {
  private summary: PublicAnalyticsSummary = readLocalSummary();

  constructor() {
    this.init();
  }

  private init(): void {
    if (import.meta.env.PROD && !PUBLIC_ANALYTICS_ENABLED) return;

    const about = document.querySelector<HTMLElement>('article.about');
    if (!about || document.getElementById('public-analytics-snapshot')) return;

    const anchor = about.querySelector<HTMLElement>('.tech-stack-section')
      || about.querySelector<HTMLElement>('.service');
    if (!anchor) return;

    const section = document.createElement('section');
    section.id = 'public-analytics-snapshot';
    section.className = 'public-analytics-section';
    section.setAttribute('aria-labelledby', 'public-analytics-title');
    anchor.insertAdjacentElement('beforebegin', section);

    this.render(section);
    void this.loadRemoteSummary(section);
  }

  private async loadRemoteSummary(container: HTMLElement): Promise<void> {
    if (window.location.protocol === 'file:') return;
    try {
      const response = await fetch('/api/analytics?public=1', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      this.summary = await response.json() as PublicAnalyticsSummary;
      this.render(container);
    } catch {
      this.render(container);
    }
  }

  private render(container: HTMLElement): void {
    const events = Number(this.summary.totalEvents || 0);
    const project = topLabel(this.summary.projectOpens, 'Projects are ready to explore');
    const honor = topLabel(this.summary.honorOpens, 'Honors are ready to explore');
    const recentTopic = this.summary.recentQuestions?.[0]?.label || 'Ask AdrAI about projects, skills, or scholarships';
    const visits = document.getElementById('visitor-count')?.textContent?.trim();
    const lastSeen = formatTimeAgo(this.summary.lastSeen);

    container.innerHTML = `
      <div class="public-analytics-header">
        <div>
          <span class="public-analytics-kicker">Live Portfolio Signals</span>
          <h3 id="public-analytics-title" class="h3">What visitors explore</h3>
        </div>
        <span class="public-analytics-freshness">${escapeHtml(lastSeen)}</span>
      </div>
      <div class="public-analytics-grid">
        <article class="public-analytics-card">
          <span>Total activity</span>
          <strong>${events ? events.toLocaleString() : escapeHtml(visits || 'Live')}</strong>
          <p>${events ? 'Tracked opens, questions, and page views.' : 'Server snapshot will fill in as visitors interact.'}</p>
        </article>
        <article class="public-analytics-card public-analytics-wide">
          <span>Most-opened project</span>
          <strong>${escapeHtml(project)}</strong>
          <p>${escapeHtml(totalCount(this.summary.projectOpens) ? 'Project cards are tracked as people inspect the work.' : 'Open any project to start shaping this signal.')}</p>
        </article>
        <article class="public-analytics-card public-analytics-wide">
          <span>Most-opened honor</span>
          <strong>${escapeHtml(honor)}</strong>
          <p>${escapeHtml(totalCount(this.summary.honorOpens) ? 'Honors show which proof points visitors are checking.' : 'Honors will rank themselves as people browse.')}</p>
        </article>
        <article class="public-analytics-card">
          <span>AdrAI pulse</span>
          <strong>${escapeHtml(String(this.summary.recentQuestions?.length || 0))}</strong>
          <p>${escapeHtml(recentTopic)}</p>
        </article>
      </div>
    `;
  }
}
