import { getHonorRecords, getProjectRecords, normalizeKey } from './portfolio-data';
import { KB } from '@/data/knowledge-base';
import {
  copyText,
  filterTimeline,
  navigateToPage,
  openAdrAI,
  openExternalUrl,
  openPortfolioHonor,
  openPortfolioProject,
  openPortfolioSearch,
  openResumePreview,
} from './portfolio-actions';

type Command = {
  id: string;
  title: string;
  subtitle: string;
  group: 'Navigate' | 'Projects' | 'Honors' | 'Actions' | 'Contact' | 'Terminal';
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
  private readonly recentKey = 'portfolio:recent-commands:v1';
  private recentCommandIds: string[] = [];

  constructor() {
    this.recentCommandIds = this.loadRecentCommands();
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
        subtitle: 'Profile, services, tech stack, and honors',
        group: 'Navigate',
        icon: 'person-outline',
        keywords: 'about profile services tech honors achievements',
        action: () => navigateToPage('about'),
      },
      {
        id: 'page-background',
        title: 'Open Background',
        subtitle: 'Education, scholarships, and experience timeline',
        group: 'Navigate',
        icon: 'school-outline',
        keywords: 'background education scholarships experience timeline',
        action: () => navigateToPage('background'),
      },
      {
        id: 'page-projects',
        title: 'Open Projects',
        subtitle: 'Full project gallery and detailed modals',
        group: 'Navigate',
        icon: 'code-slash-outline',
        keywords: 'projects work portfolio apps',
        action: () => navigateToPage('projects'),
      },
      {
        id: 'page-gear',
        title: 'Open Gear',
        subtitle: 'Workspace, devices, and current setup',
        group: 'Navigate',
        icon: 'hardware-chip-outline',
        keywords: 'gear setup hardware workspace devices tools',
        action: () => navigateToPage('gear'),
      },
      {
        id: 'search',
        title: 'Search Portfolio',
        subtitle: 'Open the global search surface',
        group: 'Actions',
        icon: 'search-outline',
        keywords: 'search find global portfolio command slash',
        action: () => openPortfolioSearch(),
      },
      {
        id: 'resume',
        title: 'Preview Resume',
        subtitle: 'View the latest resume PDF',
        group: 'Actions',
        icon: 'document-text-outline',
        keywords: 'resume cv pdf hire',
        action: () => openResumePreview(),
      },
      {
        id: 'resume-download',
        title: 'Download Resume',
        subtitle: 'Download resume.pdf',
        group: 'Actions',
        icon: 'download-outline',
        keywords: 'resume cv pdf download',
        action: () => {
          const link = document.createElement('a');
          link.href = KB.contact.resumeUrl;
          link.download = 'Adriel-Magalona-Resume.pdf';
          link.click();
        },
      },
      {
        id: 'contact',
        title: 'Contact Adriel',
        subtitle: 'Jump to email and professional links',
        group: 'Actions',
        icon: 'mail-outline',
        keywords: 'contact email socials linkedin github',
        action: () => navigateToPage('contact'),
      },
      {
        id: 'show-frontend-work',
        title: 'Show Frontend Work',
        subtitle: 'Filter the project timeline for frontend-facing builds',
        group: 'Projects',
        icon: 'color-palette-outline',
        keywords: 'show frontend work ui ux react angular vite typescript projects filter',
        action: () => this.openProjectExplorer('typescript'),
      },
      {
        id: 'compare-projects',
        title: 'Compare Featured Projects',
        subtitle: 'Open a side-by-side recruiter comparison',
        group: 'Projects',
        icon: 'git-compare-outline',
        keywords: 'compare projects recruiter role scope complexity outcome selected work',
        action: () => this.openProjectExplorer(undefined, true),
      },
      {
        id: 'portfolio-changelog',
        title: 'Open Portfolio Changelog',
        subtitle: 'See what has changed and improved recently',
        group: 'Navigate',
        icon: 'time-outline',
        keywords: 'changelog updates releases improvements history new portfolio',
        action: () => navigateToPage('about', { scrollSelector: '#portfolio-changelog' }),
      },
      {
        id: 'copy-email',
        title: 'Copy Email',
        subtitle: KB.contact.email,
        group: 'Contact',
        icon: 'copy-outline',
        keywords: `copy email contact ${KB.contact.email}`,
        action: () => void copyText(KB.contact.email, 'email address'),
      },
      {
        id: 'github',
        title: 'Open GitHub',
        subtitle: '@adr1el-m',
        group: 'Contact',
        icon: 'logo-github',
        keywords: 'github repositories code contribution profile',
        action: () => openExternalUrl(KB.contact.github, 'GitHub profile'),
      },
      {
        id: 'linkedin',
        title: 'Open LinkedIn',
        subtitle: 'Professional profile',
        group: 'Contact',
        icon: 'logo-linkedin',
        keywords: 'linkedin professional profile contact',
        action: () => openExternalUrl(KB.contact.linkedin, 'LinkedIn profile'),
      },
      {
        id: 'adraI',
        title: 'Ask AdrAI',
        subtitle: 'Open the personal agent',
        group: 'Actions',
        icon: 'sparkles-outline',
        keywords: 'chatbot ai adrai assistant ask',
        action: () => openAdrAI(),
      },
      {
        id: 'adrai-context',
        title: 'Ask AdrAI About This View',
        subtitle: 'Use the current section as context',
        group: 'Actions',
        icon: 'chatbubbles-outline',
        keywords: 'chatbot adrai ask current page context view explain',
        action: () => {
          const page = document.querySelector<HTMLElement>('article[data-page].active')?.dataset.page || 'portfolio';
          openAdrAI(`Explain the current ${page} section`);
        },
      },
      {
        id: 'terminal-recruiter-briefing',
        title: 'Terminal: Recruiter Briefing',
        subtitle: 'A concise, evidence-led hiring summary',
        group: 'Terminal',
        icon: 'terminal-outline',
        keywords: 'terminal command hire recruiter briefing why hire summary cv',
        action: () => openAdrAI('Why hire Adriel? Give me a concise recruiter briefing with evidence.'),
      },
      {
        id: 'terminal-ai-proof',
        title: 'Terminal: AI Proof Pack',
        subtitle: 'Surface AI and full-stack evidence',
        group: 'Terminal',
        icon: 'sparkles-outline',
        keywords: 'terminal command ai proof machine learning full stack evidence',
        action: () => openAdrAI('Show proof of Adriel\'s AI and full-stack skills.'),
      },
      {
        id: 'terminal-best-work',
        title: 'Terminal: Best Work',
        subtitle: 'Find projects by the role or skill you need',
        group: 'Terminal',
        icon: 'folder-open-outline',
        keywords: 'terminal command projects best work frontend product portfolio',
        action: () => openAdrAI('Which projects best show frontend, product thinking, and engineering depth?'),
      },
      {
        id: 'terminal-achievement-proof',
        title: 'Terminal: Achievement Evidence',
        subtitle: 'Open awards with dates, organizers, and proof media',
        group: 'Terminal',
        icon: 'shield-checkmark-outline',
        keywords: 'terminal command awards honors achievement evidence certificate proof',
        action: () => openAdrAI('Summarize Adriel\'s most relevant awards and the evidence behind them.'),
      },
      {
        id: 'filter-scholarships',
        title: 'Filter Scholarships',
        subtitle: 'Show scholarship items in Background',
        group: 'Actions',
        icon: 'ribbon-outline',
        keywords: 'scholarship dost macemco taguig lani background',
        action: () => filterTimeline('scholarship'),
      },
      {
        id: 'filter-education',
        title: 'Filter Education',
        subtitle: 'Show education items in Background',
        group: 'Actions',
        icon: 'library-outline',
        keywords: 'education pup university school background',
        action: () => filterTimeline('education'),
      },
      {
        id: 'filter-experience',
        title: 'Filter Experience',
        subtitle: 'Show experience items in Background',
        group: 'Actions',
        icon: 'briefcase-outline',
        keywords: 'experience work eskwelabs microsoft background',
        action: () => filterTimeline('experience'),
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
        action: () => openPortfolioProject(project.title),
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
        action: () => openPortfolioHonor(honor.title),
      });
    });

    return commands;
  }

  private create(): void {
    if (document.getElementById('command-palette')) return;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'command-palette-trigger';
    trigger.setAttribute('aria-label', 'Open command palette (Command K)');
    trigger.innerHTML = '<ion-icon name="terminal-outline" aria-hidden="true"></ion-icon><span>Command</span><kbd>⌘K</kbd>';
    trigger.addEventListener('click', () => this.open());

    this.overlay = document.createElement('div');
    this.overlay.id = 'command-palette';
    this.overlay.className = 'command-palette';
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.innerHTML = `
      <div class="command-palette-panel" role="dialog" aria-modal="true" aria-labelledby="command-palette-title">
        <div class="command-palette-search">
          <ion-icon name="search-outline" aria-hidden="true"></ion-icon>
          <input id="command-palette-input" type="search" autocomplete="off" spellcheck="false" placeholder="Try: hire, AI proof, projects, awards…" />
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

    document.addEventListener('click', (event) => {
      if ((event.target as Element | null)?.closest('[data-command-palette-open]')) this.open();
    });

    this.input?.addEventListener('input', () => {
      this.activeIndex = 0;
      this.render();
    });

    this.input?.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.activeIndex = Math.min(this.filtered.length - 1, this.activeIndex + 1);
        this.updateActiveItem();
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.activeIndex = Math.max(0, this.activeIndex - 1);
        this.updateActiveItem();
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
      const recentBoost = this.recentCommandIds.includes(command.id) ? 1.3 : 0;
      if (!queryTokens.length) {
        return (command.group === 'Navigate' ? 3 : command.group === 'Terminal' ? 2.5 : command.group === 'Actions' ? 2 : 1) + recentBoost;
      }
      const title = normalizeKey(command.title);
      const subtitle = normalizeKey(command.subtitle);
      const group = normalizeKey(command.group);
      const keywords = normalizeKey(command.keywords);
      const exactPageBoost = title === `open ${query}` ? 8 : 0;
      return queryTokens.reduce((sum, token) => {
        let tokenScore = 0;
        if (title.includes(token)) tokenScore += 4;
        if (keywords.includes(token)) tokenScore += 2;
        if (subtitle.includes(token)) tokenScore += 1;
        if (group.includes(token)) tokenScore += 1;
        return sum + tokenScore;
      }, exactPageBoost + recentBoost);
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
        this.updateActiveItem();
      });
      button.addEventListener('click', () => this.run(this.filtered[index]));
    });
  }

  private updateActiveItem(): void {
    this.list?.querySelectorAll<HTMLButtonElement>('.command-palette-item').forEach((button, index) => {
      const isActive = index === this.activeIndex;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
  }

  private run(command?: Command): void {
    if (!command) return;
    this.close();
    this.rememberCommand(command.id);
    trackCommand(command.title);
    command.action();
  }

  private openProjectExplorer(filter?: string, compare = false): void {
    navigateToPage('projects', { track: false });
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('portfolio:project-explorer', {
        detail: compare ? { action: 'compare' } : { action: 'filter', value: filter },
      }));
    }, 180);
  }

  private loadRecentCommands(): string[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.recentKey) || '[]') as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 6) : [];
    } catch {
      return [];
    }
  }

  private rememberCommand(id: string): void {
    this.recentCommandIds = [id, ...this.recentCommandIds.filter((item) => item !== id)].slice(0, 6);
    try {
      localStorage.setItem(this.recentKey, JSON.stringify(this.recentCommandIds));
    } catch { /* ignore */ }
  }
}
