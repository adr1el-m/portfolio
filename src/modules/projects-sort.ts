/**
 * Curate project cards into stronger portfolio tiers.
 */
export class ProjectsSorter {
  private readonly featuredPriority = [
    'WorkSight',
    'LingapLink',
    'DokQ',
    'SubaybayPH',
    'FinanceWise',
    'Kita-Kita (Agentic)',
    'Green Pulse',
    'BarangayNav',
    'VeemahPay',
    'Four Fundamental Spaces Finder',
  ];

  sort(): void {
    const projectsArticle = document.querySelector('article.projects');
    if (!projectsArticle) return;

    if (projectsArticle.querySelector('.project-groups')) return;

    const list = projectsArticle.querySelector('section.projects > ul.project-list');
    if (!list) return;

    const items = Array.from(list.querySelectorAll('li.project-item')) as HTMLLIElement[];
    if (items.length === 0) return;

    const featured = items
      .filter((li) => li.dataset.featured === 'true')
      .sort((a, b) => this.priorityFor(a) - this.priorityFor(b));
    const experiments = items.filter((li) => li.dataset.featured !== 'true');

    if (featured.length === 0 || experiments.length === 0) return;

    const groups = document.createElement('div');
    groups.className = 'project-groups';
    groups.append(
      this.createGroup({
        title: 'Featured Builds',
        eyebrow: `${featured.length} selected projects`,
        description: 'Competition-tested apps, AI products, civic tools, and shipped demos that best represent my current work.',
        className: 'project-list--featured',
        items: featured,
      }),
      this.createGroup({
        title: 'Other Experiments',
        eyebrow: `${experiments.length} learning builds`,
        description: 'Coursework, prototypes, UI recreations, and smaller explorations that show range without crowding the main showcase.',
        className: 'project-list--experiments',
        items: experiments,
      }),
    );

    list.replaceWith(groups);
  }

  private priorityFor(item: HTMLLIElement): number {
    const title = item.querySelector('.project-title')?.textContent?.trim() || '';
    const priority = this.featuredPriority.indexOf(title);
    return priority === -1 ? Number.MAX_SAFE_INTEGER : priority;
  }

  private createGroup(options: {
    title: string;
    eyebrow: string;
    description: string;
    className: string;
    items: HTMLLIElement[];
  }): HTMLElement {
    const section = document.createElement('section');
    section.className = 'project-group';
    section.setAttribute('aria-labelledby', this.slugify(options.title));

    const header = document.createElement('div');
    header.className = 'project-group-header';

    const text = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'project-group-eyebrow';
    eyebrow.textContent = options.eyebrow;

    const title = document.createElement('h3');
    title.className = 'h3 project-group-title';
    title.id = this.slugify(options.title);
    title.textContent = options.title;

    const description = document.createElement('p');
    description.className = 'project-group-description';
    description.textContent = options.description;

    text.append(eyebrow, title, description);
    header.append(text);

    const list = document.createElement('ul');
    list.className = `project-list ${options.className}`;
    list.setAttribute('role', 'list');
    options.items.forEach((item) => list.appendChild(item));

    section.append(header, list);
    return section;
  }

  private slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
