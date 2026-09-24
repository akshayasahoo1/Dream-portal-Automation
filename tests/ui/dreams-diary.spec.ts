import { test, expect } from '../../src/fixtures/test-fixtures';
import { EXPECTED } from '../../src/data/expected';
import { countByType, normalizeType } from '../../src/utils/dreamUtils';
import { logger } from '../../src/utils/logger';

test.describe('Dream log table - dreams-diary.html', () => {
  test.beforeEach(async ({ diaryPage }) => {
    await diaryPage.openAndWaitUntilReady();
  });

  test('has exactly 10 dream entries', async ({ diaryPage, page, capture }) => {
    const entries = await diaryPage.getEntries();
    logger.info(`Dream names: ${entries.map((e) => e.name).join(' | ')}`);
    expect(entries, 'Number of dream rows').toHaveLength(EXPECTED.totalDreams);
    await capture(page, 'diary-table');
  });

  test('dream types are only "Good" or "Bad"', async ({ diaryPage }) => {
    const entries = await diaryPage.getEntries();
    expect(entries.length, 'Table should not be empty').toBeGreaterThan(0);

    for (const e of entries) {
      expect.soft(normalizeType(e.type), `Row ${e.index + 1} "${e.name}" has invalid type "${e.type}"`).not.toBeNull();
    }
    const counts = countByType(entries);
    logger.info(`Types -> Good: ${counts.good}, Bad: ${counts.bad}, invalid: ${counts.invalid}`);
    expect(counts.invalid).toBe(0);
  });

  test('every row has Dream Name, Days Ago and Dream Type filled', async ({ diaryPage }) => {
    const entries = await diaryPage.getEntries();
    expect(entries.length).toBeGreaterThan(0);

    for (const e of entries) {
      const row = `Row ${e.index + 1}`;
      expect.soft(e.cells.length, `${row}: number of columns`).toBeGreaterThanOrEqual(EXPECTED.columns.length);
      expect.soft(e.name, `${row}: Dream Name is empty`).not.toBe('');
      expect.soft(e.daysAgo, `${row} ("${e.name}"): Days Ago is empty`).not.toBe('');
      expect.soft(e.type, `${row} ("${e.name}"): Dream Type is empty`).not.toBe('');
    }
  });

  test('table headers match Dream Name / Days Ago / Dream Type', async ({ diaryPage }) => {
    const headers = await diaryPage.getHeaders();
    test.skip(headers.length === 0, 'Table has no <th> header cells to verify');
    expect(headers.map((h) => h.toLowerCase())).toEqual(EXPECTED.columns.map((c) => c.toLowerCase()));
  });

  test('recurring dreams are "Flying over mountains" and "Lost in maze"', async ({ diaryPage }) => {
    const { names, strategy } = await diaryPage.getRecurringDreams();
    test.info().annotations.push({ type: 'recurring-strategy', description: strategy });

    expect(names, `Recurring dreams found via ${strategy}`).toHaveLength(EXPECTED.recurringDreams);
    expect(names.map((n) => n.toLowerCase()).sort()).toEqual(EXPECTED.recurringNames.map((n) => n.toLowerCase()).sort());
  });
});
