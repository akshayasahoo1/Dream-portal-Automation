import { test, expect } from '../../src/fixtures/test-fixtures';
import { ENV } from '../../src/config/env';
import { OBVIOUS_DREAMS } from '../../src/data/expected';
import { createClassifier, mapWithConcurrency, type DreamLabel } from '../../src/ai';
import { normalizeType, nameKey } from '../../src/utils/dreamUtils';
import { logger } from '../../src/utils/logger';

test.describe('AI-based validation (bonus)', () => {
  test('classifier gives sensible labels for obvious dream names', async ({}, testInfo) => {
    const { classifier, skipReason, notice } = createClassifier();
    test.skip(!classifier, skipReason);
    if (notice) testInfo.annotations.push({ type: 'ai-notice', description: notice });
    testInfo.annotations.push({ type: 'ai-provider', description: classifier!.name });

    for (const { name, label } of OBVIOUS_DREAMS) {
      const got = await classifier!.classify(name);
      logger.info(`AI: "${name}" -> ${got} (expected ${label})`);
      expect.soft(got, `"${name}"`).toBe(label);
    }
  });

  test('AI label matches the Dream Type shown in the diary table', async ({ diaryPage, page, capture }, testInfo) => {
    const { classifier, skipReason, notice } = createClassifier();
    test.skip(!classifier, skipReason);
    const ai = classifier!;

    testInfo.annotations.push({ type: 'ai-provider', description: ai.name });
    if (notice) {
      logger.warn(notice);
      testInfo.annotations.push({ type: 'ai-notice', description: notice });
    }

    await diaryPage.openAndWaitUntilReady();
    const entries = await diaryPage.getEntries();
    expect(entries.length, 'Diary should contain dreams').toBeGreaterThan(0);
    await capture(page, 'diary-table-sent-to-ai');

    // Classify each distinct dream name once (recurring dreams appear twice)
    const uniqueNames = [...new Map(entries.map((e) => [nameKey(e.name), e.name])).values()];
    const labels = new Map<string, DreamLabel>();
    await test.step(`Classify ${uniqueNames.length} dream names with ${ai.name}`, async () => {
      const results = await mapWithConcurrency(uniqueNames, 4, async (n) => ({ n, label: await ai.classify(n) }));
      results.forEach(({ n, label }) => labels.set(nameKey(n), label));
    });

    const rows = entries.map((e) => {
      const table = normalizeType(e.type);
      const aiLabel = labels.get(nameKey(e.name))!;
      return { dream: e.name, table: table ?? `INVALID(${e.type})`, ai: aiLabel, match: table === aiLabel };
    });

    const mismatches = rows.filter((r) => !r.match);
    const accuracy = (rows.length - mismatches.length) / rows.length;

    // Report artefacts
    logger.info(`AI provider: ${ai.name}`);
    for (const r of rows) logger.info(`  ${r.match ? 'OK ' : 'BAD'} | ${r.dream.padEnd(32)} | table=${r.table} | ai=${r.ai}`);
    logger.info(`AI accuracy: ${(accuracy * 100).toFixed(0)}% (${rows.length - mismatches.length}/${rows.length})`);

    await testInfo.attach('ai-classification-report.json', {
      body: JSON.stringify({ provider: ai.name, realModel: ai.isRealModel, accuracy, rows }, null, 2),
      contentType: 'application/json',
    });
    testInfo.annotations.push({ type: 'ai-accuracy', description: `${(accuracy * 100).toFixed(0)}%` });

    // Assertions
    if (ENV.ai.strict) {
      expect(mismatches, 'AI_STRICT=true: every dream must match the table').toEqual([]);
    } else {
      expect(
        accuracy,
        `AI/table agreement below ${ENV.ai.minAccuracy * 100}%. Mismatches: ${JSON.stringify(mismatches)}`,
      ).toBeGreaterThanOrEqual(ENV.ai.minAccuracy);
    }
  });
});
