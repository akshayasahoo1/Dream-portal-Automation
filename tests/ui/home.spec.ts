import { test, expect } from '../../src/fixtures/test-fixtures';
import { EXPECTED } from '../../src/data/expected';
import { logger } from '../../src/utils/logger';
import { DreamsDiaryPage } from '../../src/pages/DreamsDiaryPage';
import { DreamsTotalPage } from '../../src/pages/DreamsTotalPage';

test.describe('Home page - index.html', () => {
  test('loading animation appears, then disappears after ~3 seconds', async ({ homePage, page, capture }) => {
    await test.step('Open the portal', () => homePage.open());

    await test.step('Loading animation is displayed', async () => {
      await homePage.waitForLoaderToAppear();
      await capture(page, 'loader-visible');
    });

    await test.step('Loading animation disappears', () => homePage.waitForLoaderToDisappear());

    const { visibleFor, hiddenAt } = await homePage.getLoaderTiming();
    logger.info(`Loader stayed visible for ${visibleFor.toFixed(0)}ms (gone ${hiddenAt.toFixed(0)}ms after navigation start)`);
    test.info().annotations.push({ type: 'loader-visible-ms', description: visibleFor.toFixed(0) });

    await test.step(`Loader lasted ~3s (${EXPECTED.loader.minMs}-${EXPECTED.loader.maxMs} ms window)`, () => {
      expect(visibleFor, 'Loader vanished too early').toBeGreaterThanOrEqual(EXPECTED.loader.minMs);
      expect(visibleFor, 'Loader lasted too long').toBeLessThanOrEqual(EXPECTED.loader.maxMs);
    });

    await capture(page, 'loader-gone');
  });

  test('main content and "My Dreams" button become visible after loading', async ({ homePage, page, capture }) => {
    await homePage.open();
    await homePage.waitForLoaderToDisappear();

    await test.step('Main content is visible', async () => {
      await expect(homePage.heading).toBeVisible();
      await expect(homePage.tagline).toBeVisible();
      await expect(page).toHaveTitle(EXPECTED.home.title);
    });

    await test.step('Summary badges are visible', async () => {
      await expect(homePage.badge(EXPECTED.home.dreamsBadge)).toBeVisible();
      await expect(homePage.badge(EXPECTED.home.daysBadge)).toBeVisible();
    });

    await test.step('"My Dreams" button is visible and enabled', async () => {
      await expect(homePage.myDreamsButton).toBeVisible();
      await expect(homePage.myDreamsButton).toBeEnabled();
    });

    await capture(page, 'home-loaded');
  });

  test('clicking "My Dreams" opens dreams-diary.html and dreams-total.html in new tabs', async ({
    homePage,
    page,
    capture,
  }) => {
    await homePage.openAndWaitUntilLoaded();

    const tabs = await test.step('Click "My Dreams"', () => homePage.clickMyDreamsAndCollectNewTabs(2));

    await test.step('Exactly the diary and total pages were opened', async () => {
      expect(tabs).toHaveLength(2);
      await expect
        .poll(() => tabs.map((t) => new URL(t.url()).pathname.split('/').pop()).sort())
        .toEqual(['dreams-diary.html', 'dreams-total.html']);
    });

    await test.step('Both new tabs actually render their content', async () => {
      const diaryTab = tabs.find((t) => t.url().endsWith('dreams-diary.html'))!;
      const totalTab = tabs.find((t) => t.url().endsWith('dreams-total.html'))!;
      await new DreamsDiaryPage(diaryTab).waitUntilReady();
      await new DreamsTotalPage(totalTab).waitUntilReady();
      await capture(diaryTab, 'new-tab-dreams-diary');
      await capture(totalTab, 'new-tab-dreams-total');
    });

    await test.step('Original tab stays on the home page', async () => {
      expect(new URL(page.url()).pathname).toMatch(/index\.html$|\/$/);
    });
  });
});
