/** Expected values taken straight from the assignment brief. */
export const EXPECTED = {
  totalDreams: 10,
  goodDreams: 6,
  badDreams: 4,
  recurringDreams: 2,
  recurringNames: ['Flying over mountains', 'Lost in maze'],
  validTypes: ['Good', 'Bad'] as const,
  columns: ['Dream Name', 'Days Ago', 'Dream Type'] as const,
  home: {
    title: /dream portal/i,
    dreamsBadge: '10 Dreams',
    daysBadge: '7 Days',
  },
  /** "~3 seconds" from the brief, with tolerance for network + polling jitter. */
  loader: { minMs: 2_000, maxMs: 6_000 },
} as const;

/** Well-known, unambiguous examples used to sanity-check the AI classifier itself. */
export const OBVIOUS_DREAMS: ReadonlyArray<{ name: string; label: 'Good' | 'Bad' }> = [
  { name: 'Monster chase', label: 'Bad' },
  { name: 'Falling from a cliff', label: 'Bad' },
  { name: 'Flying over mountains', label: 'Good' },
  { name: 'Relaxing on a sunny beach', label: 'Good' },
];
