function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanDescription(value: string | null): string {
  if (!value) return '';
  return value
    .replace(/&#10;/g, ' ')
    .replace(/\b(Purpose|Build|Outcome):/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTech(tech: string | null): string[] {
  if (!tech) return [];
  const text = tech.replace(/<[^>]+>/g, ' ');
  return text
    .split(/[•,|/]+/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 3);
}

export class ProjectPreviews {
  constructor() {
    this.init();
  }

  private init(): void {
    document.querySelectorAll<HTMLElement>('.project-item').forEach((item) => {
      const media = item.querySelector<HTMLElement>('.project-img');
      if (!media || media.querySelector('.project-preview-card')) return;

      const img = media.querySelector<HTMLImageElement>('img');
      const video = media.querySelector<HTMLVideoElement>('video');
      const hasInlinePlaceholder = Boolean(img?.src.startsWith('data:image/svg') || video?.poster.startsWith('data:image/svg'));
      const hasNoGallery = (item.getAttribute('data-images') || '[]').trim() === '[]';
      const hasVideo = Boolean(video || item.getAttribute('data-video'));

      if (video && video.poster.startsWith('data:image/svg')) {
        video.removeAttribute('poster');
      }

      if (hasVideo) return;
      if (!hasInlinePlaceholder && !hasNoGallery) return;

      const title = item.querySelector('.project-title')?.textContent?.trim() || 'Project';
      const category = item.getAttribute('data-category') || 'Portfolio project';
      const description = cleanDescription(item.getAttribute('data-description'));
      const tech = extractTech(item.getAttribute('data-technologies'));

      const preview = document.createElement('div');
      preview.className = 'project-preview-card';
      preview.setAttribute('aria-hidden', 'true');
      preview.innerHTML = `
        <div class="project-preview-topline">
          <span>${escapeHtml(category)}</span>
          ${item.hasAttribute('data-featured') ? '<strong>Featured</strong>' : ''}
        </div>
        <div class="project-preview-name">${escapeHtml(title)}</div>
        <p>${escapeHtml(description || 'Portfolio-ready project preview and implementation notes available in the details modal.')}</p>
        ${tech.length ? `<div class="project-preview-tech">${tech.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      `;

      media.appendChild(preview);
      if (img && hasInlinePlaceholder) {
        img.classList.add('project-placeholder-hidden');
      }
    });
  }
}
