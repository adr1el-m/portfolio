import { getProjectProof } from '@/data/project-profiles';
import { getProjectRecords, normalizeKey, type PortfolioProjectRecord } from './portfolio-data';
import { openPortfolioProject, trackPortfolioAction } from './portfolio-actions';

type ExplorerProject = PortfolioProjectRecord & {
  role: string;
  year: string;
  stack: string[];
};

type ExplorerEvent = CustomEvent<{
  action?: 'filter' | 'compare' | 'focus';
  value?: string;
  titles?: string[];
}>;

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function yearFromTimeframe(timeframe?: string): string {
  const year = timeframe?.match(/\b20\d{2}\b/)?.[0];
  return year || 'Archive';
}

function textFromMarkup(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stackFromTechnologies(technologies: string): string[] {
  // A few legacy project cards store a rich technology table/list. Extract the
  // useful technology names before rendering the compact timeline text.
  const tableNames = Array.from(technologies.matchAll(/<tr>\s*<td>([\s\S]*?)<\/td>/gi))
    .map((match) => textFromMarkup(match[1]));
  const listItems = Array.from(technologies.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((match) => textFromMarkup(match[1]).replace(/^[^:]+:\s*/, ''));
  const values = tableNames.length || listItems.length
    ? [...tableNames, ...listItems]
    : technologies.split(/[•,]/).map((item) => textFromMarkup(item));

  return [...new Set(values.filter(Boolean))];
}

export class ProjectExplorer {
  private root: HTMLElement | null = null;
  private projects: ExplorerProject[] = [];
  private selected = new Set<string>();
  private filters = { year: 'all', category: 'all', role: 'all', stack: 'all' };

  constructor() {
    const article = document.querySelector<HTMLElement>('article.projects');
    const host = article?.querySelector<HTMLElement>('section.projects');
    if (!article || !host || article.querySelector('[data-project-explorer]')) return;

    this.projects = getProjectRecords().map((project) => {
      const proof = getProjectProof(project.title);
      return {
        ...project,
        role: proof?.role || 'Independent build',
        year: yearFromTimeframe(proof?.timeframe),
        stack: stackFromTechnologies(project.technologies || ''),
      };
    }).sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || a.title.localeCompare(b.title));
    if (!this.projects.length) return;

    this.root = document.createElement('section');
    this.root.className = 'project-explorer';
    this.root.dataset.projectExplorer = 'true';
    this.root.setAttribute('aria-labelledby', 'project-explorer-title');
    const selectedWork = host.querySelector('.selected-work');
    host.insertBefore(this.root, selectedWork?.nextSibling || host.firstChild);
    this.bind();
    this.render();
  }

  private bind(): void {
    this.root?.addEventListener('change', (event) => {
      const select = (event.target as Element | null)?.closest<HTMLSelectElement>('[data-project-filter]');
      const key = select?.dataset.projectFilter as keyof typeof this.filters | undefined;
      if (!select || !key) return;
      this.filters[key] = select.value;
      this.apply();
    });

    this.root?.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      const compare = target?.closest<HTMLButtonElement>('[data-compare-project]');
      if (compare?.dataset.compareProject) {
        this.toggle(compare.dataset.compareProject);
        return;
      }
      const open = target?.closest<HTMLButtonElement>('[data-explorer-open]');
      if (open?.dataset.explorerOpen) openPortfolioProject(open.dataset.explorerOpen);
      if (target?.closest('[data-compare-clear]')) {
        this.selected.clear();
        this.apply();
      }
      if (target?.closest('[data-compare-featured]')) this.selectFeatured();
    });

    window.addEventListener('portfolio:project-explorer', (event) => {
      const detail = (event as ExplorerEvent).detail || {};
      if (detail.action === 'filter' && detail.value) this.applyQuickFilter(detail.value);
      if (detail.action === 'compare') {
        this.selected.clear();
        (detail.titles || ['WorkSight', 'DokQ', 'LingapLink'])
          .slice(0, 3)
          .forEach((title) => this.selected.add(normalizeKey(title)));
        this.apply();
      }
      if (detail.action === 'focus') this.root?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private applyQuickFilter(value: string): void {
    this.filters = { year: 'all', category: 'all', role: 'all', stack: 'all' };
    const normalized = normalizeKey(value);
    const stackMatch = this.stackOptions().find((item) => normalizeKey(item) === normalized);
    const categoryMatch = this.categoryOptions().find((item) => normalizeKey(item) === normalized);
    if (stackMatch) this.filters.stack = stackMatch;
    else if (categoryMatch) this.filters.category = categoryMatch;
    this.apply();
    this.root?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private toggle(title: string): void {
    const key = normalizeKey(title);
    if (this.selected.has(key)) this.selected.delete(key);
    else if (this.selected.size < 3) this.selected.add(key);
    else return;
    trackPortfolioAction('project-compare', `${this.selected.size} project${this.selected.size === 1 ? '' : 's'} selected`);
    this.apply();
  }

  private selectFeatured(): void {
    this.selected = new Set(['worksight', 'dokq', 'lingaplink']);
    this.apply();
  }

  private categoryOptions(): string[] {
    return [...new Set(this.projects.map((project) => project.category).filter(Boolean))].sort();
  }

  private roleOptions(): string[] {
    return [...new Set(this.projects.map((project) => project.role).filter(Boolean))].sort();
  }

  private stackOptions(): string[] {
    return [...new Set(this.projects.flatMap((project) => project.stack).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 18);
  }

  private filtered(): ExplorerProject[] {
    return this.projects.filter((project) => (
      (this.filters.year === 'all' || project.year === this.filters.year)
      && (this.filters.category === 'all' || project.category === this.filters.category)
      && (this.filters.role === 'all' || project.role === this.filters.role)
      && (this.filters.stack === 'all' || project.stack.includes(this.filters.stack))
    ));
  }

  private apply(): void {
    this.projects.forEach((project) => {
      const matches = this.filtered().includes(project);
      project.element?.classList.toggle('project-explorer-hidden', !matches);
      project.element?.setAttribute('aria-hidden', String(!matches));
    });
    this.render();
  }

  private renderSelect(label: string, key: keyof typeof this.filters, options: string[]): string {
    return `<label><span>${label}</span><select data-project-filter="${key}"><option value="all">All ${label.toLowerCase()}s</option>${options.map((option) => `<option value="${escapeHtml(option)}"${this.filters[key] === option ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></label>`;
  }

  private render(): void {
    if (!this.root) return;
    const filtered = this.filtered();
    const years = [...new Set(this.projects.map((project) => project.year))].sort((a, b) => b.localeCompare(a));
    const compared = this.projects.filter((project) => this.selected.has(normalizeKey(project.title)));

    this.root.innerHTML = `
      <div class="project-explorer-heading">
        <div><p class="project-explorer-kicker">Explore the archive</p><h3 id="project-explorer-title" class="h3">Project timeline &amp; comparison</h3></div>
        <p>Filter the work by documented timeframe, category, role, or stack. Select up to three projects for a side-by-side evidence view.</p>
      </div>
      <div class="project-explorer-filters" aria-label="Filter projects">
        ${this.renderSelect('Year', 'year', years)}
        ${this.renderSelect('Category', 'category', this.categoryOptions())}
        ${this.renderSelect('Role', 'role', this.roleOptions())}
        ${this.renderSelect('Stack', 'stack', this.stackOptions())}
      </div>
      <div class="project-explorer-status"><strong>${filtered.length}</strong> of ${this.projects.length} projects shown <span>·</span> <button type="button" data-compare-featured>Compare selected work</button></div>
      <ol class="project-explorer-timeline" aria-label="Filtered project timeline">
        ${filtered.slice(0, 10).map((project) => `<li><span class="project-explorer-year">${escapeHtml(project.year)}</span><div><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.role)} · ${escapeHtml(project.category)}</small><p>${escapeHtml(project.stack.slice(0, 4).join(' · ') || 'Project archive')}</p></div><div class="project-explorer-actions"><button type="button" data-explorer-open="${escapeHtml(project.title)}">Open</button><button type="button" data-compare-project="${escapeHtml(project.title)}" aria-pressed="${this.selected.has(normalizeKey(project.title))}">${this.selected.has(normalizeKey(project.title)) ? 'Selected' : 'Compare'}</button></div></li>`).join('') || '<li class="project-explorer-empty">No projects match those filters.</li>'}
      </ol>
      <section class="project-comparison" aria-live="polite" aria-labelledby="project-comparison-title">
        <div class="project-comparison-heading"><div><p class="project-explorer-kicker">Recruiter view</p><h4 id="project-comparison-title">Compare projects</h4></div>${compared.length ? '<button type="button" data-compare-clear>Clear selection</button>' : ''}</div>
        ${compared.length ? `<div class="project-comparison-grid">${compared.map((project) => {
          const proof = getProjectProof(project.title);
          return `<article><h5>${escapeHtml(project.title)}</h5><dl><div><dt>Role</dt><dd>${escapeHtml(project.role)}</dd></div><div><dt>Scope</dt><dd>${escapeHtml(project.category)}</dd></div><div><dt>Complexity</dt><dd>${escapeHtml(proof?.architecture || project.stack.slice(0, 4).join(' · ') || 'Project implementation')}</dd></div><div><dt>Outcome</dt><dd>${escapeHtml(proof?.outcome || project.description || 'Open the project for details.')}</dd></div></dl><button type="button" data-explorer-open="${escapeHtml(project.title)}">View project →</button></article>`;
        }).join('')}</div>` : '<p class="project-comparison-empty">Choose up to three projects from the timeline to compare role, scope, complexity, and outcome.</p>'}
      </section>`;
  }
}
