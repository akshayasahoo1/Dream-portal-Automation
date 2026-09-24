import { test, expect } from '../../src/fixtures/test-fixtures';
import { EXPECTED } from '../../src/data/expected';
import { countByType } from '../../src/utils/dreamUtils';
import { DreamsDiaryPage } from '../../src/pages/DreamsDiaryPage';
import { logger } from '../../src/utils/logger';

test.describe('Summary page - dreams-total.html', () => {
  test.beforeEach(async ({ totalPage }) => {
    await totalPage.openAndWaitUntilReady();
  });

  test('shows Good 6, Bad 4, Total 10, Recurring 2', async ({ totalPage, page, capture }) => {
    // Wait for count-up animations to finish, then assert on the settled numbers
    const stats = await test.step('Wait for statistics to settle', () => totalPage.getStableStats());

    await test.step('Assert all four statistics', () => {
      expect.soft(stats.good, 'Good Dreams').toBe(EXPECTED.goodDreams);
      expect.soft(stats.bad, 'Bad Dreams').toBe(EXPECTED.badDreams);
      expect.soft(stats.total, 'Total Dreams').toBe(EXPECTED.totalDreams);
      expect.soft(stats.recurring, 'Recurring Dreams').toBe(EXPECTED.recurringDreams);
    });

    await capture(page, 'total-stats');
  });

  test('Good + Bad adds up to Total', async ({ totalPage }) => {
    const s = await totalPage.getStableStats();
    expect(s.good + s.bad).toBe(s.total);
  });

  test('"Flying over mountains" and "Lost in maze" are the recurring dreams (logic from dreams-diary.html)', async ({
    totalPage,
    context,
    capture,
  }) => {
    const diaryTab = await context.newPage();
    const diary = new DreamsDiaryPage(diaryTab);
    await diary.openAndWaitUntilReady();

    const { names, strategy } = await diary.getRecurringDreams();
    test.info().annotations.push({ type: 'recurring-strategy', description: strategy });
    logger.info(`Diary says recurring (${strategy}): ${names.join(', ')}`);

    await test.step('Diary identifies exactly the two expected recurring dreams', () => {
      expect(names.map((n) => n.toLowerCase()).sort()).toEqual(
        EXPECTED.recurringNames.map((n) => n.toLowerCase()).sort(),
      );
    });

    await test.step('Summary page counts the same number of recurring dreams', async () => {
      const stats = await totalPage.getStableStats();
      expect(stats.recurring).toBe(names.length);
    });

    await capture(diaryTab, 'diary-source-of-recurring-logic');
  });

  test('summary numbers match what is actually in the diary table', async ({ totalPage, context }) => {
    const diaryTab = await context.newPage();
    const diary = new DreamsDiaryPage(diaryTab);
    await diary.openAndWaitUntilReady();

    const entries = await diary.getEntries();
    const counts = countByType(entries);
    const { names } = await diary.getRecurringDreams();
    const stats = await totalPage.getStableStats();

    expect.soft(stats.good, 'Good Dreams (summary vs diary)').toBe(counts.good);
    expect.soft(stats.bad, 'Bad Dreams (summary vs diary)').toBe(counts.bad);
    expect.soft(stats.total, 'Total Dreams (summary vs diary)').toBe(entries.length);
    expect.soft(stats.recurring, 'Recurring Dreams (summary vs diary)').toBe(names.length);
  });
});
