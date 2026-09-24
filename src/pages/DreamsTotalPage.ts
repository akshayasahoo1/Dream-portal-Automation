import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { readStatNextToLabel } from './dom-helpers';
import { logger } from '../utils/logger';

export type StatLabel = 'Good Dreams' | 'Bad Dreams' | 'Total Dreams' | 'Recurring Dreams';

export interface DreamStats {
  good: number;
  bad: number;
  total: number;
  recurring: number;
}

/** dreams-total.html - summary statistics. */
export class DreamsTotalPage extends BasePage {
  protected readonly path = 'dreams-total.html';

  constructor(page: Page) {
    super(page);
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.page.getByText(/total dreams/i).first(), 'Summary should be rendered').toBeVisible();
  }

  async openAndWaitUntilReady(): Promise<void> {
    await this.open();
    await this.waitUntilReady();
  }

  /**
   * Current numeric value shown for a label. Throws if it cannot be found, so it is safe to
   * wrap in `expect.poll` (handles count-up animations).
   */
  async getStat(label: StatLabel): Promise<number> {
    const value = await this.page.evaluate(readStatNextToLabel, label);
    if (value === null) {
      const text = (await this.page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300);
      throw new Error(`Could not find a numeric value next to "${label}". Page text: "${text}"`);
    }
    return value;
  }

  getGoodDreams = () => this.getStat('Good Dreams');
  getBadDreams = () => this.getStat('Bad Dreams');
  getTotalDreams = () => this.getStat('Total Dreams');
  getRecurringDreams = () => this.getStat('Recurring Dreams');

  /**
   * Waits until all four numbers have stopped changing (count-up animations!) and returns them.
   * Asserting on a value that is merely *passing through* the expected number would give
   * false positives, so tests should always assert on these settled values.
   */
  async getStableStats(requiredIdenticalReads = 3): Promise<DreamStats> {
    let previous = '';
    let identical = 0;
    let stats!: DreamStats;
    await expect
      .poll(
        async () => {
          stats = {
            good: await this.getGoodDreams(),
            bad: await this.getBadDreams(),
            total: await this.getTotalDreams(),
            recurring: await this.getRecurringDreams(),
          };
          const snapshot = JSON.stringify(stats);
          identical = snapshot === previous ? identical + 1 : 0;
          previous = snapshot;
          return identical >= requiredIdenticalReads - 1;
        },
        { message: 'Statistics never settled', intervals: [300], timeout: 20_000 },
      )
      .toBe(true);
    logger.info(`Stable stats: ${JSON.stringify(stats)}`);
    return stats;
  }

  /** True if a dream name is listed on the summary page (optional detail some layouts show). */
  async isDreamNameListed(name: string): Promise<boolean> {
    return (await this.page.getByText(name, { exact: false }).count()) > 0;
  }
}
