import { expect, type Page } from '@playwright/test';
import { logger } from '../utils/logger';

/** Shared behaviour for every page object. */
export abstract class BasePage {
  /** Path relative to BASE_URL (no leading slash). */
  protected abstract readonly path: string;

  constructor(public readonly page: Page) {}

  /** Resolves once the page is usable (implemented per page). */
  abstract waitUntilReady(): Promise<void>;

  async open(): Promise<void> {
    logger.info(`Navigating to "${this.path}"`);
    const response = await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    expect(response, `No response when opening ${this.path}`).not.toBeNull();
    expect(response!.ok(), `HTTP ${response!.status()} when opening ${this.page.url()}`).toBeTruthy();
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  url(): string {
    return this.page.url();
  }

  /** File name of the current URL, e.g. "dreams-diary.html". */
  currentFileName(): string {
    return new URL(this.page.url()).pathname.split('/').filter(Boolean).pop() ?? '';
  }
}
