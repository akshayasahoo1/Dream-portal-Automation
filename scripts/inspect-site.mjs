/**
 * Dumps the rendered HTML + visible text of the three pages into ./debug so you can
 * check / adjust locators quickly:   npm run inspect
 */
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { chromium } from '@playwright/test';

const base = (process.env.BASE_URL || 'https://arjitnigam.github.io/myDreams/').replace(/\/?$/, '/');
const pages = ['index.html', 'dreams-diary.html', 'dreams-total.html'];
fs.mkdirSync('debug', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [],
});
const page = await browser.newPage();
for (const p of pages) {
  await page.goto(base + p, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(p === 'index.html' ? 4500 : 2500); // let loader / counters finish
  const name = p.replace('.html', '');
  fs.writeFileSync(path.join('debug', `${name}.html`), await page.content());
  fs.writeFileSync(path.join('debug', `${name}.txt`), await page.locator('body').innerText());
  await page.screenshot({ path: path.join('debug', `${name}.png`), fullPage: true });
  console.log(`saved debug/${name}.{html,txt,png}`);
}
await browser.close();
