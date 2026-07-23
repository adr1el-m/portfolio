export type PortfolioPage = 'about' | 'background' | 'projects' | 'gear' | 'destinations' | 'contact';
export type TimelineFilter = 'all' | 'education' | 'experience' | 'scholarship';

function getNavLabel(page: PortfolioPage): string {
  if (page === 'contact') return 'about';
  return page === 'destinations' ? 'more' : page;
}

function getPath(page: PortfolioPage): string {
  if (page === 'about') return '/about';
  return `/${page}`;
}

export function trackPortfolioAction(type: string, label: string): void {
  window.dispatchEvent(new CustomEvent('portfolio:analytics', {
    detail: { type, label },
  }));
}

export function setPortfolioContext(type: 'page' | 'project' | 'honor' | 'search', title: string, detail?: string): void {
  window.dispatchEvent(new CustomEvent('portfolio:context', {
    detail: { type, title, detail },
  }));
}

export function navigateToPage(page: PortfolioPage, options: { scrollSelector?: string; track?: boolean } = {}): void {
  const navLabel = getNavLabel(page);
  const targetNav = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-link]'))
    .find((button) => (button.textContent || '').trim().toLowerCase() === navLabel);

  if (targetNav) {
    targetNav.click();
  } else {
    document.querySelectorAll<HTMLElement>('article[data-page]').forEach((article) => article.classList.remove('active'));
    document.querySelector<HTMLElement>(`article[data-page="${navLabel}"]`)?.classList.add('active');
    document.querySelectorAll<HTMLElement>('[data-nav-link]').forEach((button) => {
      button.classList.toggle('active', (button.textContent || '').trim().toLowerCase() === navLabel);
    });

    try {
      window.history.pushState({}, '', getPath(page));
    } catch { /* ignore */ }
  }

  if (options.track !== false) {
    trackPortfolioAction('page-view', page);
  }
  setPortfolioContext('page', page);

  const scrollSelector = options.scrollSelector || (page === 'contact' ? '#contact' : '');
  if (scrollSelector) {
    window.setTimeout(() => {
      document.querySelector<HTMLElement>(scrollSelector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 140);
  }
}

export function openPortfolioProject(title: string): void {
  navigateToPage('projects', { track: false });
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('portfolio:open-project', { detail: { title } }));
    trackPortfolioAction('project-open', title);
    setPortfolioContext('project', title);
  }, 160);
}

export function openPortfolioHonor(title: string): void {
  navigateToPage('about', { track: false });
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('portfolio:open-honor', { detail: { title } }));
    trackPortfolioAction('honor-open', title);
    setPortfolioContext('honor', title);
  }, 160);
}

export function openResumePreview(url = '/files/resume.pdf'): void {
  window.dispatchEvent(new CustomEvent('portfolio:open-resume-preview', { detail: { url } }));
  trackPortfolioAction('contact-action', 'Resume preview');
}

export function openPortfolioSearch(query = ''): void {
  window.dispatchEvent(new CustomEvent('portfolio:open-search', { detail: { query } }));
  setPortfolioContext('search', query || 'Portfolio search');
}

export function openAdrAI(prompt = ''): void {
  window.dispatchEvent(new CustomEvent('portfolio:request-adrai', { detail: { prompt } }));
  setPortfolioContext('page', 'AdrAI', prompt);
}

export function filterTimeline(filter: TimelineFilter): void {
  navigateToPage('background', { track: false });
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('portfolio:timeline-filter', { detail: { filter } }));
  }, 140);
}

export async function copyText(text: string, label: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    trackPortfolioAction('contact-action', `Copied ${label}`);
    return true;
  } catch {
    return false;
  }
}

export function openExternalUrl(url: string, label: string): void {
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
    trackPortfolioAction('contact-action', label);
  } catch { /* ignore */ }
}
