type RolePath = { title: string; intro: string; projects: string[]; evidence: string; cta: string };

const paths: Record<string, RolePath> = {
  frontend: { title: 'Frontend hiring manager', intro: 'Start with product interfaces, responsive delivery, and practical user workflows.', projects: ['WorkSight', 'DokQ', 'Four Fundamental Spaces Finder'], evidence: 'Product architecture, live deployments, and interface-focused evidence.', cta: 'Discuss frontend work' },
  ai: { title: 'AI reviewer', intro: 'Start with applied AI systems where the user workflow and evaluation problem are visible.', projects: ['WorkSight', 'Kita-Kita (Agentic)', 'GeneSync'], evidence: 'AI-assisted workflows, dynamic programming, data handling, and project proof.', cta: 'Discuss AI work' },
  founder: { title: 'Startup founder', intro: 'Start with projects that turn ambiguous user problems into shippable product flows.', projects: ['WorkSight', 'LingapLink', 'DokQ'], evidence: 'Competition outcomes, product constraints, and live/repository evidence.', cta: 'Discuss a product collaboration' },
  internship: { title: 'Internship recruiter', intro: 'Start with the clearest evidence of technical range, learning velocity, and collaboration.', projects: ['WorkSight', 'GeneSync', 'Online Document Request System'], evidence: 'Selected work, honors, source repositories, and an up-to-date resume.', cta: 'Discuss an internship' },
};

export class RolePaths {
  constructor() { this.render(); }

  private render(): void {
    const role = new URLSearchParams(window.location.search).get('role') || '';
    const path = paths[role];
    if (!path || document.querySelector('.role-path-brief')) return;
    const anchor = document.querySelector<HTMLElement>('article.projects .selected-work');
    if (!anchor) return;
    const section = document.createElement('section');
    section.className = 'role-path-brief';
    section.setAttribute('aria-labelledby', 'role-path-title');
    section.innerHTML = `<p class="selected-work-kicker">Tailored portfolio path</p><h3 id="role-path-title">${path.title}</h3><p>${path.intro}</p><ol>${path.projects.map((title) => `<li><button type="button" data-open-project="${title}">${title}</button></li>`).join('')}</ol><p class="role-path-evidence">${path.evidence}</p><a href="mailto:dagsmagalona@gmail.com?subject=${encodeURIComponent(path.cta)}">${path.cta} →</a>`;
    anchor.before(section);
  }
}
