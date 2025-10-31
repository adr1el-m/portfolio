import { logger } from '@/config';

function svgDataUri(title: string, width = 400, height = 300, bg = '#1a1a1a', fg = '#ffdb70'): string {
  const safeText = (title || '').replace(/\s+/g, ' ').trim();
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          fill="${fg}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          font-size="24" font-weight="600">
      ${safeText}
    </text>
  </svg>`;
  const encoded = encodeURIComponent(svg)
    // preserve characters that browsers tolerate in data URIs for better readability
    .replace(/%20/g, ' ');
  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

export class TextPlaceholders {
  public init(): void {
    try {
      const items = Array.from(document.querySelectorAll<HTMLElement>('.project-item'));
      items.forEach((item) => {
        const title = item.querySelector('.project-title')?.textContent?.trim() || '';
        const img = item.querySelector<HTMLImageElement>('.project-img img');
        const video = item.querySelector<HTMLVideoElement>('.project-img video');

        // Replace missing/external placeholder IMG early to avoid network requests
        if (img && (!img.src || /placehold\.co/.test(img.src))) {
          img.src = svgDataUri(title);
          img.classList.remove('image-error');
          const parent = img.parentElement;
          const err = parent?.querySelector('.image-error-placeholder');
          if (err) err.remove();
          img.style.display = 'block';
        }

        // Replace external placeholder VIDEO poster
        if (video) {
          const posterAttr = video.getAttribute('data-poster') || video.getAttribute('poster') || '';
          if (!posterAttr || /placehold\.co/.test(posterAttr)) {
            const uri = svgDataUri(title);
            video.setAttribute('data-poster', uri);
            video.poster = uri;
          }
        }
      });

      logger.log(`TextPlaceholders: applied to ${items.length} items`);
    } catch (e) {
      logger.warn('TextPlaceholders: failed to apply placeholders', e);
    }
  }
}