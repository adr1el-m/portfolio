import type { AchievementData, ProjectData } from '@/types';
import { KB } from '@/data/knowledge-base';

export type PortfolioProjectRecord = ProjectData & {
  source: 'knowledge-base' | 'dom' | 'merged';
  element?: HTMLElement;
};

export type PortfolioHonorRecord = AchievementData & {
  source: 'knowledge-base' | 'dom' | 'merged';
  element?: HTMLElement;
  path?: string;
};

export type PortfolioTimelineRecord = {
  id: string;
  title: string;
  category: 'education' | 'experience' | 'scholarship';
  period?: string;
  organization?: string;
  description?: string;
  tags: string[];
  element?: HTMLElement;
  source: 'knowledge-base' | 'dom';
};

export type PortfolioSearchEntry = {
  id: string;
  title: string;
  type: 'page' | 'project' | 'honor' | 'timeline' | 'contact' | 'action' | 'skill';
  section: 'about' | 'background' | 'projects' | 'gear' | 'contact' | 'action';
  subtitle?: string;
  description?: string;
  keywords: string[];
  element?: HTMLElement;
  target?: string;
  url?: string;
};

const PROJECT_ALIAS_MAP: Record<string, string> = {
  'php loan system': 'Loan Management System (PHP/MySQL)',
  'online document request system': 'Online Document Request System (ODRS)',
  odrs: 'Online Document Request System (ODRS)',
  rgbc: 'RGBC ATM Transaction System',
  'rgbc richard gwapo banking corporation atm transaction system': 'RGBC ATM Transaction System',
  'kita kita agentic': 'Kita-Kita (Agentic)',
  'kita-kita agentic': 'Kita-Kita (Agentic)',
};

export function normalizeKey(value: string | undefined | null): string {
  return (value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(value: string): string {
  return normalizeKey(value).replace(/\s+/g, '-');
}

function parseArrayAttribute(element: HTMLElement, name: string): string[] {
  const raw = element.getAttribute(name);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function cleanText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&#10;/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function projectFromElement(element: HTMLElement): PortfolioProjectRecord | null {
  const title = cleanText(element.querySelector('.project-title')?.textContent);
  if (!title) return null;
  const description = cleanText(element.getAttribute('data-description'));
  const category = cleanText(element.getAttribute('data-category')) || 'Project';
  const technologies = cleanText(element.getAttribute('data-tech') || element.getAttribute('data-technologies'));

  return {
    title,
    category,
    description,
    technologies,
    images: parseArrayAttribute(element, 'data-images'),
    webpImages: parseArrayAttribute(element, 'data-webp-images'),
    videoUrl: cleanText(element.getAttribute('data-video')) || undefined,
    githubUrl: cleanText(element.getAttribute('data-github')) || undefined,
    liveUrl: cleanText(element.getAttribute('data-live')) || undefined,
    codedexUrl: cleanText(element.getAttribute('data-codedex')) || undefined,
    source: 'dom',
    element,
  };
}

function honorFromElement(element: HTMLElement): PortfolioHonorRecord | null {
  const title = cleanText(element.querySelector('.card-title')?.textContent);
  if (!title) return null;
  const year = cleanText(element.closest('.year-group')?.querySelector('.year-title')?.textContent) || 'honor';

  return {
    title,
    images: parseArrayAttribute(element, 'data-images'),
    webpImages: parseArrayAttribute(element, 'data-webp-images'),
    organizer: cleanText(element.getAttribute('data-organizer')) || 'Portfolio honor',
    date: cleanText(element.getAttribute('data-date')),
    location: cleanText(element.getAttribute('data-location')),
    teammates: [],
    description: cleanText(element.getAttribute('data-description')),
    projectTitle: cleanText(element.getAttribute('data-project-title')) || undefined,
    githubUrl: cleanText(element.getAttribute('data-github')) || undefined,
    liveUrl: cleanText(element.getAttribute('data-live')) || undefined,
    linkedinUrl: cleanText(element.getAttribute('data-linkedin')) || undefined,
    blogUrl: cleanText(element.getAttribute('data-blog')) || undefined,
    facebookUrl: cleanText(element.getAttribute('data-facebook')) || undefined,
    source: 'dom',
    element,
    path: element.dataset.honorPath || `/honors/${year}/${slugify(title)}`,
  };
}

function timelineCategoryFromSection(section: HTMLElement | null): PortfolioTimelineRecord['category'] {
  const title = cleanText(section?.querySelector('.section-title')?.textContent).toLowerCase();
  if (title.includes('scholarship')) return 'scholarship';
  if (title.includes('experience')) return 'experience';
  return 'education';
}

function timelineFromElement(element: HTMLElement): PortfolioTimelineRecord | null {
  const section = element.closest<HTMLElement>('.timeline-section');
  const category = timelineCategoryFromSection(section);
  const title = cleanText(element.querySelector('.timeline-title')?.textContent);
  if (!title) return null;

  const period = cleanText(element.querySelector('.timeline-period')?.textContent);
  const organization = cleanText(element.querySelector('.company-name')?.textContent);
  const description = cleanText(element.querySelector('.timeline-text')?.textContent);
  const tags = Array.from(element.querySelectorAll<HTMLElement>('.timeline-tags .tag'))
    .map((tag) => cleanText(tag.textContent))
    .filter(Boolean);

  return {
    id: `dom-${category}-${slugify(title)}`,
    title,
    category,
    period,
    organization,
    description,
    tags,
    element,
    source: 'dom',
  };
}

function mergeProject(base: PortfolioProjectRecord, incoming: PortfolioProjectRecord): PortfolioProjectRecord {
  return {
    ...base,
    ...incoming,
    title: incoming.title || base.title,
    category: incoming.category || base.category,
    description: incoming.description || base.description,
    technologies: incoming.technologies || base.technologies,
    images: incoming.images.length ? incoming.images : base.images,
    webpImages: incoming.webpImages.length ? incoming.webpImages : base.webpImages,
    githubUrl: incoming.githubUrl || base.githubUrl,
    liveUrl: incoming.liveUrl || base.liveUrl,
    videoUrl: incoming.videoUrl || base.videoUrl,
    codedexUrl: incoming.codedexUrl || base.codedexUrl,
    source: 'merged',
  };
}

function mergeHonor(base: PortfolioHonorRecord, incoming: PortfolioHonorRecord): PortfolioHonorRecord {
  return {
    ...base,
    ...incoming,
    title: incoming.title || base.title,
    images: incoming.images.length ? incoming.images : base.images,
    webpImages: incoming.webpImages.length ? incoming.webpImages : base.webpImages,
    organizer: incoming.organizer || base.organizer,
    date: incoming.date || base.date,
    location: incoming.location || base.location,
    description: incoming.description || base.description,
    projectTitle: incoming.projectTitle || base.projectTitle,
    githubUrl: incoming.githubUrl || base.githubUrl,
    liveUrl: incoming.liveUrl || base.liveUrl,
    linkedinUrl: incoming.linkedinUrl || base.linkedinUrl,
    blogUrl: incoming.blogUrl || base.blogUrl,
    facebookUrl: incoming.facebookUrl || base.facebookUrl,
    path: incoming.path || base.path,
    source: 'merged',
  };
}

function canonicalProjectKey(title: string): string {
  const normalized = normalizeKey(title);
  const alias = PROJECT_ALIAS_MAP[normalized];
  return normalizeKey(alias || title);
}

export function getProjectRecords(): PortfolioProjectRecord[] {
  const records = new Map<string, PortfolioProjectRecord>();

  KB.projects.forEach((project) => {
    records.set(canonicalProjectKey(project.title), {
      ...project,
      source: 'knowledge-base',
    });
  });

  document.querySelectorAll<HTMLElement>('.project-item').forEach((element) => {
    const fromDom = projectFromElement(element);
    if (!fromDom) return;
    const key = canonicalProjectKey(fromDom.title);
    const existing = records.get(key);
    records.set(key, existing ? mergeProject(existing, fromDom) : fromDom);
  });

  return Array.from(records.values()).sort((a, b) => a.title.localeCompare(b.title));
}

export function getHonorRecords(): PortfolioHonorRecord[] {
  const records = new Map<string, PortfolioHonorRecord>();

  KB.achievements.forEach((achievement) => {
    records.set(normalizeKey(achievement.title), {
      ...achievement,
      path: `/honors/${slugify(achievement.date?.match(/\b20\d{2}\b/)?.[0] || 'honor')}/${slugify(achievement.title)}`,
      source: 'knowledge-base',
    });
  });

  document.querySelectorAll<HTMLElement>('.achievement-card').forEach((element) => {
    const fromDom = honorFromElement(element);
    if (!fromDom) return;
    const key = normalizeKey(fromDom.title);
    const existing = records.get(key);
    records.set(key, existing ? mergeHonor(existing, fromDom) : fromDom);
  });

  return Array.from(records.values()).sort((a, b) => {
    const aYear = Number(a.date?.match(/\b20\d{2}\b/)?.[0] || 0);
    const bYear = Number(b.date?.match(/\b20\d{2}\b/)?.[0] || 0);
    return bYear - aYear || a.title.localeCompare(b.title);
  });
}

export function findProjectRecord(query: string | null | undefined): PortfolioProjectRecord | null {
  const normalized = normalizeKey(query);
  if (!normalized) return null;
  return getProjectRecords().find((project) => {
    const title = normalizeKey(project.title);
    const alias = canonicalProjectKey(project.title);
    return title.includes(normalized) || normalized.includes(title) || alias.includes(normalized) || normalized.includes(alias);
  }) || null;
}

export function findHonorRecord(query: string | null | undefined): PortfolioHonorRecord | null {
  const normalized = normalizeKey(query);
  if (!normalized) return null;
  return getHonorRecords().find((honor) => {
    const title = normalizeKey(honor.title);
    return title.includes(normalized) || normalized.includes(title);
  }) || null;
}

export function getHonorProjectLinks(): Array<{ honor: PortfolioHonorRecord; project: PortfolioProjectRecord }> {
  return getHonorRecords()
    .map((honor) => {
      const project = findProjectRecord(honor.projectTitle || '') || getProjectRecords().find((candidate) => {
        const projectKey = normalizeKey(candidate.title);
        const haystack = normalizeKey(`${honor.title} ${honor.description || ''}`);
        return projectKey.length > 4 && haystack.includes(projectKey);
      }) || null;
      return project ? { honor, project } : null;
    })
    .filter((item): item is { honor: PortfolioHonorRecord; project: PortfolioProjectRecord } => Boolean(item));
}

export function getTimelineRecords(): PortfolioTimelineRecord[] {
  const records = new Map<string, PortfolioTimelineRecord>();

  KB.education.forEach((education) => {
    const title = education.school;
    records.set(`education-${normalizeKey(title)}`, {
      id: `kb-education-${slugify(title)}`,
      title,
      category: 'education',
      period: education.period,
      organization: education.program,
      description: education.notes,
      tags: [education.program || '', 'education', 'school', 'background'].filter(Boolean),
      source: 'knowledge-base',
    });
  });

  KB.experience.forEach((experience) => {
    const title = experience.role;
    records.set(`experience-${normalizeKey(title)}-${normalizeKey(experience.company)}`, {
      id: `kb-experience-${slugify(`${title}-${experience.company}`)}`,
      title,
      category: 'experience',
      period: experience.period,
      organization: experience.company,
      description: experience.summary,
      tags: ['experience', 'work', 'internship', experience.company, experience.role].filter(Boolean),
      source: 'knowledge-base',
    });
  });

  KB.scholarships.forEach((scholarship) => {
    const title = scholarship.title;
    records.set(`scholarship-${normalizeKey(title)}`, {
      id: `kb-scholarship-${slugify(title)}`,
      title,
      category: 'scholarship',
      period: scholarship.period,
      organization: scholarship.provider,
      description: [scholarship.program, scholarship.notes].filter(Boolean).join(' '),
      tags: ['scholarship', 'scholar', scholarship.provider, scholarship.program || ''].filter(Boolean),
      source: 'knowledge-base',
    });
  });

  document.querySelectorAll<HTMLElement>('.timeline-item').forEach((element) => {
    const item = timelineFromElement(element);
    if (!item) return;
    const key = `${item.category}-${normalizeKey(item.title)}-${normalizeKey(item.organization)}`;
    const existing = records.get(key);
    records.set(key, {
      ...(existing || item),
      ...item,
      title: item.title || existing?.title || '',
      organization: item.organization || existing?.organization,
      period: item.period || existing?.period,
      description: item.description || existing?.description,
      tags: item.tags.length ? item.tags : existing?.tags || [],
    });
  });

  const order = { experience: 0, scholarship: 1, education: 2 };
  return Array.from(records.values()).sort((a, b) => {
    const aYear = Number(a.period?.match(/\b20\d{2}\b/)?.[0] || 0);
    const bYear = Number(b.period?.match(/\b20\d{2}\b/)?.[0] || 0);
    return order[a.category] - order[b.category] || bYear - aYear || a.title.localeCompare(b.title);
  });
}

export function getPortfolioSearchEntries(): PortfolioSearchEntry[] {
  const entries: PortfolioSearchEntry[] = [
    {
      id: 'page-about',
      title: 'About Adriel Magalona',
      type: 'page',
      section: 'about',
      subtitle: 'Profile, tech stack, GitHub signal, honors, and contact',
      description: KB.profile.summary,
      keywords: ['about', 'profile', 'bio', 'services', 'tech stack', 'honors', 'contact', KB.profile.title],
      target: 'about',
    },
    {
      id: 'page-background',
      title: 'Background & Experience',
      type: 'page',
      section: 'background',
      subtitle: 'Education, professional experience, and scholarships',
      description: 'Academic journey, work experience, and scholarship records.',
      keywords: ['background', 'education', 'experience', 'scholarship', 'timeline'],
      target: 'background',
    },
    {
      id: 'page-projects',
      title: 'Projects & Portfolio',
      type: 'page',
      section: 'projects',
      subtitle: 'Full project gallery and detailed case-study modals',
      description: 'Browse all project cards, demos, GitHub links, and project details.',
      keywords: ['projects', 'portfolio', 'work', 'apps', 'web', 'ai'],
      target: 'projects',
    },
    {
      id: 'page-gear',
      title: 'Gear',
      type: 'page',
      section: 'gear',
      subtitle: 'Current workspace, devices, and creative setup',
      description: 'Browse the tools and equipment behind the portfolio workflow.',
      keywords: ['gear', 'setup', 'hardware', 'workspace', 'devices'],
      target: 'gear',
    },
    {
      id: 'contact-email',
      title: 'Email Adriel',
      type: 'contact',
      section: 'contact',
      subtitle: KB.contact.email,
      description: 'Open contact options or copy the email address.',
      keywords: ['email', 'contact', 'message', KB.contact.email],
      target: 'contact',
      url: `mailto:${KB.contact.email}`,
    },
    {
      id: 'contact-github',
      title: 'GitHub Profile',
      type: 'contact',
      section: 'contact',
      subtitle: '@adr1el-m',
      description: 'Open Adriel’s GitHub profile.',
      keywords: ['github', 'code', 'repos', 'contributions'],
      url: KB.contact.github,
    },
    {
      id: 'contact-linkedin',
      title: 'LinkedIn Profile',
      type: 'contact',
      section: 'contact',
      subtitle: 'adrielmagalona',
      description: 'Open Adriel’s LinkedIn profile.',
      keywords: ['linkedin', 'professional', 'contact', 'network'],
      url: KB.contact.linkedin,
    },
    {
      id: 'action-resume',
      title: 'Preview Resume',
      type: 'action',
      section: 'action',
      subtitle: 'Open the latest resume PDF',
      description: KB.resume.headline,
      keywords: ['resume', 'cv', 'hire', 'candidate'],
      url: KB.contact.resumeUrl,
    },
    {
      id: 'action-adrai',
      title: 'Ask AdrAI',
      type: 'action',
      section: 'action',
      subtitle: 'Open the portfolio assistant',
      description: 'Ask questions about projects, skills, honors, and contact links.',
      keywords: ['adrai', 'ai', 'assistant', 'chatbot', 'ask'],
      target: 'adrai',
    },
  ];

  getProjectRecords().forEach((project) => {
    entries.push({
      id: `project-${slugify(project.title)}`,
      title: project.title,
      type: 'project',
      section: 'projects',
      subtitle: project.category || 'Project',
      description: project.description,
      keywords: [project.title, project.category || '', project.technologies || '', project.description || ''],
      element: project.element,
      target: project.title,
      url: project.githubUrl || project.liveUrl || project.videoUrl,
    });
  });

  getHonorRecords().forEach((honor) => {
    entries.push({
      id: `honor-${slugify(honor.title)}`,
      title: honor.title,
      type: 'honor',
      section: 'about',
      subtitle: [honor.date, honor.organizer].filter(Boolean).join(' • ') || 'Honor',
      description: honor.description,
      keywords: [honor.title, honor.organizer || '', honor.date || '', honor.location || '', honor.projectTitle || '', honor.description || ''],
      element: honor.element,
      target: honor.title,
      url: honor.githubUrl || honor.linkedinUrl || honor.blogUrl,
    });
  });

  getTimelineRecords().forEach((item) => {
    entries.push({
      id: `timeline-${item.id}`,
      title: item.title,
      type: 'timeline',
      section: 'background',
      subtitle: [item.organization, item.period].filter(Boolean).join(' • ') || item.category,
      description: item.description,
      keywords: [item.title, item.organization || '', item.period || '', item.category, ...item.tags, item.description || ''],
      element: item.element,
      target: item.category,
    });
  });

  KB.skills.technologies.forEach((skill) => {
    entries.push({
      id: `skill-${slugify(skill)}`,
      title: skill,
      type: 'skill',
      section: 'about',
      subtitle: 'Technology',
      description: `Technology listed in Adriel’s stack: ${skill}.`,
      keywords: ['skill', 'technology', 'stack', skill],
      target: 'skills',
    });
  });

  return entries;
}
