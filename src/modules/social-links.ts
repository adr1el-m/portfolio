/**
 * Social Links Manager Module
 * Handles the copy-to-clipboard functionality for social links.
 */
export class SocialLinksManager {
  constructor() {
    this.initializeCopyButtons();
    console.log('SocialLinksManager initialized');
  }

  private initializeCopyButtons(): void {
    const copyButtons = document.querySelectorAll('.copy-link-btn');
    
    copyButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const url = button.getAttribute('data-copy');
        if (url) {
          this.copyToClipboard(url);
        }
      });
    });
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccessMessage('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      this.fallbackCopyToClipboard(text);
    }
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showSuccessMessage('Link copied to clipboard!');
    } catch (err) {
      console.error('Fallback copy failed:', err);
      this.showSuccessMessage('Failed to copy link');
    }
    
    document.body.removeChild(textArea);
  }

  private showSuccessMessage(message: string): void {
    // Remove any existing success message
    const existingMessage = document.querySelector('.copy-success');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create new success message
    const successDiv = document.createElement('div');
    successDiv.className = 'copy-success';
    successDiv.innerHTML = `
      <ion-icon name="checkmark-circle"></ion-icon>
      <span>${message}</span>
    `;
    
    document.body.appendChild(successDiv);
    
    // Remove after animation completes
    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }
}
