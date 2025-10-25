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
                  console.info('🔄 New content is available; please refresh.');
                } else {
                  console.info('📥 Content cached for offline use.');
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
}

export default PwaManager;