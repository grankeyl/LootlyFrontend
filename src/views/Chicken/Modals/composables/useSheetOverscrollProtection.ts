export function useSheetOverscrollProtection(selector = ".sheet") {
  let sheetEl: HTMLElement | null = null;
  let onTouchStart: ((e: TouchEvent) => void) | null = null;
  let onTouchMove: ((e: TouchEvent) => void) | null = null;

  function mount() {
    sheetEl = document.querySelector(selector) as HTMLElement | null;
    if (!sheetEl) return;

    const nudge = () => {
      const max = sheetEl!.scrollHeight - sheetEl!.clientHeight;
      if (sheetEl!.scrollTop <= 0) sheetEl!.scrollTop = 1;
      else if (sheetEl!.scrollTop >= max) sheetEl!.scrollTop = Math.max(0, max - 1);
    };

    onTouchStart = () => nudge();
    onTouchMove = (e: TouchEvent) => {
      const max = sheetEl!.scrollHeight - sheetEl!.clientHeight;
      const atTop = sheetEl!.scrollTop <= 0;
      const atBottom = sheetEl!.scrollTop >= max;

      if (atTop || atBottom) {
        nudge();
        e.preventDefault();
      }
    };

    nudge();
    sheetEl.addEventListener("touchstart", onTouchStart, { passive: true });
    sheetEl.addEventListener("touchmove", onTouchMove, { passive: false });
  }

  function unmount() {
    if (sheetEl && onTouchStart) sheetEl.removeEventListener("touchstart", onTouchStart);
    if (sheetEl && onTouchMove) sheetEl.removeEventListener("touchmove", onTouchMove);

    sheetEl = null;
    onTouchStart = null;
    onTouchMove = null;
  }

  return { mount, unmount };
}