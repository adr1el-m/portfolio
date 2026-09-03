/** Keep keyboard focus within the visible controls of an open dialog. */
export function trapDialogFocus(event: KeyboardEvent, dialog: HTMLElement): void {
  if (event.key !== 'Tab') return;

  const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
    'a[href], button, input, select, textarea, iframe, [tabindex]'
  )).filter((element) => (
    element.tabIndex >= 0 &&
    !element.matches(':disabled') &&
    !element.closest('[inert], [hidden]') &&
    element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden'
  ));
  const first = controls[0];
  const last = controls[controls.length - 1];
  const focused = document.activeElement;

  if (!first) {
    event.preventDefault();
    dialog.tabIndex = -1;
    dialog.focus({ preventScroll: true });
    return;
  }

  if (event.shiftKey && (focused === first || !controls.includes(focused as HTMLElement))) {
    event.preventDefault();
    last.focus({ preventScroll: true });
  } else if (!event.shiftKey && (focused === last || !controls.includes(focused as HTMLElement))) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
}

const scrollLocks = new Set<symbol>();
let previousOverflow = '';

/** Nested dialogs share a scroll lock and restore the page's original style. */
export function lockDialogScroll(): () => void {
  const lock = Symbol('dialog');
  if (scrollLocks.size === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks.add(lock);

  return () => {
    if (!scrollLocks.delete(lock)) return;
    if (scrollLocks.size === 0) document.body.style.overflow = previousOverflow;
  };
}
