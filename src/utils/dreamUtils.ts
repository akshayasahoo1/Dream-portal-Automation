export type DreamType = 'Good' | 'Bad';

export interface DreamEntry {
  /** Zero-based position in the table */
  index: number;
  name: string;
  daysAgo: string;
  /** Raw text of the type cell */
  type: string;
  /** Every <td> text in the row, trimmed */
  cells: string[];
  /** True if the row itself carries a "recurring" class / data attribute */
  markedRecurring: boolean;
}

export const normalizeText = (s: string): string => s.replace(/\s+/g, ' ').trim();
export const nameKey = (s: string): string => normalizeText(s).toLowerCase();

/**
 * Turns a raw type cell ("Good", " bad ", "😊 Good") into "Good" | "Bad".
 * Returns null when the cell is anything else, which lets tests flag invalid values.
 */
export function normalizeType(raw: string): DreamType | null {
  const letters = raw.replace(/[^A-Za-z]/g, '').toLowerCase();
  if (letters === 'good') return 'Good';
  if (letters === 'bad') return 'Bad';
  return null;
}

export function countByType(entries: readonly DreamEntry[]): { good: number; bad: number; invalid: number } {
  let good = 0;
  let bad = 0;
  let invalid = 0;
  for (const e of entries) {
    const t = normalizeType(e.type);
    if (t === 'Good') good++;
    else if (t === 'Bad') bad++;
    else invalid++;
  }
  return { good, bad, invalid };
}

/** Dream names (first-seen casing) that appear more than once in the diary. */
export function findRecurringByName(entries: readonly DreamEntry[]): string[] {
  const seen = new Map<string, { display: string; count: number }>();
  for (const e of entries) {
    const key = nameKey(e.name);
    if (!key) continue;
    const cur = seen.get(key);
    if (cur) cur.count++;
    else seen.set(key, { display: normalizeText(e.name), count: 1 });
  }
  return [...seen.values()].filter((v) => v.count > 1).map((v) => v.display);
}

/** Dream names explicitly flagged as recurring by the page markup (class / data-attribute). */
export function findRecurringByMarker(entries: readonly DreamEntry[]): string[] {
  const names = new Map<string, string>();
  for (const e of entries) {
    if (e.markedRecurring) names.set(nameKey(e.name), normalizeText(e.name));
  }
  return [...names.values()];
}

export const sortedCaseInsensitive = (xs: readonly string[]): string[] =>
  [...xs].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

export const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'unnamed';
