import { logger } from '@/config';

/**
 * Privacy-friendly Lazy YouTube Embeds
 * - Renders thumbnails lazily
 * - Loads `youtube-nocookie.com` iframe only on user interaction
 * - Keeps JS and network footprint minimal until needed
 */
export class YouTubeEmbeds {
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    const list = document.querySelector('.youtube-list');
    if (!list) {
      logger.info('YouTubeEmbeds: No .youtube-list found.');
      return;
    }

    const items = list.querySelectorAll<HTMLElement>('.youtube-item');
    this.setupObserver();

    items.forEach((item) => {
      // Lazy-load thumbnail when card enters viewport
      if (this.observer) this.observer.observe(item);

      // Click/keyboard to embed
      const thumb = item.querySelector<HTMLAnchorElement>('.youtube-thumb');
      if (thumb) {
        thumb.addEventListener(
          'click',
          (e) => {
            e.preventDefault();
            this.embedVideo(item);
          },
          { once: true }
        );

        thumb.addEventListener('keydown', (e) => {
          const ke = e as KeyboardEvent;
          if (ke.key === 'Enter' || ke.key === ' ') {
            e.preventDefault();
            this.embedVideo(item);
          }
        });
      }
    });

    logger.info(`YouTubeEmbeds initialized for ${items.length} items.`);
  }

  private setupObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const item = entry.target as HTMLElement;
            this.loadThumbnail(item);
            this.observer?.unobserve(item);
          }
        });
      },
      { rootMargin: '100px' }
    );
  }

  private parseVideoId(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        return u.pathname.replace('/', '');
      }
      const v = u.searchParams.get('v');
      if (v) return v;
      const parts = u.pathname.split('/');
      const idx = parts.indexOf('embed');
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    } catch (_) {
      // Fallback regex
      const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
      if (m) return m[1];
    }
    return null;
  }

  private loadThumbnail(item: HTMLElement): void {
    const url = item.dataset.videoUrl || '';
    const id = this.parseVideoId(url);
    const title = item.querySelector('h3')?.textContent?.trim() || 'YouTube video';
    const thumbAnchor = item.querySelector('.youtube-thumb') as HTMLAnchorElement | null;
    if (!thumbAnchor || !id) return;

    const img = new Image();
    img.loading = 'lazy';
    img.alt = title;
    img.referrerPolicy = 'no-referrer';
    img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '10px';

    // Replace placeholder with image + play overlay
    thumbAnchor.innerHTML = '';
    thumbAnchor.style.position = 'relative';
    thumbAnchor.appendChild(img);

    const icon = document.createElement('span');
    icon.className = 'play-icon';
    icon.textContent = '▶';
    icon.setAttribute('aria-hidden', 'true');
    icon.style.position = 'absolute';
    icon.style.color = '#fff';
    icon.style.fontSize = '2rem';
    icon.style.textShadow = '0 2px 8px rgba(0,0,0,.8)';
    icon.style.left = '50%';
    icon.style.top = '50%';
    icon.style.transform = 'translate(-50%, -50%)';
    thumbAnchor.appendChild(icon);
  }

  private embedVideo(item: HTMLElement): void {
    const player = item.querySelector('.yt-player') as HTMLElement | null;
    const url = item.dataset.videoUrl || '';
    const id = this.parseVideoId(url);
    if (!player || !id) return;

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&color=white`;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
    iframe.title = item.querySelector('h3')?.textContent?.trim() || 'YouTube video';
    iframe.allowFullscreen = true;

    player.hidden = false;
    player.innerHTML = '';
    player.appendChild(iframe);

    const thumb = item.querySelector('.youtube-thumb') as HTMLElement | null;
    if (thumb) thumb.style.display = 'none';

    logger.log('YouTubeEmbeds: Embedded video (nocookie):', id);
  }
}

export default YouTubeEmbeds;
