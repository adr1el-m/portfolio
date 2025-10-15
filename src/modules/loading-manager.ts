/**
 * Loading Manager Module
 * Handles loading animations and screen transitions.
 */
export class LoadingManager {
  constructor() {
    console.log('LoadingManager initialized');
    this.init();
  }

  private init(): void {
    // Example: Hide preloader after a delay
    const preloader = document.querySelector<HTMLElement>("[data-preloader]");
    if (preloader) {
      window.addEventListener("load", () => {
        setTimeout(() => {
          preloader.classList.add("remove");
        }, 500);
      });
    }
  }
}
