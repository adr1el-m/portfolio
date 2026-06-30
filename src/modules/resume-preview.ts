const RESUME_SELECTOR = 'a[data-resume-preview], a[href="/files/resume.pdf"], a[href$="/files/resume.pdf"]';
const RESUME_URL = '/files/resume.pdf';

type ResumePreviewEvent = CustomEvent<{ url?: string }>;

export class ResumePreview {
  private dialog: HTMLElement | null = null;
  private frame: HTMLIFrameElement | null = null;
  private previousFocus: HTMLElement | null = null;
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') this.close();
  };

  constructor() {
    this.bindLinks();
    window.addEventListener('portfolio:open-resume-preview', ((event: ResumePreviewEvent) => {
      this.open(event.detail?.url || RESUME_URL);
    }) as EventListener);
  }

  private bindLinks(): void {
    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = (event.target as Element | null)?.closest<HTMLAnchorElement>(RESUME_SELECTOR);
      if (!target) return;

      event.preventDefault();
      this.open(target.href || RESUME_URL);
    });
  }

  private ensureDialog(): HTMLElement {
    if (this.dialog) return this.dialog;

    const dialog = document.createElement('div');
    dialog.className = 'resume-preview-modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'resume-preview-title');
    dialog.setAttribute('aria-hidden', 'true');
    dialog.innerHTML = `
      <div class="resume-preview-backdrop" data-resume-preview-close></div>
      <section class="resume-preview-panel">
        <header class="resume-preview-header">
          <div>
            <p class="resume-preview-eyebrow">PDF</p>
            <h2 id="resume-preview-title">Resume Preview</h2>
          </div>
          <div class="resume-preview-actions">
            <a class="resume-preview-action" href="${RESUME_URL}" target="_blank" rel="noopener noreferrer" aria-label="Open resume PDF in a new tab">
              Open
            </a>
            <a class="resume-preview-action" href="${RESUME_URL}" download aria-label="Download resume PDF">
              Download
            </a>
            <button class="resume-preview-action" type="button" data-resume-preview-close aria-label="Close resume preview">
              Close
            </button>
          </div>
        </header>
        <div class="resume-preview-frame-wrap">
          <iframe class="resume-preview-frame" title="Resume PDF preview" loading="lazy"></iframe>
        </div>
      </section>
    `;

    dialog.addEventListener('click', (event) => {
      if ((event.target as Element | null)?.closest('[data-resume-preview-close]')) this.close();
    });

    document.body.appendChild(dialog);
    this.dialog = dialog;
    this.frame = dialog.querySelector<HTMLIFrameElement>('.resume-preview-frame');
    return dialog;
  }

  private open(url: string): void {
    const dialog = this.ensureDialog();
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const normalizedUrl = this.normalizeUrl(url);
    if (this.frame?.src !== normalizedUrl) {
      this.frame?.setAttribute('src', normalizedUrl);
    }

    dialog.classList.add('active');
    dialog.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('resume-preview-open');
    document.addEventListener('keydown', this.onKeyDown);
    dialog.querySelector<HTMLElement>('button[data-resume-preview-close]')?.focus({ preventScroll: true });
  }

  private close(): void {
    if (!this.dialog?.classList.contains('active')) return;

    this.dialog.classList.remove('active');
    this.dialog.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('resume-preview-open');
    document.removeEventListener('keydown', this.onKeyDown);
    this.previousFocus?.focus({ preventScroll: true });
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin === window.location.origin) {
        return `${parsed.pathname}#toolbar=1&navpanes=0`;
      }
    } catch {
      return `${RESUME_URL}#toolbar=1&navpanes=0`;
    }

    return `${RESUME_URL}#toolbar=1&navpanes=0`;
  }
}
