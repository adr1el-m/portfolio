type ParsedHonor = {
  card: HTMLElement;
  title: string;
  subtitle: string;
  description: string;
  organizer: string;
  images: string[];
  projectTitle: string;
  isWin: boolean;
  isHackathon: boolean;
  isAI: boolean;
};

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function descriptionParts(description: string): Array<{ label: string; body: string }> {
  return description
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([A-Za-z ]+):\s*(.+)$/);
      if (!match) return null;
      return { label: match[1].trim(), body: match[2].trim() };
    })
    .filter(Boolean) as Array<{ label: string; body: string }>;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class HonorsGallery {
  private honors: ParsedHonor[] = [];
  private activeFilter = 'all';

  constructor() {
    this.init();
  }

  private init(): void {
    const section = document.querySelector<HTMLElement>('section.achievements');
    if (!section || document.querySelector('.honors-overview')) return;

    this.injectStyles();
    this.honors = Array.from(section.querySelectorAll<HTMLElement>('.achievement-card'))
      .map((card) => this.parseHonor(card));

    if (!this.honors.length) return;
    this.decorateCards();
    this.insertOverview(section);
    this.applyFilter('all');
  }

  private parseHonor(card: HTMLElement): ParsedHonor {
    const title = card.querySelector('.card-title')?.textContent?.trim() || 'Honor';
    const subtitle = card.querySelector('.card-subtitle')?.textContent?.trim() || '';
    const description = card.dataset.description || '';
    const organizer = card.dataset.organizer || '';
    const projectTitle = card.dataset.projectTitle || '';
    const images = parseJsonArray(card.dataset.images || '[]');
    const hay = normalize(`${title} ${subtitle} ${description} ${organizer} ${projectTitle}`);

    return {
      card,
      title,
      subtitle,
      description,
      organizer,
      images,
      projectTitle,
      isWin: /\b(won|winner|champion|placed|place|runner|top\s*5|awardee|2nd|3rd)\b/.test(hay),
      isHackathon: /\bhackathon|challenge|start-a-ton|technovation|datawave|hack-it|hackercup\b/.test(hay),
      isAI: /\b(ai|data|agentic|gemini|llama|machine learning|analytics|voice)\b/.test(hay),
    };
  }

  private decorateCards(): void {
    this.honors.forEach((honor) => {
      const card = honor.card;
      card.dataset.honorWin = String(honor.isWin);
      card.dataset.honorHackathon = String(honor.isHackathon);
      card.dataset.honorAi = String(honor.isAI);
      card.dataset.honorMedia = String(honor.images.length > 0);

      if (honor.images.length && !card.querySelector('.achievement-card-media')) {
        const media = document.createElement('div');
        media.className = 'achievement-card-media';
        media.innerHTML = `
          <img src="${escapeHtml(honor.images[0])}" alt="${escapeHtml(honor.title)} preview" loading="lazy" decoding="async">
          <span>${honor.images.length} ${honor.images.length === 1 ? 'image' : 'images'}</span>
        `;
        card.prepend(media);
      }

      if (!card.querySelector('.achievement-story-micro')) {
        const parts = descriptionParts(honor.description);
        const selected = parts
          .filter((part) => /Recognition|Participation|Scope|Contribution/.test(part.label))
          .slice(0, 2);
        if (selected.length) {
          const story = document.createElement('div');
          story.className = 'achievement-story-micro';
          story.innerHTML = selected
            .map((part) => `<p><strong>${escapeHtml(part.label)}</strong>${escapeHtml(part.body)}</p>`)
            .join('');
          card.querySelector('.card-content')?.appendChild(story);
        }
      }
    });
  }

  private insertOverview(section: HTMLElement): void {
    const wins = this.honors.filter((honor) => honor.isWin).length;
    const hackathons = this.honors.filter((honor) => honor.isHackathon).length;
    const media = this.honors.filter((honor) => honor.images.length).length;
    const projectLinked = this.honors.filter((honor) => honor.projectTitle).length;

    const overview = document.createElement('div');
    overview.className = 'honors-overview';
    overview.innerHTML = `
      <div class="honors-stats" aria-label="Honors summary">
        <div><strong>${this.honors.length}</strong><span>Total honors</span></div>
        <div><strong>${wins}</strong><span>Recognitions</span></div>
        <div><strong>${hackathons}</strong><span>Hackathons</span></div>
        <div><strong>${projectLinked || media}</strong><span>Project/media stories</span></div>
      </div>
      <div class="honors-filter-bar" role="toolbar" aria-label="Filter honors">
        ${[
        ['all', 'All'],
        ['wins', 'Recognitions'],
        ['hackathons', 'Hackathons'],
        ['ai', 'AI/Data'],
        ['media', 'With Media'],
      ].map(([value, label]) => `
          <button type="button" class="honors-filter${value === 'all' ? ' active' : ''}" data-honor-filter="${value}" aria-pressed="${value === 'all' ? 'true' : 'false'}">${label}</button>
        `).join('')}
      </div>
    `;

    const timeline = section.querySelector('.awards-timeline');
    if (timeline) section.insertBefore(overview, timeline);

    overview.querySelectorAll<HTMLButtonElement>('[data-honor-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.honorFilter || 'all';
        this.applyFilter(value);
      });
    });
  }

  private matchesFilter(honor: ParsedHonor): boolean {
    switch (this.activeFilter) {
      case 'wins':
        return honor.isWin;
      case 'hackathons':
        return honor.isHackathon;
      case 'ai':
        return honor.isAI;
      case 'media':
        return honor.images.length > 0;
      default:
        return true;
    }
  }

  private applyFilter(filter: string): void {
    this.activeFilter = filter;
    document.querySelectorAll<HTMLButtonElement>('[data-honor-filter]').forEach((button) => {
      const active = button.dataset.honorFilter === filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    this.honors.forEach((honor) => {
      honor.card.hidden = !this.matchesFilter(honor);
    });

    document.querySelectorAll<HTMLElement>('.year-group').forEach((group) => {
      const visibleCards = group.querySelectorAll<HTMLElement>('.achievement-card:not([hidden])');
      group.hidden = visibleCards.length === 0;
    });
  }

  private injectStyles(): void {
    if (document.getElementById('honors-gallery-styles')) return;
    const style = document.createElement('style');
    style.id = 'honors-gallery-styles';
    style.textContent = `
      .honors-overview {
        display: grid;
        gap: 12px;
        margin-bottom: 20px;
      }

      .honors-stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .honors-stats div {
        padding: 14px;
        border-radius: 12px;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018));
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .honors-stats strong {
        color: var(--orange-yellow-crayola);
        font-size: 22px;
        line-height: 1.1;
      }

      .honors-stats span {
        color: var(--light-gray);
        font-size: 12px;
        line-height: 1.25;
      }

      .honors-filter-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .honors-filter {
        min-height: 36px;
        padding: 8px 12px;
        border-radius: 9px;
        color: var(--light-gray);
        background: rgba(255, 255, 255, 0.045);
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 12px;
        font-weight: 700;
      }

      .honors-filter.active {
        color: var(--smoky-black);
        background: var(--orange-yellow-crayola);
        border-color: transparent;
      }

      .achievement-card[hidden],
      .year-group[hidden] {
        display: none !important;
      }

      .achievement-card {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .achievement-card-media {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.24);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .achievement-card-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .achievement-card-media span {
        position: absolute;
        right: 8px;
        bottom: 8px;
        padding: 4px 7px;
        border-radius: 999px;
        color: var(--white-2);
        background: rgba(0, 0, 0, 0.68);
        border: 1px solid rgba(255, 255, 255, 0.12);
        font-size: 10px;
        line-height: 1;
      }

      .achievement-story-micro {
        display: grid;
        gap: 8px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .achievement-story-micro p {
        color: var(--light-gray);
        font-size: 12px;
        line-height: 1.45;
        margin: 0;
      }

      .achievement-story-micro strong {
        display: block;
        color: var(--orange-yellow-crayola);
        font-size: 10px;
        line-height: 1;
        margin-bottom: 4px;
        text-transform: uppercase;
      }

      @media (max-width: 760px) {
        .honors-stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 430px) {
        .honors-stats {
          grid-template-columns: 1fr;
        }

        .honors-filter {
          flex: 1 1 auto;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
