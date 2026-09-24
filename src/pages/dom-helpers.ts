/**
 * Functions in this file are serialised and executed INSIDE the browser
 * (page.evaluate / page.waitForFunction), so they must be fully self-contained:
 * no imports, no references to outer variables.
 */

export interface LoaderTiming {
  /** performance.now() when the loader was first painted (ms since navigation start) */
  shownAt: number | null;
  /** performance.now() when the loader was first observed gone */
  hiddenAt: number | null;
}

/**
 * Init script (runs before any page script). It
 *  - exposes window.__isLoaderShown(): true while a "Loading your dream portal..." element is painted
 *  - records exact first-shown / first-hidden timestamps on every animation frame, so the measured
 *    loader duration is not distorted by test-runner latency (screenshots, polling, ...).
 */
export function loaderProbe(): void {
  const w = window as unknown as {
    __isLoaderShown: () => boolean;
    __loaderTiming: { shownAt: number | null; hiddenAt: number | null };
  };

  const isShown = (): boolean => {
    const re = /loading your dream portal/i;
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter(
      (el) => el.children.length === 0 && re.test(el.textContent ?? ''),
    );
    if (candidates.length === 0) return false; // removed from DOM => gone

    const painted = (el: HTMLElement): boolean => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        const cs = getComputedStyle(node);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
      }
      return true;
    };
    return candidates.some(painted);
  };

  w.__isLoaderShown = isShown;
  w.__loaderTiming = { shownAt: null, hiddenAt: null };

  const tick = () => {
    const t = w.__loaderTiming;
    if (document.body) {
      const shown = isShown();
      if (shown && t.shownAt === null) t.shownAt = performance.now();
      if (!shown && t.shownAt !== null && t.hiddenAt === null) t.hiddenAt = performance.now();
    }
    if (t.hiddenAt === null) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Reads a numeric statistic that sits next to a label such as "Good Dreams".
 * Supports "Good Dreams: 6", "6 Good Dreams", and "<number> + <label>" in sibling elements/cards.
 */
export function readStatNextToLabel(label: string): number | null {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^(?:(\\d+)\\s*)?${esc}\\s*:?\\s*(\\d+)?$`, 'i');

  const all = Array.from(document.querySelectorAll<HTMLElement>('body *'));
  const matches = all.filter((el) => re.test(norm(el.textContent ?? '')));
  // keep the deepest matching elements only
  const deepest = matches.filter((el) => !Array.from(el.children).some((c) => matches.includes(c as HTMLElement)));

  for (const el of deepest) {
    const m = norm(el.textContent ?? '').match(re);
    const inline = m?.[1] ?? m?.[2];
    if (inline !== undefined) return parseInt(inline, 10);

    let anc: HTMLElement | null = el.parentElement;
    for (let depth = 0; anc && depth < 4; depth++, anc = anc.parentElement) {
      const nums = norm(anc.textContent ?? '').match(/\d+/g);
      if (!nums) continue;
      if (nums.length === 1) return parseInt(nums[0], 10);
      break; // ambiguous container (holds several stats) - stop climbing
    }
  }
  return null;
}
