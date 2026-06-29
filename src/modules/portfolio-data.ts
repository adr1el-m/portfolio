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
