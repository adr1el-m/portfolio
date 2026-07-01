import { navigateToPage, openAdrAI, openPortfolioSearch, openResumePreview } from './portfolio-actions';

type MobileAction = {
  id: string;
  label: string;
  icon: string;
  action: () => void;
};

export class MobileActionBar {
  private bar: HTMLElement | null = null;

  constructor() {
    this.create();
  }

  private create(): void {
    if (document.querySelector('[data-mobile-action-bar]')) return;

    const actions: MobileAction[] = [
      { id: 'search', label: 'Search', icon: 'search-outline', action: () => openPortfolioSearch() },
      { id: 'projects', label: 'Projects', icon: 'code-slash-outline', action: () => navigateToPage('projects') },
      { id: 'adrai', label: 'AdrAI', icon: 'sparkles-outline', action: () => openAdrAI('Help me explore this portfolio') },
      { id: 'contact', label: 'Contact', icon: 'mail-outline', action: () => navigateToPage('contact') },
      { id: 'resume', label: 'Resume', icon: 'document-text-outline', action: () => openResumePreview() },
    ];

    const bar = document.createElement('nav');
    bar.className = 'mobile-action-bar';
    bar.dataset.mobileActionBar = '';
    bar.setAttribute('aria-label', 'Quick portfolio actions');

    actions.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mobile-action-button';
      button.dataset.mobileAction = item.id;
      button.setAttribute('aria-label', item.label);
      button.innerHTML = `
        <ion-icon name="${item.icon}" aria-hidden="true"></ion-icon>
        <span>${item.label}</span>
      `;
      button.addEventListener('click', item.action);
      bar.appendChild(button);
    });

    document.body.appendChild(bar);
    this.bar = bar;
    this.bindActiveState();
  }

  private bindActiveState(): void {
    const update = () => {
      const activePage = document.querySelector<HTMLElement>('article[data-page].active')?.dataset.page || 'about';
      this.bar?.querySelectorAll<HTMLButtonElement>('[data-mobile-action]').forEach((button) => {
        const id = button.dataset.mobileAction;
        const isActive = (id === 'projects' && activePage === 'projects') || (id === 'contact' && activePage === 'about');
        button.classList.toggle('active', isActive);
      });
    };

    update();
    document.querySelectorAll<HTMLElement>('[data-nav-link]').forEach((button) => {
      button.addEventListener('click', () => window.setTimeout(update, 80));
    });
    window.addEventListener('popstate', () => window.setTimeout(update, 80));
  }
}
