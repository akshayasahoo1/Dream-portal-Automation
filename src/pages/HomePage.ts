import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { loaderProbe, type LoaderTiming } from './dom-helpers';
import { logger } from '../utils/logger';

/** index.html - Dream Portal home (loading animation + "My Dreams" button). */
export class HomePage extends BasePage {
  protected readonly path = 'index.html';

  readonly heading: Locator;
  readonly tagline: Locator;
  readonly myDreamsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: /dream portal/i }).first();
    this.tagline = page.getByText(/explore your dream journey/i).first();
    // Works whether the control is a <button>, <a> or role=button
    this.myDreamsButton = page
      .locator('button, a, [role="button"]')
      .filter({ hasText: /^\s*My Dreams\s*$/i })
      .first();
  }

  badge(text: string): Locator {
    return this.page.getByText(text, { exact: true }).first();
  }

  // ---- Loading animation ---------------------------------------------------

  /** Installs the in-browser loader probe, then navigates. */
  override async open(): Promise<void> {
    await this.page.addInitScript(loaderProbe);
    await super.open();
  }

  async isLoaderShown(): Promise<boolean> {
    return this.page.evaluate(() => {
      const probe = (window as unknown as { __isLoaderShown?: () => boolean }).__isLoaderShown;
      return probe ? probe() : false;
    });
  }

  /**
   * Exact loader lifetime measured inside the browser (ms). Call after the loader has gone.
   * `visibleFor` = time the loader stayed on screen; `hiddenAt` = ms since navigation start.
   */
  async getLoaderTiming(): Promise<{ visibleFor: number; shownAt: number; hiddenAt: number }> {
    let timing!: LoaderTiming;
    await expect
      .poll(
        async () => {
          timing = await this.page.evaluate(
            () => (window as unknown as { __loaderTiming: LoaderTiming }).__loaderTiming,
          );
          return timing.shownAt !== null && timing.hiddenAt !== null;
        },
        { message: 'Loader timing was not recorded (loader never shown/hidden?)', timeout: 10_000 },
      )
      .toBe(true);
    const shownAt = timing.shownAt!;
    const hiddenAt = timing.hiddenAt!;
    logger.info(`Loader timing: shown at ${shownAt.toFixed(0)}ms, hidden at ${hiddenAt.toFixed(0)}ms`);
    return { visibleFor: hiddenAt - shownAt, shownAt, hiddenAt };
  }

  async waitForLoaderToAppear(timeoutMs = 5_000): Promise<void> {
    logger.info('Waiting for loading animation to appear');
    await expect
      .poll(() => this.isLoaderShown(), {
        message: 'Loading animation never became visible',
        timeout: timeoutMs,
        intervals: [50, 50, 100],
      })
      .toBe(true);
  }

  async waitForLoaderToDisappear(timeoutMs = 15_000): Promise<void> {
    logger.info('Waiting for loading animation to disappear');
    await expect
      .poll(() => this.isLoaderShown(), {
        message: 'Loading animation never disappeared',
        timeout: timeoutMs,
        intervals: [100],
      })
      .toBe(false);
  }

  /** Opens the page and blocks until the loader has gone and content is visible. */
  async openAndWaitUntilLoaded(): Promise<void> {
    await this.open();
    await this.waitUntilReady();
  }

  async waitUntilReady(): Promise<void> {
    await this.waitForLoaderToDisappear();
    await expect(this.myDreamsButton).toBeVisible();
  }

  // ---- Navigation ------------------------------------------------------------

  /**
   * Clicks "My Dreams" and returns every new tab/window the click produced.
   * Waits until `expectedCount` tabs exist (default 2: diary + total).
   */
  async clickMyDreamsAndCollectNewTabs(expectedCount = 2): Promise<Page[]> {
    const context = this.page.context();
    const opened: Page[] = [];
    const onPage = (p: Page) => opened.push(p);
    context.on('page', onPage);
    try {
      logger.info('Clicking "My Dreams"');
      await this.myDreamsButton.click();
      await expect
        .poll(() => opened.length, {
          message: `Expected ${expectedCount} new tab(s) after clicking "My Dreams"`,
          timeout: 10_000,
        })
        .toBeGreaterThanOrEqual(expectedCount);
    } finally {
      context.off('page', onPage);
    }
    await Promise.all(opened.map((p) => p.waitForLoadState('domcontentloaded')));
    logger.info(`New tabs: ${opened.map((p) => p.url()).join(' | ')}`);
    return opened;
  }
}
