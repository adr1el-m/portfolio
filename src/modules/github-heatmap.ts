type ContributionDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
};

type ContributionResponse = {
  username: string;
  summary: string;
  days: ContributionDay[];
  source: string;
};

const GITHUB_ENDPOINT = '/api/github-contributions';

export class GitHubHeatmap {
  private readonly root = document.querySelector<HTMLElement>('[data-github-heatmap]');

  async init(): Promise<void> {
    if (!this.root) return;

    const grid = this.root.querySelector<HTMLElement>('[data-github-grid]');
    const summary = this.root.querySelector<HTMLElement>('[data-github-summary]');
    if (!grid || !summary) return;

    this.setStatus('Loading GitHub contributions...');

    try {
      const response = await fetch(GITHUB_ENDPOINT, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`GitHub contribution request failed: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`GitHub contribution endpoint returned ${contentType || 'an unknown content type'}.`);
      }

      const payload = await response.json() as ContributionResponse;
      if (!Array.isArray(payload.days) || payload.days.length === 0) {
        throw new Error('GitHub contribution response was empty.');
      }

      grid.innerHTML = '';
      payload.days.forEach((day, index) => {
        const cell = document.createElement('span');
        cell.className = 'github-heatmap-cell';
        cell.dataset.level = String(day.level);
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', day.label || this.formatContributionLabel(day));
        cell.setAttribute('title', day.label || this.formatContributionLabel(day));
        cell.style.setProperty('--stagger', `${index % 17}`);
        grid.appendChild(cell);
      });

      summary.textContent = payload.summary;
      this.root.dataset.githubHeatmapState = 'ready';
    } catch (error) {
      console.warn('GitHub heatmap unavailable:', error);
      grid.innerHTML = '';
      this.setStatus('GitHub activity unavailable right now.');
    }
  }

  private setStatus(message: string): void {
    if (!this.root) return;
    const summary = this.root.querySelector<HTMLElement>('[data-github-summary]');
    if (summary) summary.textContent = message;
    this.root.dataset.githubHeatmapState = 'loading';
  }

  private formatContributionLabel(day: ContributionDay): string {
    if (day.count === 0) return `No contributions on ${day.date}.`;
    const noun = day.count === 1 ? 'contribution' : 'contributions';
    return `${day.count} ${noun} on ${day.date}.`;
  }
}
