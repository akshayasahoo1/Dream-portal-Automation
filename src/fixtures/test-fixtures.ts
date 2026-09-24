import fs from 'node:fs';
import path from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { DreamsDiaryPage } from '../pages/DreamsDiaryPage';
import { DreamsTotalPage } from '../pages/DreamsTotalPage';
import { logger } from '../utils/logger';
import { slug } from '../utils/dreamUtils';

type Capture = (page: Page, label: string) => Promise<string>;

interface Fixtures {
  homePage: HomePage;
  diaryPage: DreamsDiaryPage;
  totalPage: DreamsTotalPage;
  /** Saves a full-page screenshot to ./screenshots and attaches it to the report. */
  capture: Capture;
  /** Auto fixture: START/END log lines for every test. */
  testLifecycle: void;
}

export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => use(new HomePage(page)),
  diaryPage: async ({ page }, use) => use(new DreamsDiaryPage(page)),
  totalPage: async ({ page }, use) => use(new DreamsTotalPage(page)),

  capture: async ({}, use, testInfo) => {
    let counter = 0;
    const dir = path.resolve('screenshots', testInfo.project.name, slug(testInfo.title));
    fs.rmSync(dir, { recursive: true, force: true });

    await use(async (page, label) => {
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${String(++counter).padStart(2, '0')}-${slug(label)}.png`);
      await page.screenshot({ path: file, fullPage: true });
      await testInfo.attach(label, { path: file, contentType: 'image/png' });
      logger.info(`Screenshot saved: ${path.relative(process.cwd(), file)}`);
      return file;
    });
  },

  testLifecycle: [
    async ({}, use, testInfo) => {
      logger.step(`START  ${testInfo.titlePath.slice(1).join(' > ')} [${testInfo.project.name}]`);
      await use();
      logger.step(`END    ${testInfo.title} -> ${testInfo.status?.toUpperCase()} (${testInfo.duration}ms)`);
    },
    { auto: true },
  ],
});

export { expect };
