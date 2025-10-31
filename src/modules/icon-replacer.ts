import { logger } from '@/config';

/**
 * Icon Replacer Module
 * Replaces ion-icon elements with Unicode equivalents to avoid external dependencies and CSP issues.
 */
export class IconReplacer {
  private readonly iconMap: Record<string, string> = {
    'chevron-down': '▼',
    'mail-outline': '✉️',
    'location-outline': '📍',
    'logo-linkedin': '💼',
    'logo-github': '🔗',
    'logo-facebook': '📘',
    'logo-twitter': '🐦',
    'logo-instagram': '📸',
    'book-outline': '📚',
    'arrow-up-outline': '↑',
    'sunny-outline': '☀️',
    'eye-outline': '👁️',
    'checkmark-circle': '✅'
  };

  constructor() {
    this.replaceIcons();
  }

  private replaceIcons(): void {
    document.querySelectorAll('ion-icon').forEach(icon => {
      const iconName = icon.getAttribute('name');
      if (iconName && this.iconMap[iconName]) {
        // Use textContent for security
        icon.textContent = this.iconMap[iconName];
        // Hide decorative icons from assistive technologies
        icon.setAttribute('aria-hidden', 'true');
        // Apply some basic styling to make them look right
        const element = icon as HTMLElement;
        element.style.fontSize = '1.2em';
        element.style.display = 'inline-block';
      }
    });
    logger.log('✅ Icons replaced with Unicode equivalents.');
  }
}
