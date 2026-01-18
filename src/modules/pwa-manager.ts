export class PwaManager {
  public static register(): void {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const swUrl = '/sw.js';
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

  private static showInstalledToast(): void {
    const id = 'pwa-installed-toast';
    if (document.getElementById(id)) return;
    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:var(--eerie-black-2);color:var(--white-1);border:1px solid var(--jet);border-radius:10px;padding:10px 12px;box-shadow:0 8px 24px rgba(0,0,0,0.35);z-index:1000;display:flex;align-items:center;gap:10px;';
    el.textContent = 'Content cached for offline use.';
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 3000);
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

export default PwaManager;