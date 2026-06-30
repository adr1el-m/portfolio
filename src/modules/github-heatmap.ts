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
const GITHUB_FALLBACK_ENDPOINT = '/data/github-contributions.json';

export class GitHubHeatmap {
  private readonly root = document.querySelector<HTMLElement>('[data-github-heatmap]');
  private tooltip: HTMLElement | null = null;

  async init(): Promise<void> {
    if (!this.root) return;

    const grid = this.root.querySelector<HTMLElement>('[data-github-grid]');
    const summary = this.root.querySelector<HTMLElement>('[data-github-summary]');
    if (!grid || !summary) return;

    this.setStatus('Loading GitHub contributions...');

    try {
      const payload = await this.fetchContributions();
      if (!Array.isArray(payload.days) || payload.days.length === 0) {
        throw new Error('GitHub contribution response was empty.');
      }

      grid.innerHTML = '';
      const weekCount = Math.ceil(payload.days.length / 7);
      grid.style.setProperty('--week-count', String(weekCount));
      this.renderMonthLabels(grid, payload.days, weekCount);
      payload.days.forEach((day, index) => {
        const label = day.label || this.formatContributionLabel(day);
        const cell = document.createElement('span');
        cell.className = 'github-heatmap-cell';
        cell.dataset.level = String(day.level);
        cell.dataset.label = label;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', label);
        cell.setAttribute('title', label);
        cell.style.gridColumn = String(Math.floor(index / 7) + 1);
        cell.style.gridRow = String((index % 7) + 1);
        cell.style.setProperty('--stagger', `${index % 17}`);
        grid.appendChild(cell);
      });

      summary.textContent = payload.summary;
      this.root.dataset.githubHeatmapState = 'ready';
      this.bindTooltip(grid);
    } catch (error) {
      console.warn('GitHub heatmap unavailable:', error);
      grid.innerHTML = '';
      this.clearMonthLabels(grid);
      this.setStatus('GitHub activity unavailable right now.');
    }
  }

  private renderMonthLabels(grid: HTMLElement, days: ContributionDay[], weekCount: number): void {
    const board = grid.parentElement;
    if (!board) return;

    let months = board.querySelector<HTMLElement>('[data-github-months]');
    if (!months) {
      months = document.createElement('div');
      months.className = 'github-heatmap-months';
      months.dataset.githubMonths = '';
      months.setAttribute('aria-hidden', 'true');
      board.insertBefore(months, grid);
    }

    months.innerHTML = '';
    months.style.setProperty('--week-count', String(weekCount));

    let previousMonth = '';
    days.forEach((day, index) => {
      if (index % 7 !== 0) return;

      const date = new Date(`${day.date}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;

      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (monthKey === previousMonth) return;
      previousMonth = monthKey;

      const label = document.createElement('span');
      label.className = 'github-heatmap-month';
      label.textContent = date.toLocaleString('en-US', { month: 'short' });
      label.style.gridColumn = String(Math.floor(index / 7) + 1);
      months.appendChild(label);
    });
  }

  private clearMonthLabels(grid: HTMLElement): void {
    grid.parentElement?.querySelector<HTMLElement>('[data-github-months]')?.remove();
  }

  private bindTooltip(grid: HTMLElement): void {
    if (!this.root) return;
    this.tooltip = this.root.querySelector<HTMLElement>('.github-heatmap-tooltip');
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'github-heatmap-tooltip';
      this.tooltip.setAttribute('role', 'tooltip');
      this.root.appendChild(this.tooltip);
    }

    const show = (target: HTMLElement) => {
      if (!this.root || !this.tooltip) return;
      const label = target.dataset.label || target.getAttribute('aria-label') || '';
      if (!label) return;

      this.tooltip.textContent = label;
      this.tooltip.classList.add('active');

      const rootRect = this.root.getBoundingClientRect();
      const cellRect = target.getBoundingClientRect();
      const tooltipRect = this.tooltip.getBoundingClientRect();
      const centerX = cellRect.left - rootRect.left + (cellRect.width / 2);
      const minX = tooltipRect.width / 2 + 8;
      const maxX = rootRect.width - (tooltipRect.width / 2) - 8;
      const left = Math.max(minX, Math.min(maxX, centerX));
      const topCandidate = cellRect.top - rootRect.top - tooltipRect.height - 10;
      const top = topCandidate > 44 ? topCandidate : cellRect.bottom - rootRect.top + 10;

      this.tooltip.style.left = `${left}px`;
      this.tooltip.style.top = `${top}px`;
    };

    const hide = () => {
      this.tooltip?.classList.remove('active');
    };

    grid.addEventListener('pointerover', (event) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>('.github-heatmap-cell');
      if (target) show(target);
    });
    grid.addEventListener('pointermove', (event) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>('.github-heatmap-cell');
      if (target) show(target);
    });
    grid.addEventListener('pointerout', (event) => {
      const next = event.relatedTarget as Element | null;
      if (!next?.closest('.github-heatmap-cell')) hide();
    });
  }

  private async fetchContributions(): Promise<ContributionResponse> {
    const errors: string[] = [];
    for (const endpoint of [GITHUB_ENDPOINT, GITHUB_FALLBACK_ENDPOINT]) {
      try {
        const response = await fetch(endpoint, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error(`unexpected content type: ${contentType || 'unknown'}`);
        }

        return await response.json() as ContributionResponse;
      } catch (error) {
        errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`GitHub contribution sources failed (${errors.join('; ')}).`);
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
