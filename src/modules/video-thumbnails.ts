import { logger } from '@/config';

/**
 * Video Thumbnails Module
 * Manages project card videos to reduce CPU/battery usage by:
 * - displaying posters instead of autoplaying video
 * - deferring playback until user interaction
 * - pausing videos when off-screen via IntersectionObserver
 */
export class VideoThumbnails {
  private observer: IntersectionObserver | null = null;
  private videos: HTMLVideoElement[] = [];

  constructor() {
    this.init();
  }

  private init(): void {
    const vids = Array.from(document.querySelectorAll<HTMLVideoElement>('.project-card-video'));
    if (vids.length === 0) {
      logger.log('VideoThumbnails: no project-card-video elements found');
      return;
    }

    this.videos = vids;
    this.setupObserver();
    this.prepareVideos();

    // Pause when page becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.videos.forEach(v => this.safePause(v));
      }
    });

    logger.log(`VideoThumbnails: initialized for ${this.videos.length} videos`);
  }

  private setupObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (!entry.isIntersecting) {
            // Off-screen: pause video to save resources
            this.safePause(video);
          } else {
            // In view: load src and autoplay muted loop for thumbnail playback
            try {
              if (!video.getAttribute('src')) {
                const ds = video.getAttribute('data-src');
                if (ds) {
                  video.src = ds;
                }
              }
              video.loop = true;
              video.muted = true;
              video.setAttribute('playsinline', '');
              video.setAttribute('autoplay', '');
              // Prefer metadata preload once visible to speed first frame
              video.preload = 'metadata';
              video.play().catch((err) => {
                logger.warn('VideoThumbnails: autoplay blocked', err);
              });
            } catch (e) {
              logger.warn('VideoThumbnails: failed to start autoplay', e);
            }
          }
        });
      },
      {
        root: null,
        // Start earlier for faster first paint when scrolling
        rootMargin: '300px',
        threshold: 0.01,
      }
    );
  }

  private prepareVideos(): void {
    this.videos.forEach((video) => {
      try {
        // Remove autoplay to defer playback; keep playsinline for mobile behavior
        video.removeAttribute('autoplay');
        video.setAttribute('playsinline', '');
        // Keep loop behavior only when playing
        // Ensure videos are muted to allow user-initiated play without controls
        video.muted = true;
        // Avoid network fetch until explicitly played
        video.preload = 'none';

        // Move src to data-src to fully prevent initial network requests
        const existingSrc = video.getAttribute('src');
        if (existingSrc) {
          video.setAttribute('data-src', existingSrc);
          video.removeAttribute('src');
        }

        // Assign poster from nearest project-item data-images/webp-images or data-poster
        this.assignPoster(video);

        // Observe intersection for pausing when off-screen
        this.observer?.observe(video);

        // Optional hover/touch playback. Disabled by default; enable via data-hover-play.
        if (video.hasAttribute('data-hover-play')) {
          const playHandler = () => {
            // Ensure src is set only when user interacts
            if (!video.getAttribute('src')) {
              const ds = video.getAttribute('data-src');
              if (ds) {
                video.src = ds;
              }
            }
            // Some browsers require a user gesture to play, so catch errors
            video.play().catch((err) => {
              logger.warn('VideoThumbnails: play blocked, require click', err);
            });
          };
          const pauseHandler = () => this.safePause(video);

          video.addEventListener('pointerenter', playHandler);
          video.addEventListener('pointerleave', pauseHandler);
          video.addEventListener('focus', playHandler);
          video.addEventListener('blur', pauseHandler);
          // Fallback for touch: toggle on click
          video.addEventListener('click', () => {
            if (!video.getAttribute('src')) {
              const ds = video.getAttribute('data-src');
              if (ds) {
                video.src = ds;
              }
            }
            if (video.paused) {
              video.play().catch(() => {});
            } else {
              this.safePause(video);
            }
          });
        }
      } catch (e) {
        logger.error('VideoThumbnails: error preparing video', e);
      }
    });
  }

  private assignPoster(video: HTMLVideoElement): void {
    try {
      const parent = video.closest('.project-item') as HTMLElement | null;
      let poster: string | undefined;

      // Prefer JPEG/PNG from data-images
      const imagesStr = parent?.getAttribute('data-images') || '[]';
      const webpImagesStr = parent?.getAttribute('data-webp-images') || '[]';
      const images = JSON.parse(imagesStr) as string[];
      const webpImages = JSON.parse(webpImagesStr) as string[];
      if (images && images.length > 0) {
        poster = images[0];
      } else if (webpImages && webpImages.length > 0) {
        poster = webpImages[0];
      } else {
        poster = video.getAttribute('data-poster') || undefined;
      }

      if (poster) {
        // Warm the cache for the poster image to reduce time-to-first-paint
        this.preloadPoster(poster);
        video.poster = poster;
      }
    } catch (e) {
      logger.warn('VideoThumbnails: failed to assign poster', e);
    }
  }

  /**
   * Preload poster image via <link rel="preload"> to accelerate rendering
   */
  private preloadPoster(url: string): void {
    try {
      if (!url) return;
      const head = document.head;
      const id = `poster-${url}`;
      if (head.querySelector(`link[data-id="${CSS.escape(id)}"]`)) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      // Raise priority for above-the-fold thumbnails
      link.setAttribute('fetchpriority', 'high');
      link.setAttribute('data-id', id);
      if (/^https?:\/\//i.test(url)) {
        link.setAttribute('crossorigin', 'anonymous');
      }
      head.appendChild(link);
    } catch (e) {
      logger.warn('VideoThumbnails: failed to preload poster', e);
    }
  }

  private safePause(video: HTMLVideoElement): void {
    try {
      if (!video.paused) {
        video.pause();
      }
      // Reset frame to start to avoid keeping decoders hot
      // Commented to preserve last frame: uncomment if desired
      // video.currentTime = 0;
    } catch (e) {
      logger.warn('VideoThumbnails: pause failed', e);
    }
  }
}