import { test, expect } from '@playwright/test';
import {
  countByType,
  findRecurringByMarker,
  findRecurringByName,
  normalizeType,
  slug,
  type DreamEntry,
} from '../../src/utils/dreamUtils';

const entry = (name: string, type: string, marked = false, index = 0): DreamEntry => ({
  index,
  name,
  daysAgo: '1',
  type,
  cells: [name, '1', type],
  markedRecurring: marked,
});

test.describe('dreamUtils', () => {
  test('normalizeType accepts decorated Good/Bad and rejects everything else', () => {
    expect(normalizeType('Good')).toBe('Good');
    expect(normalizeType(' bad ')).toBe('Bad');
    expect(normalizeType('😊 Good')).toBe('Good');
    expect(normalizeType('Neutral')).toBeNull();
    expect(normalizeType('')).toBeNull();
  });

  test('countByType tallies good / bad / invalid', () => {
    const c = countByType([entry('a', 'Good'), entry('b', 'Bad'), entry('c', 'Good'), entry('d', 'Meh')]);
    expect(c).toEqual({ good: 2, bad: 1, invalid: 1 });
  });

  test('findRecurringByName is case/whitespace-insensitive and keeps first-seen casing', () => {
    const r = findRecurringByName([
      entry('Flying over mountains', 'Good'),
      entry('Lost in maze', 'Bad'),
      entry('flying  over   MOUNTAINS', 'Good'),
      entry('Lost in maze', 'Bad'),
      entry('Beach party', 'Good'),
    ]);
    expect(r).toEqual(['Flying over mountains', 'Lost in maze']);
  });

  test('findRecurringByMarker uses only rows flagged in markup', () => {
    const r = findRecurringByMarker([entry('A', 'Good', true), entry('B', 'Bad'), entry('A', 'Good', true)]);
    expect(r).toEqual(['A']);
  });

  test('slug is filesystem-safe', () => {
    expect(slug('Clicking "My Dreams" opens tabs!')).toBe('clicking-my-dreams-opens-tabs');
  });
});
