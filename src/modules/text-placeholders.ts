import { logger } from '@/config';

function svgDataUri(title: string, width = 800, height = 450, bg = '#1a1a1a', fg = '#ffdb70'): string {
  const safeText = (title || '').replace(/\s+/g, ' ').trim();
  
  // Simple word wrap logic
  const words = safeText.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';
  const maxCharsPerLine = 30; // Approx characters per line for font-size 40 at width 800

  for (let i = 1; i < words.length; i++) {
    if ((currentLine + ' ' + words[i]).length < maxCharsPerLine) {
      currentLine += ' ' + words[i];
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);

  // Generate tspans
  const fontSize = 40;
  const lineHeight = 1.2;
  const totalHeight = lines.length * fontSize * lineHeight;
  const startY = (height - totalHeight) / 2 + (fontSize * 0.8); // Center vertically

  const textContent = lines.map((line, index) => {
    const y = startY + (index * fontSize * lineHeight);
    return `<tspan x="50%" y="${y}">${line}</tspan>`;
  }).join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" text-anchor="middle"
          fill="${fg}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          font-size="${fontSize}" font-weight="600">
      ${textContent}
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