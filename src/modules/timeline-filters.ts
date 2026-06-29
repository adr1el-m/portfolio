type TimelineFilter = 'all' | 'education' | 'experience' | 'scholarship';

const FILTERS: Array<{ key: TimelineFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'education', label: 'Education' },
  { key: 'experience', label: 'Experience' },
  { key: 'scholarship', label: 'Scholarships' },
];

export class TimelineFilters {
  private active: TimelineFilter = 'all';

  constructor() {
    this.init();
  }

  private init(): void {
    const background = document.querySelector<HTMLElement>('article.background');
    const firstSection = background?.querySelector<HTMLElement>('.timeline-section');
    if (!background || !firstSection || background.querySelector('.timeline-filter-bar')) return;

    this.categorizeSections(background);

    const bar = document.createElement('div');
    bar.className = 'timeline-filter-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Filter background timeline');
    bar.innerHTML = FILTERS.map((filter) => `
      <button type="button" class="timeline-filter${filter.key === this.active ? ' active' : ''}" data-timeline-filter="${filter.key}" aria-pressed="${filter.key === this.active ? 'true' : 'false'}">
        ${filter.label}
      </button>
    `).join('');

    firstSection.insertAdjacentElement('beforebegin', bar);
    bar.addEventListener('click', (event) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-timeline-filter]');
      if (!button) return;
      this.apply((button.dataset.timelineFilter as TimelineFilter) || 'all');
    });

    window.addEventListener('portfolio:timeline-filter', (event) => {
      const detail = (event as CustomEvent<{ filter?: TimelineFilter }>).detail;
      this.apply(detail?.filter || 'all');
      document.querySelector('article.background')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private categorizeSections(background: HTMLElement): void {
    background.querySelectorAll<HTMLElement>('.timeline-section').forEach((section) => {
      const title = section.querySelector('.section-title')?.textContent?.toLowerCase() || '';
      if (title.includes('education')) section.dataset.timelineCategory = 'education';
      else if (title.includes('experience')) section.dataset.timelineCategory = 'experience';
      else if (title.includes('scholarship')) section.dataset.timelineCategory = 'scholarship';
    });
  }

  private apply(filter: TimelineFilter): void {
    this.active = filter;
    document.querySelectorAll<HTMLButtonElement>('[data-timeline-filter]').forEach((button) => {
      const isActive = button.dataset.timelineFilter === filter;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    document.querySelectorAll<HTMLElement>('article.background .timeline-section').forEach((section) => {
      const category = section.dataset.timelineCategory || '';
      const isVisible = filter === 'all' || category === filter;
      section.hidden = !isVisible;
    });

    window.dispatchEvent(new CustomEvent('portfolio:analytics', {
      detail: { type: 'page-view', label: `background:${filter}` },
    }));
  }
}
