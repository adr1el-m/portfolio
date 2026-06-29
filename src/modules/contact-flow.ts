import { KB } from '@/data/knowledge-base';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function trackContact(label: string): void {
  window.dispatchEvent(new CustomEvent('portfolio:analytics', {
    detail: { type: 'contact-action', label },
  }));
}

export class ContactFlow {
  private selectedReason = 'Project inquiry';
  private statusTimer: number | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    const sidebarInfo = document.querySelector('.sidebar-info_more');
    const socialList = sidebarInfo?.querySelector('.social-list');
    if (!sidebarInfo || !socialList || document.querySelector('.contact-flow-card')) return;

    this.injectStyles();

    const card = document.createElement('section');
    card.className = 'contact-flow-card';
    card.setAttribute('aria-labelledby', 'contact-flow-title');
    card.innerHTML = `
      <div class="contact-flow-header">
        <div>
          <span class="contact-flow-eyebrow">Open to</span>
          <h2 id="contact-flow-title">Contact</h2>
        </div>
        <a class="contact-flow-resume contact-flow-action" href="${escapeHtml(KB.contact.resumeUrl)}" target="_blank" rel="noopener noreferrer" data-analytics-label="Contact flow: resume">Resume</a>
      </div>
      <div class="contact-flow-reasons" role="group" aria-label="Contact reason">
        ${['Project inquiry', 'Internship', 'Collaboration'].map((reason, index) => `
          <button type="button" class="contact-flow-reason${index === 0 ? ' active' : ''}" data-reason="${escapeHtml(reason)}" aria-pressed="${index === 0 ? 'true' : 'false'}">${escapeHtml(reason)}</button>
        `).join('')}
      </div>
      <label class="contact-flow-label" for="contact-flow-message">Message</label>
      <textarea id="contact-flow-message" class="contact-flow-message" rows="3" maxlength="420" placeholder="Optional context for the email draft"></textarea>
      <div class="contact-flow-actions">
        <button type="button" class="contact-flow-action contact-flow-copy" data-analytics-label="Contact flow: copy email">
          <ion-icon name="copy-outline" aria-hidden="true"></ion-icon>
          Copy Email
        </button>
        <button type="button" class="contact-flow-action contact-flow-draft" data-analytics-label="Contact flow: draft email">
          <ion-icon name="mail-outline" aria-hidden="true"></ion-icon>
          Draft Email
        </button>
      </div>
      <p class="contact-flow-status" role="status" aria-live="polite"></p>
    `;

    socialList.insertAdjacentElement('afterend', card);
    this.bind(card);
  }

  private bind(card: HTMLElement): void {
    const reasonButtons = Array.from(card.querySelectorAll<HTMLButtonElement>('.contact-flow-reason'));
    const message = card.querySelector<HTMLTextAreaElement>('.contact-flow-message');
    const copy = card.querySelector<HTMLButtonElement>('.contact-flow-copy');
    const draft = card.querySelector<HTMLButtonElement>('.contact-flow-draft');

    reasonButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.selectedReason = button.dataset.reason || this.selectedReason;
        reasonButtons.forEach((item) => {
          const isActive = item === button;
          item.classList.toggle('active', isActive);
          item.setAttribute('aria-pressed', String(isActive));
        });
        trackContact(`Contact flow reason: ${this.selectedReason}`);
      });
    });

    copy?.addEventListener('click', async () => {
      try {
        await navigator.clipboard?.writeText(KB.contact.email);
        this.setStatus(card, 'Email copied.');
      } catch {
        this.setStatus(card, KB.contact.email);
      }
      trackContact('Contact flow: copied email');
    });

    draft?.addEventListener('click', () => {
      const url = this.buildMailto(message?.value || '');
      window.location.href = url;
      this.setStatus(card, 'Opening email draft.');
      trackContact(`Contact flow: drafted ${this.selectedReason}`);
    });
  }

  private buildMailto(message: string): string {
    const subject = `Portfolio Inquiry: ${this.selectedReason}`;
    const body = [
      'Hi Adriel,',
      '',
      message.trim() || `I saw your portfolio and wanted to reach out about ${this.selectedReason.toLowerCase()}.`,
      '',
      'Best,',
    ].join('\n');
    return `mailto:${encodeURIComponent(KB.contact.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  private setStatus(card: HTMLElement, text: string): void {
    const status = card.querySelector<HTMLElement>('.contact-flow-status');
    if (!status) return;
    status.textContent = text;
    if (this.statusTimer) window.clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout(() => {
      status.textContent = '';
    }, 2600);
  }

  private injectStyles(): void {
    if (document.getElementById('contact-flow-styles')) return;
    const style = document.createElement('style');
    style.id = 'contact-flow-styles';
    style.textContent = `
      .contact-flow-card {
        margin-top: 16px;
        padding: 14px;
        border-radius: 12px;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018));
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .contact-flow-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 12px;
      }

      .contact-flow-eyebrow {
        color: var(--orange-yellow-crayola);
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
        text-transform: uppercase;
      }

      .contact-flow-header h2 {
        color: var(--white-2);
        font-size: 14px;
        line-height: 1.2;
      }

      .contact-flow-resume {
        flex: none;
        min-height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 7px 10px;
        border-radius: 8px;
        color: var(--orange-yellow-crayola);
        border: 1px solid rgba(255, 219, 112, 0.24);
        background: rgba(255, 219, 112, 0.06);
        font-size: 12px;
        font-weight: 700;
      }

      .contact-flow-reasons {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        margin-bottom: 10px;
      }

      .contact-flow-reason {
        min-height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 7px;
        border-radius: 8px;
        color: var(--light-gray);
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.035);
        font-size: 11px;
        line-height: 1.1;
        text-align: center;
      }

      .contact-flow-reason.active {
        color: var(--smoky-black);
        background: var(--orange-yellow-crayola);
        border-color: transparent;
        font-weight: 700;
      }

      .contact-flow-label {
        color: var(--light-gray-70);
        font-size: 10px;
        line-height: 1;
        text-transform: uppercase;
        margin-bottom: 6px;
      }

      .contact-flow-message {
        min-height: 78px;
        resize: vertical;
        padding: 10px;
        color: var(--white-2);
        background: rgba(0, 0, 0, 0.16);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        font-size: 12px;
        line-height: 1.45;
        outline: none;
      }

      .contact-flow-message:focus {
        border-color: rgba(255, 219, 112, 0.42);
        box-shadow: 0 0 0 3px rgba(255, 219, 112, 0.08);
      }

      .contact-flow-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 10px;
      }

      .contact-flow-action {
        min-height: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 8px 10px;
        border-radius: 9px;
        color: var(--white-2);
        background: rgba(255, 255, 255, 0.055);
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 12px;
        font-weight: 700;
        text-align: center;
      }

      .contact-flow-action:hover,
      .contact-flow-action:focus-visible {
        color: var(--orange-yellow-crayola);
        border-color: rgba(255, 219, 112, 0.3);
        background: rgba(255, 219, 112, 0.08);
      }

      .contact-flow-status {
        min-height: 16px;
        margin-top: 8px;
        color: var(--orange-yellow-crayola);
        font-size: 11px;
        line-height: 1.35;
      }

      @media (max-width: 360px) {
        .contact-flow-reasons,
        .contact-flow-actions {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 767px) {
        .contact-flow-card {
          margin-bottom: 92px;
        }
      }

      @media (min-width: 1024px) {
        .sidebar {
          max-height: calc(100dvh - 64px);
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 219, 112, 0.42) transparent;
        }

        .sidebar::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar::-webkit-scrollbar-thumb {
          background: rgba(255, 219, 112, 0.38);
          border-radius: 999px;
        }

        .contact-flow-card {
          margin-top: 12px;
          padding: 12px;
        }

        .contact-flow-message {
          min-height: 58px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
