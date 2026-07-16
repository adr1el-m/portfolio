export class PwaManager {
  private static deferredPrompt: BeforeInstallPromptEvent | null = null;

  public static register(): void {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const swUrl = '/sw.js';
    PwaManager.bindInstallButtons();
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      PwaManager.deferredPrompt = event as BeforeInstallPromptEvent;
      document.querySelectorAll<HTMLElement>('[data-pwa-install]').forEach((button) => {
        button.hidden = false;
      });
    }, { once: true });
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.info('✅ Service Worker registered:', registration.scope);

          // Listen for updates
          registration.onupdatefound = () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.onstatechange = () => {
              if (installing.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  PwaManager.showUpdatePrompt();
                } else {
                  PwaManager.showInstalledToast();
                }
              }
            };
          };
        })
        .catch((err) => {
          console.warn('❌ Service Worker registration failed:', err);
        });
    });
  }

  private static bindInstallButtons(): void {
    document.querySelectorAll<HTMLElement>('[data-pwa-install]').forEach((button) => {
      if (button.dataset.pwaInstallBound) return;
      button.dataset.pwaInstallBound = 'true';
      button.addEventListener('click', () => void PwaManager.install());
    });
  }

  private static async install(): Promise<void> {
    const prompt = PwaManager.deferredPrompt;
    if (!prompt) {
      PwaManager.showInstallGuidance();
      return;
    }

    await prompt.prompt();
    const choice = await prompt.userChoice;
    PwaManager.deferredPrompt = null;
    if (choice.outcome === 'accepted') {
      document.querySelectorAll<HTMLElement>('[data-pwa-install]').forEach((button) => { button.hidden = true; });
      PwaManager.showToast('Portfolio installed. It will be available from your device.');
    } else {
      PwaManager.showToast('Install dismissed. You can install it from your browser whenever you are ready.');
    }
  }

  private static showInstallGuidance(): void {
    const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const message = isAppleMobile
      ? 'To install on iPhone or iPad: tap Share, then Add to Home Screen.'
      : 'Use your browser’s install option in the address bar or menu. PWA install requires localhost or HTTPS, not a file opened directly.';
    PwaManager.showToast(message, 6500);
  }

  private static showToast(message: string, duration = 3500): void {
    const id = 'pwa-status-toast';
    document.getElementById(id)?.remove();
    const el = document.createElement('div');
    el.id = id;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;bottom:16px;left:50%;max-width:min(520px,calc(100vw - 32px));transform:translateX(-50%);background:var(--eerie-black-2);color:var(--white-1);border:1px solid var(--jet);border-radius:10px;padding:10px 12px;box-shadow:0 8px 24px rgba(0,0,0,0.35);z-index:1000;text-align:center;line-height:1.45;';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, duration);
  }

  private static showInstalledToast(): void {
    PwaManager.showToast('Content cached for offline use.');
  }

  private static showUpdatePrompt(): void {
    const id = 'pwa-update-banner';
    if (document.getElementById(id)) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:var(--eerie-black-2);color:var(--white-1);border:1px solid var(--jet);border-radius:12px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,0.35);z-index:1000;display:flex;align-items:center;gap:12px;';
    const text = document.createElement('span');
    text.textContent = 'New version available';
    const reload = document.createElement('button');
    reload.type = 'button';
    reload.textContent = 'Reload';
    reload.style.cssText = 'padding:8px 10px;border-radius:8px;border:1px solid var(--jet);background:var(--border-gradient-onyx);color:var(--white-1);cursor:pointer;';
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = 'Dismiss';
    dismiss.style.cssText = 'padding:8px 10px;border-radius:8px;border:1px solid var(--jet);background:var(--eerie-black-1);color:var(--white-1);cursor:pointer;';
    el.appendChild(text);
    el.appendChild(reload);
    el.appendChild(dismiss);
    document.body.appendChild(el);
    if (!reduce) {
      el.animate([{ opacity: 0, transform: 'translateX(-50%) translateY(8px)' }, { opacity: 1, transform: 'translateX(-50%) translateY(0)' }], { duration: 200, easing: 'ease-out' });
    }
    reload.addEventListener('click', () => { location.reload(); });
    dismiss.addEventListener('click', () => { el.remove(); });
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default PwaManager;
