import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import {
  findRecurringByMarker,
  findRecurringByName,
  type DreamEntry,
} from '../utils/dreamUtils';
import { logger } from '../utils/logger';

interface RawTable {
  headers: string[];
  rows: { cells: string[]; marked: boolean }[];
}

export type RecurringStrategy = 'row-marker' | 'duplicate-names';

/** dreams-diary.html - table of dream log entries. */
export class DreamsDiaryPage extends BasePage {
  protected readonly path = 'dreams-diary.html';

  readonly table: Locator;

  constructor(page: Page) {
    super(page);
    this.table = page.locator('table').first();
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.table, 'Dream table should be visible').toBeVisible();
    await expect
      .poll(() => this.page.locator('table td').count(), { message: 'Dream table has no data cells' })
      .toBeGreaterThan(0);
  }

  async openAndWaitUntilReady(): Promise<void> {
    await this.open();
    await this.waitUntilReady();
  }

  /** Header labels, or [] when the table has no <th> cells. */
  async getHeaders(): Promise<string[]> {
    return (await this.readTable()).headers;
  }

  async getRowCount(): Promise<number> {
    return (await this.readTable()).rows.length;
  }

  /** All dream entries in table order. */
  async getEntries(): Promise<DreamEntry[]> {
    const { headers, rows } = await this.readTable();

    const find = (re: RegExp, fallback: number) => {
      const i = headers.findIndex((h) => re.test(h));
      return i >= 0 ? i : fallback;
    };
    const nameIdx = find(/name/i, 0);
    const daysIdx = find(/day|ago/i, 1);
    const typeIdx = find(/type/i, 2);

    const entries = rows.map<DreamEntry>((r, index) => ({
      index,
      name: r.cells[nameIdx] ?? '',
      daysAgo: r.cells[daysIdx] ?? '',
      type: r.cells[typeIdx] ?? '',
      cells: r.cells,
      markedRecurring: r.marked,
    }));
    logger.info(`Diary entries read: ${entries.length}`);
    return entries;
  }

  /**
   * Dreams the diary treats as "recurring".
   * 1) If rows are explicitly flagged (class / data-attribute containing "recurring") use that.
   * 2) Otherwise a dream is recurring when the same name is logged more than once.
   */
  async getRecurringDreams(): Promise<{ names: string[]; strategy: RecurringStrategy }> {
    const entries = await this.getEntries();
    const marked = findRecurringByMarker(entries);
    if (marked.length > 0) {
      logger.info(`Recurring dreams (row markers): ${marked.join(', ')}`);
      return { names: marked, strategy: 'row-marker' };
    }
    const dupes = findRecurringByName(entries);
    logger.info(`Recurring dreams (duplicate names): ${dupes.join(', ') || '(none)'}`);
    return { names: dupes, strategy: 'duplicate-names' };
  }

  // ---------------------------------------------------------------------------

  private async readTable(): Promise<RawTable> {
    await this.waitUntilReady();
    return this.table.evaluate((tbl): RawTable => {
      const norm = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();
      const headers = Array.from(tbl.querySelectorAll('th')).map((th) => norm(th.textContent));

      let trs = Array.from(tbl.querySelectorAll('tbody tr'));
      if (trs.length === 0) trs = Array.from(tbl.querySelectorAll('tr'));
      const markerSel = '[class*="recurring" i], [data-recurring]:not([data-recurring="false"])';

      const rows = trs
        .filter((tr) => tr.querySelector('td'))
        .map((tr) => ({
          cells: Array.from(tr.querySelectorAll('td')).map((td) => norm(td.textContent)),
          marked: tr.matches(markerSel) || !!tr.querySelector(markerSel),
        }));
      return { headers, rows };
    });
  }
}

