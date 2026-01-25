import { logger } from '@/config';

/**
 * Project Summaries Module
 * Shows compact project descriptions on hover
 * NO API calls - uses data-description with smart truncation
 */
export class AISummaries {
    private tooltip: HTMLElement | null = null;
    private hideTimeout: number | null = null;

    constructor() {
        this.init();
    }

    private init(): void {
        // Create tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'project-summary-tooltip';
        this.tooltip.setAttribute('role', 'tooltip');
        Object.assign(this.tooltip.style, {
            position: 'fixed',
            maxWidth: '280px',
            padding: '10px 14px',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #252525 100%)',
            border: '1px solid rgba(255, 219, 112, 0.3)',
            borderRadius: '10px',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
            color: '#e0e0e0',
            fontSize: '13px',
            lineHeight: '1.4',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateY(6px)',
            transition: 'opacity 150ms ease, transform 150ms ease',
            pointerEvents: 'none',
        });
        document.body.appendChild(this.tooltip);

        // Attach hover listeners to project cards
        this.attachListeners();

        logger.log('ProjectSummaries: initialized');
    }

    private attachListeners(): void {
        const projectCards = document.querySelectorAll<HTMLElement>('.project-item');

        projectCards.forEach(card => {
            card.addEventListener('mouseenter', (e) => this.handleHover(e, card));
            card.addEventListener('mouseleave', () => this.hideTooltip());
            card.addEventListener('mousemove', (e) => this.positionTooltip(e));
        });
    }

    private handleHover(e: MouseEvent, card: HTMLElement): void {
        const description = card.getAttribute('data-description') || '';
        const technologies = card.getAttribute('data-technologies') || '';

        // Clear any pending hide
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        // Only show tooltip if there's a meaningful description
        // Skip if description is empty or just tech docs
        if (!description || description.length < 20) return;

        // Extract just the first sentence or first 100 chars (whichever is shorter)
        let summary = this.extractSummary(description);

        // If summary is still empty after extraction, skip
        if (!summary) return;

        // Add compact tech badge (just top 3 tech)
        if (technologies) {
            const topTech = this.getTopTechnologies(technologies, 3);
            if (topTech) {
                summary += `<br><span style="color:#ffdb70;font-size:11px;opacity:0.9">🛠️ ${topTech}</span>`;
            }
        }

        this.showTooltip(summary, e);
    }

    // Extract first sentence or meaningful snippet
    private extractSummary(description: string): string {
        // Remove markdown headers and formatting
        let clean = description
            .replace(/^#+\s*.*/gm, '')  // Remove markdown headers
            .replace(/\*\*/g, '')       // Remove bold markers
            .replace(/\n+/g, ' ')       // Replace newlines with spaces
            .replace(/\s+/g, ' ')       // Normalize whitespace
            .trim();

        // Skip if it looks like a tech doc (starts with Framework:, Technology, etc.)
        if (/^(Framework|Technology|Package|Styling|Database|Authentication):/i.test(clean)) {
            return '';
        }

        // Get first sentence (ending with . ! or ?)
        const sentenceMatch = clean.match(/^[^.!?]+[.!?]/);
        if (sentenceMatch && sentenceMatch[0].length <= 120) {
            return sentenceMatch[0].trim();
        }

        // Otherwise, truncate at ~100 chars at word boundary
        if (clean.length > 100) {
            const truncated = clean.slice(0, 100).replace(/\s+\S*$/, '');
            return truncated + '...';
        }

        return clean;
    }

    // Get top N technologies from tech string
    private getTopTechnologies(technologies: string, count: number): string {
        // Split by comma or semicolon
        const techs = technologies.split(/[,;]/)
            .map(t => t.trim())
            .filter(t => t && t.length < 30 && !t.includes(':'))  // Skip long entries and key:value pairs
            .slice(0, count);

        return techs.join(' • ');
    }

    private showTooltip(content: string, e: MouseEvent): void {
        if (!this.tooltip) return;

        this.tooltip.innerHTML = content;
        this.positionTooltip(e);

        // Show with animation
        requestAnimationFrame(() => {
            if (this.tooltip) {
                this.tooltip.style.opacity = '1';
                this.tooltip.style.transform = 'translateY(0)';
            }
        });
    }

    private positionTooltip(e: MouseEvent): void {
        if (!this.tooltip) return;

        const padding = 12;
        let x = e.clientX + padding;
        let y = e.clientY + padding;

        // Get tooltip dimensions
        const rect = this.tooltip.getBoundingClientRect();

        // Adjust for viewport edges
        if (x + rect.width > window.innerWidth - padding) {
            x = e.clientX - rect.width - padding;
        }
        if (y + rect.height > window.innerHeight - padding) {
            y = e.clientY - rect.height - padding;
        }

        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
    }

    private hideTooltip(): void {
        if (this.hideTimeout) clearTimeout(this.hideTimeout);

        this.hideTimeout = window.setTimeout(() => {
            if (this.tooltip) {
                this.tooltip.style.opacity = '0';
                this.tooltip.style.transform = 'translateY(6px)';
            }
        }, 80);
    }

    public destroy(): void {
        this.tooltip?.remove();
        this.tooltip = null;
    }
}
