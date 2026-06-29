import { KB } from '@/data/knowledge-base';

const SITE_URL = 'https://adriel.dev';

function absoluteUrl(pathOrUrl?: string): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

function cleanDescription(value?: string): string {
  return (value || '')
    .replace(/\b(Purpose|Build|Outcome|Recognition|Participation|Scope|Contribution):/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class StructuredData {
  constructor() {
    this.inject();
  }

  private inject(): void {
    const existing = document.getElementById('portfolio-generated-schema');
    existing?.remove();

    const graph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person',
          '@id': `${SITE_URL}#adriel`,
          name: KB.profile.name,
          url: SITE_URL,
          image: absoluteUrl('/images/my-avatar.png'),
          jobTitle: KB.profile.title,
          nationality: KB.profile.nationality,
          email: KB.contact.email,
          sameAs: [KB.contact.github, KB.contact.linkedin].filter(Boolean),
          alumniOf: KB.education.map((item) => ({
            '@type': 'EducationalOrganization',
            name: item.school,
          })),
          award: KB.achievements
            .filter((item) => /winner|champion|place|runner|recognition|scholar/i.test(`${item.title} ${item.description || ''}`))
            .slice(0, 12)
            .map((item) => item.title),
          knowsAbout: [...KB.skills.core, ...KB.skills.technologies].slice(0, 24),
          description: KB.profile.summary,
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}#website`,
          name: 'Adriel Magalona Portfolio',
          url: SITE_URL,
          inLanguage: 'en',
          about: { '@id': `${SITE_URL}#adriel` },
        },
        {
          '@type': 'ItemList',
          '@id': `${SITE_URL}#projects`,
          name: 'Portfolio Projects',
          itemListElement: KB.projects.slice(0, 10).map((project, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'SoftwareApplication',
              name: project.title,
              applicationCategory: project.category,
              codeRepository: project.githubUrl,
              url: project.liveUrl || project.githubUrl || SITE_URL,
              image: absoluteUrl(project.images?.[0] || project.webpImages?.[0]),
              description: cleanDescription(project.description),
              creator: { '@id': `${SITE_URL}#adriel` },
            },
          })),
        },
        {
          '@type': 'ItemList',
          '@id': `${SITE_URL}#honors`,
          name: 'Honors and Awards',
          itemListElement: KB.achievements.slice(0, 16).map((achievement, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'CreativeWork',
              name: achievement.title,
              dateCreated: achievement.date,
              locationCreated: achievement.location,
              image: absoluteUrl(achievement.images?.[0] || achievement.webpImages?.[0]),
              description: cleanDescription(achievement.description),
              contributor: { '@id': `${SITE_URL}#adriel` },
            },
          })),
        },
      ],
    };

    const script = document.createElement('script');
    script.id = 'portfolio-generated-schema';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(graph);
    document.head.appendChild(script);
  }
}
