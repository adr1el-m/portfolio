import { initializeApp } from 'firebase/app';
import { getDatabase, ref, runTransaction, onValue } from 'firebase/database';
import { logger } from '@/config';

/**
 * Visitor Counter Module
 * Tracks total unique visits using Firebase Realtime Database
 * Increments counter only once per session
 */

// Firebase config
// Firebase config - uses public Realtime Database rules
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export class VisitorCounter {
    private visitorCountEl: HTMLElement | null = null;
    private isAdmin: boolean = false;

    constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        try {
            this.isAdmin = this.checkIfAdmin();

            const app = initializeApp(firebaseConfig);
            const db = getDatabase(app);
            const countRef = ref(db, 'totalVisits');

            // Increment count if new session and not admin
            const hasVisited = sessionStorage.getItem('visited_session');

            if (!hasVisited && !this.isAdmin) {
                // Use transaction to safely increment counter
                runTransaction(countRef, (currentCount) => {
                    return (currentCount || 0) + 1;
                }).then(() => {
                    sessionStorage.setItem('visited_session', 'true');
                }).catch((err) => {
                    logger.warn('VisitorCounter: failed to increment', err);
                });
            }

            // Listen for updates
            onValue(countRef, (snapshot) => {
                const val = snapshot.val();
                // If null (new db), default to 0
                const count = typeof val === 'number' ? val : 0;
                this.updateDisplay(count);

                // If it's 0 and we haven't visited, try to initialize it
                if (count === 0 && !hasVisited && !this.isAdmin) {
                    // allow the transaction below to run
                }
            }, (error) => {
                logger.error('VisitorCounter: subscription error', error);
                this.updateDisplay(0);
            });

            this.createCounterUI();
            logger.log(`VisitorCounter: initialized (admin: ${this.isAdmin})`);

        } catch (error) {
            logger.error('VisitorCounter: initialization failed', error);
            this.createCounterUI();
            this.updateDisplay(0);
        }
    }

    private checkIfAdmin(): boolean {
        const params = new URLSearchParams(window.location.search);
        if (params.get('admin') === 'true' || params.get('exclude') === 'me') {
            localStorage.setItem('portfolio-admin', 'true');
            return true;
        }
        return localStorage.getItem('portfolio-admin') === 'true';
    }

    private createCounterUI(): void {
        const sidebarInfo = document.querySelector('.sidebar-info_more');
        if (!sidebarInfo) return;

        if (document.querySelector('.visitor-counter')) return;

        const counterWrapper = document.createElement('div');
        counterWrapper.className = 'visitor-counter';
        counterWrapper.innerHTML = `
      <div class="visitor-counter-inner">
        <ion-icon name="eye-outline" class="visitor-icon"></ion-icon>
        <span class="visitor-count" id="visitor-count">...</span>
        <span class="visitor-label">Total Visits</span>
      </div>
    `;

        const contactsList = sidebarInfo.querySelector('.contacts-list');
        if (contactsList) {
            sidebarInfo.insertBefore(counterWrapper, contactsList);
        } else {
            sidebarInfo.insertBefore(counterWrapper, sidebarInfo.firstChild);
        }

        this.visitorCountEl = document.getElementById('visitor-count');
        this.addStyles();
    }

    private addStyles(): void {
        if (document.getElementById('visitor-counter-styles')) return;

        const style = document.createElement('style');
        style.id = 'visitor-counter-styles';
        style.textContent = `
      .visitor-counter {
        display: flex;
        justify-content: center;
        margin-bottom: 20px;
        padding: 10px 0;
      }

      .visitor-counter-inner {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(255, 219, 112, 0.08);
        border: 1px solid rgba(255, 219, 112, 0.2);
        border-radius: 20px;
        font-size: 13px;
        color: var(--light-gray);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }

      .visitor-counter-inner:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 219, 112, 0.15);
        background: rgba(255, 219, 112, 0.12);
      }

      .visitor-icon {
        color: var(--orange-yellow-crayola);
        font-size: 16px;
      }

      .visitor-count {
        font-weight: 600;
        color: var(--white-1);
        min-width: 12px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }

      .visitor-label {
        color: var(--light-gray-70);
        font-size: 12px;
      }
    `;
        document.head.appendChild(style);
    }

    private updateDisplay(count: number): void {
        if (!this.visitorCountEl) {
            this.visitorCountEl = document.getElementById('visitor-count');
        }

        if (this.visitorCountEl) {
            // Format with commas (e.g., 1,234)
            this.visitorCountEl.textContent = new Intl.NumberFormat().format(count);
        }
    }

    public destroy(): void {
        this.visitorCountEl?.closest('.visitor-counter')?.remove();
        const style = document.getElementById('visitor-counter-styles');
        style?.remove();
    }
}
