import { getHonorProjectLinks } from './portfolio-data';
import { openPortfolioHonor, openPortfolioProject } from './portfolio-actions';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class HonorProjectLinks {
  constructor() {
    this.init();
    this.bindDelegatedClick();
  }

  private init(): void {
    const links = getHonorProjectLinks();
    links.forEach(({ honor, project }) => {
      this.addHonorForwardLink(honor, project);
      this.addProjectBacklink(honor, project);
    });
  }

  private addHonorForwardLink(honor: ReturnType<typeof getHonorProjectLinks>[number]['honor'], project: ReturnType<typeof getHonorProjectLinks>[number]['project']): void {
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
      openPortfolioProject(project.title);
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      openPortfolioProject(project.title);
    });
    target.appendChild(button);
  }

  private addProjectBacklink(honor: ReturnType<typeof getHonorProjectLinks>[number]['honor'], project: ReturnType<typeof getHonorProjectLinks>[number]['project']): void {
    if (!project.element) return;

    let container = project.element.querySelector<HTMLElement>('[data-project-honor-links]');
    if (!container) {
      container = document.createElement('div');
      container.className = 'project-honor-links';
      container.dataset.projectHonorLinks = '';
      container.innerHTML = `
        <span class="project-honor-links-label">
          <ion-icon name="ribbon-outline" aria-hidden="true"></ion-icon>
          Proof
        </span>
      `;
      project.element.appendChild(container);
    }

    if (container.querySelector(`[data-project-honor-link="${CSS.escape(honor.title)}"]`)) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'project-honor-link';
    button.dataset.projectHonorLink = honor.title;
    button.setAttribute('aria-label', `Open linked honor ${honor.title}`);
    button.innerHTML = `<span>${escapeHtml(honor.title)}</span>`;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPortfolioHonor(honor.title);
    });
    container.appendChild(button);
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
      openPortfolioProject(button.dataset.honorProjectLink);
    }, { capture: true });

    document.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>('[data-project-honor-link]');
      if (!button?.dataset.projectHonorLink) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      openPortfolioHonor(button.dataset.projectHonorLink);
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
      openPortfolioProject(button.dataset.honorProjectLink);
    }, { capture: true });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>('[data-project-honor-link]');
      if (!button?.dataset.projectHonorLink) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      openPortfolioHonor(button.dataset.projectHonorLink);
    }, { capture: true });
  }
}
