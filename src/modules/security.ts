import { logger } from '@/config';

/**
 * Security Module
 * Handles sanitization and other security aspects.
 */
export class SecurityManager {
  constructor() {
    logger.log('SecurityManager initialized');
  }

  public sanitize(input: string): string {
    const temp = document.createElement('div');
    temp.textContent = input;
    return temp.innerHTML;
  }

  // Add safe URL validation
  public static isSafeUrl(url: string): boolean {
    try {
      const u = new URL(url, window.location.origin);
      if (u.protocol === 'https:' || u.protocol === 'mailto:' || u.protocol === 'tel:') {
        return true;
      }
      if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Create an anchor with safe defaults and sanitized href
  public static createSafeAnchor(href: string, text: string, className?: string, targetBlank = true): HTMLAnchorElement {
    const a = document.createElement('a');
    if (className) a.className = className;
    a.textContent = text;
    if (SecurityManager.isSafeUrl(href)) {
      a.href = href;
    } else {
      a.href = '#';
      a.setAttribute('aria-disabled', 'true');
    }
    if (targetBlank) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    return a;
  }
}
