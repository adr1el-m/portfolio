import { getHonorRecords, getProjectRecords, normalizeKey } from './portfolio-data';

type Command = {
  id: string;
  title: string;
  subtitle: string;
  group: 'Navigate' | 'Projects' | 'Honors' | 'Actions';
  icon: string;
  keywords: string;
  action: () => void;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function trackCommand(label: string): void {
  window.dispatchEvent(new CustomEvent('portfolio:analytics', {
    detail: { type: 'contact-action', label: `Command: ${label}` },
  }));
}

export class CommandPalette {
  private overlay: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLElement | null = null;
  private commands: Command[] = [];
  private filtered: Command[] = [];
  private activeIndex = 0;

  constructor() {
    this.commands = this.buildCommands();
    this.create();
    this.bind();
    this.render();
  }

  private buildCommands(): Command[] {
    const commands: Command[] = [
      {
        id: 'page-about',
        title: 'Open About',
        subtitle: 'Profile, services, tech stack, honors, and analytics snapshot',
        group: 'Navigate',
        icon: 'person-outline',
        keywords: 'about profile services tech honors achievements analytics',
        action: () => this.navigate('about'),
      },
      {
        id: 'page-background',
        title: 'Open Background',
        subtitle: 'Education, scholarships, and experience timeline',
        group: 'Navigate',
        icon: 'school-outline',
        keywords: 'background education scholarships experience timeline',
        action: () => this.navigate('background'),
      },
      {
        id: 'page-projects',
        title: 'Open Projects',
        subtitle: 'Full project gallery and detailed modals',
        group: 'Navigate',
        icon: 'code-slash-outline',
        keywords: 'projects work portfolio apps',
        action: () => this.navigate('projects'),
      },
      {
        id: 'resume',
        title: 'Open Resume',
        subtitle: 'View the latest CV PDF',
        group: 'Actions',
        icon: 'document-text-outline',
        keywords: 'resume cv pdf hire',
        action: () => {
          try { window.open('/files/MAGALONA-CV.pdf', '_blank', 'noopener,noreferrer'); } catch { void 0; }
        },
      },
      {
        id: 'contact',
        title: 'Share Contact Info',
        subtitle: 'Jump to email and socials',
        group: 'Actions',
        icon: 'mail-outline',
        keywords: 'contact email socials linkedin github',
        action: () => {
          this.navigate('about');
          window.setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
        },
      },
      {
        id: 'adraI',
        title: 'Ask AdrAI',
        subtitle: 'Open the personal agent',
        group: 'Actions',
        icon: 'sparkles-outline',
        keywords: 'chatbot ai adrai assistant ask',
        action: () => {
          document.querySelector<HTMLButtonElement>('.chatbot-btn')?.click();
        },
      },
      {
        id: 'filter-scholarships',
        title: 'Filter Scholarships',
        subtitle: 'Show scholarship items in Background',
        group: 'Actions',
        icon: 'ribbon-outline',
        keywords: 'scholarship dost macemco taguig lani background',
        action: () => this.filterTimeline('scholarship'),
      },
      {
        id: 'filter-education',
        title: 'Filter Education',
        subtitle: 'Show education items in Background',
        group: 'Actions',
        icon: 'library-outline',
        keywords: 'education pup university school background',
        action: () => this.filterTimeline('education'),
      },
      {
        id: 'filter-experience',
        title: 'Filter Experience',
        subtitle: 'Show experience items in Background',
        group: 'Actions',
        icon: 'briefcase-outline',
        keywords: 'experience work eskwelabs microsoft background',
        action: () => this.filterTimeline('experience'),
      },
    ];

    getProjectRecords().forEach((project) => {
      commands.push({
        id: `project-${normalizeKey(project.title)}`,
        title: `Open ${project.title}`,
        subtitle: `${project.category || 'Project'}${project.technologies ? ` • ${project.technologies.split(',').slice(0, 3).join(', ')}` : ''}`,
        group: 'Projects',
        icon: 'cube-outline',
        keywords: `${project.title} ${project.category} ${project.technologies} ${project.description}`,
        action: () => this.openProject(project.title),
      });
    });

    getHonorRecords().forEach((honor) => {
      commands.push({
        id: `honor-${normalizeKey(honor.title)}`,
        title: `Open ${honor.title}`,
        subtitle: `${honor.date || 'Honor'}${honor.projectTitle ? ` • Linked to ${honor.projectTitle}` : ''}`,
        group: 'Honors',
        icon: 'trophy-outline',
        keywords: `${honor.title} ${honor.organizer} ${honor.date} ${honor.location} ${honor.description} ${honor.projectTitle || ''}`,
        action: () => this.openHonor(honor.title),
      });
    });

    return commands;
  }

  private create(): void {
    if (document.getElementById('command-palette')) return;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'command-palette-trigger';
    trigger.setAttribute('aria-label', 'Open command palette');
    trigger.innerHTML = '<ion-icon name="search-outline" aria-hidden="true"></ion-icon>';
    trigger.addEventListener('click', () => this.open());

    this.overlay = document.createElement('div');
    this.overlay.id = 'command-palette';
    this.overlay.className = 'command-palette';
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.innerHTML = `
      <div class="command-palette-panel" role="dialog" aria-modal="true" aria-labelledby="command-palette-title">
        <div class="command-palette-search">
          <ion-icon name="search-outline" aria-hidden="true"></ion-icon>
          <input id="command-palette-input" type="search" autocomplete="off" spellcheck="false" placeholder="Search projects, honors, pages, actions" />
          <button type="button" class="command-palette-close" aria-label="Close command palette">
            <ion-icon name="close-outline" aria-hidden="true"></ion-icon>
          </button>
        </div>
        <h2 id="command-palette-title" class="sr-only">Command palette</h2>
        <div class="command-palette-list" role="listbox" aria-label="Available commands"></div>
      </div>
    `;

    document.body.append(trigger, this.overlay);
    this.input = this.overlay.querySelector<HTMLInputElement>('#command-palette-input');
    this.list = this.overlay.querySelector<HTMLElement>('.command-palette-list');
  }

  private bind(): void {
    document.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        this.open();
      }
      if (event.key === 'Escape' && this.isOpen()) {
        event.preventDefault();
        this.close();
      }
    });

    this.overlay?.addEventListener('click', (event) => {
      if (event.target === this.overlay) this.close();
    });

    this.overlay?.querySelector('.command-palette-close')?.addEventListener('click', () => this.close());

    this.input?.addEventListener('input', () => {
      this.activeIndex = 0;
      this.render();
    });

    this.input?.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.activeIndex = Math.min(this.filtered.length - 1, this.activeIndex + 1);
        this.render();
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.activeIndex = Math.max(0, this.activeIndex - 1);
        this.render();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        this.run(this.filtered[this.activeIndex]);
      }
    });
  }

  private isOpen(): boolean {
    return this.overlay?.classList.contains('active') || false;
  }

  private open(): void {
    this.overlay?.classList.add('active');
    this.overlay?.setAttribute('aria-hidden', 'false');
    this.input?.focus({ preventScroll: true });
    this.input?.select();
    trackCommand('Open palette');
  }

  private close(): void {
    this.overlay?.classList.remove('active');
    this.overlay?.setAttribute('aria-hidden', 'true');
  }

  private render(): void {
    if (!this.list) return;
    const query = normalizeKey(this.input?.value || '');
    const queryTokens = query.split(' ').filter(Boolean);
    const score = (command: Command) => {
      const haystack = normalizeKey(`${command.title} ${command.subtitle} ${command.group} ${command.keywords}`);
      if (!queryTokens.length) return command.group === 'Navigate' ? 3 : command.group === 'Actions' ? 2 : 1;
      return queryTokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
    };

    this.filtered = this.commands
      .map((command) => ({ command, score: score(command) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.command.group.localeCompare(b.command.group) || a.command.title.localeCompare(b.command.title))
      .slice(0, 12)
      .map((item) => item.command);

    if (this.activeIndex > this.filtered.length - 1) this.activeIndex = Math.max(0, this.filtered.length - 1);

    this.list.innerHTML = this.filtered.length
      ? this.filtered.map((command, index) => `
        <button type="button" class="command-palette-item${index === this.activeIndex ? ' active' : ''}" role="option" aria-selected="${index === this.activeIndex}" data-command-id="${escapeHtml(command.id)}">
          <span class="command-palette-icon"><ion-icon name="${escapeHtml(command.icon)}" aria-hidden="true"></ion-icon></span>
          <span class="command-palette-copy">
            <strong>${escapeHtml(command.title)}</strong>
            <small>${escapeHtml(command.subtitle)}</small>
          </span>
          <span class="command-palette-group">${escapeHtml(command.group)}</span>
        </button>
      `).join('')
      : '<div class="command-palette-empty">No matching command</div>';

    this.list.querySelectorAll<HTMLButtonElement>('.command-palette-item').forEach((button, index) => {
      button.addEventListener('mouseenter', () => {
        this.activeIndex = index;
        this.render();
      });
      button.addEventListener('click', () => this.run(this.filtered[index]));
    });
  }

  private run(command?: Command): void {
    if (!command) return;
    this.close();
    trackCommand(command.title);
    command.action();
  }

  private navigate(page: 'about' | 'background' | 'projects'): void {
    const nav = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-link]'))
      .find((button) => (button.textContent || '').trim().toLowerCase() === page);
    if (nav) {
      nav.click();
      return;
    }
    document.querySelectorAll<HTMLElement>('article[data-page]').forEach((article) => article.classList.remove('active'));
    document.querySelector<HTMLElement>(`article[data-page="${page}"]`)?.classList.add('active');
  }

  private openProject(title: string): void {
    this.navigate('projects');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('portfolio:open-project', { detail: { title } }));
      window.dispatchEvent(new CustomEvent('portfolio:analytics', {
        detail: { type: 'project-open', label: title },
      }));
    }, 160);
  }

  private openHonor(title: string): void {
    this.navigate('about');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('portfolio:open-honor', { detail: { title } }));
      window.dispatchEvent(new CustomEvent('portfolio:analytics', {
        detail: { type: 'honor-open', label: title },
      }));
    }, 160);
  }

  private filterTimeline(filter: 'education' | 'experience' | 'scholarship'): void {
    this.navigate('background');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('portfolio:timeline-filter', { detail: { filter } }));
    }, 140);
  }
}
