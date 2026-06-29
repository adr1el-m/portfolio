import { getHonorProjectLinks } from './portfolio-data';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dispatchOpenProject(title: string): void {
  document.querySelectorAll<HTMLElement>('article[data-page]').forEach((article) => article.classList.remove('active'));
  document.querySelector<HTMLElement>('article[data-page="projects"]')?.classList.add('active');
  document.querySelectorAll<HTMLElement>('[data-nav-link]').forEach((button) => {
    button.classList.toggle('active', (button.textContent || '').trim().toLowerCase() === 'projects');
  });

  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('portfolio:open-project', { detail: { title } }));
    window.dispatchEvent(new CustomEvent('portfolio:analytics', {
      detail: { type: 'project-open', label: title },
    }));
  }, 140);
}

export class HonorProjectLinks {
  constructor() {
    this.init();
    this.bindDelegatedClick();
  }

  private init(): void {
    const links = getHonorProjectLinks();
    links.forEach(({ honor, project }) => {
      if (!honor.element || honor.element.querySelector('[data-honor-project-link]')) return;

      const target = honor.element.querySelector<HTMLElement>('.card-content') || honor.element;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'honor-project-link';
      button.dataset.honorProjectLink = project.title;
      button.setAttribute('aria-label', `Open linked project ${project.title}`);
      button.innerHTML = `
        <ion-icon name="git-branch-outline" aria-hidden="true"></ion-icon>
        <span>Linked project</span>
        <strong>${escapeHtml(project.title)}</strong>
      `;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        dispatchOpenProject(project.title);
      });
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        dispatchOpenProject(project.title);
      });
      target.appendChild(button);
    });
  }

  private bindDelegatedClick(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>('[data-honor-project-link]');
      if (!button?.dataset.honorProjectLink) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      dispatchOpenProject(button.dataset.honorProjectLink);
    }, { capture: true });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>('[data-honor-project-link]');
      if (!button?.dataset.honorProjectLink) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      dispatchOpenProject(button.dataset.honorProjectLink);
    }, { capture: true });
  }
}
