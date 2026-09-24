import { test, expect } from '@playwright/test';
import { DreamsDiaryPage } from '../../src/pages/DreamsDiaryPage';
import { DreamsTotalPage } from '../../src/pages/DreamsTotalPage';

/**
 * The page objects must survive reasonable differences in markup (cards, tables, inline text,
 * number-before-label ...). These tests feed them synthetic layouts via page.setContent - no network.
 */

const stat = (good = 6, bad = 4, total = 10, rec = 2) => ({ good, bad, total, rec });

const TOTAL_LAYOUTS: Record<string, string> = {
  'inline "Label: n" paragraphs': `
    <p>Good Dreams: 6</p><p>Bad Dreams: 4</p><p>Total Dreams: 10</p><p>Recurring Dreams: 2</p>`,
  'cards with heading + number': `
    <div class="card"><h3>Good Dreams</h3><span>6</span></div>
    <div class="card"><h3>Bad Dreams</h3><span>4</span></div>
    <div class="card"><h3>Total Dreams</h3><span>10</span></div>
    <div class="card"><h3>Recurring Dreams</h3><span>2</span></div>`,
  'number BEFORE label': `
    <div class="s"><span class="n">6</span><span>Good Dreams</span></div>
    <div class="s"><span class="n">4</span><span>Bad Dreams</span></div>
    <div class="s"><span class="n">10</span><span>Total Dreams</span></div>
    <div class="s"><span class="n">2</span><span>Recurring Dreams</span></div>`,
  'table rows': `
    <table><tr><td>Good Dreams</td><td>6</td></tr><tr><td>Bad Dreams</td><td>4</td></tr>
    <tr><td>Total Dreams</td><td>10</td></tr><tr><td>Recurring Dreams</td><td>2</td></tr></table>`,
  'list items with bold value': `
    <ul><li>Good Dreams <b>6</b></li><li>Bad Dreams <b>4</b></li><li>Total Dreams <b>10</b></li><li>Recurring Dreams <b>2</b></li></ul>`,
  'emoji icons + CSS uppercase': `
    <style>.l{text-transform:uppercase}</style>
    <div>🌟 <span class="l">Good Dreams</span> <strong>6</strong></div>
    <div>😱 <span class="l">Bad Dreams</span> <strong>4</strong></div>
    <div>📚 <span class="l">Total Dreams</span> <strong>10</strong></div>
    <div>🔁 <span class="l">Recurring Dreams</span> <strong>2</strong></div>`,
  'deeply nested card': `
    <section><div class="c"><div class="in"><div class="v"><span>6</span></div><small>Good Dreams</small></div></div></section>
    <section><div class="c"><div class="in"><div class="v"><span>4</span></div><small>Bad Dreams</small></div></div></section>
    <section><div class="c"><div class="in"><div class="v"><span>10</span></div><small>Total Dreams</small></div></div></section>
    <section><div class="c"><div class="in"><div class="v"><span>2</span></div><small>Recurring Dreams</small></div></div></section>`,
};

test.describe('DreamsTotalPage stat reader', () => {
  for (const [name, html] of Object.entries(TOTAL_LAYOUTS)) {
    test(`reads all four stats from: ${name}`, async ({ page }) => {
      await page.setContent(`<body><h1>Statistics</h1>${html}</body>`);
      const total = new DreamsTotalPage(page);
      const s = stat();
      expect(await total.getGoodDreams()).toBe(s.good);
      expect(await total.getBadDreams()).toBe(s.bad);
      expect(await total.getTotalDreams()).toBe(s.total);
      expect(await total.getRecurringDreams()).toBe(s.rec);
    });
  }

  test('throws a descriptive error when the label is missing', async ({ page }) => {
    await page.setContent('<body><p>Nothing to see</p></body>');
    await expect(new DreamsTotalPage(page).getGoodDreams()).rejects.toThrow(/Could not find a numeric value next to "Good Dreams"/);
  });
});

const ROWS = `
  <tr%R1%><td>Flying over mountains</td><td>2</td><td>Good</td></tr>
  <tr><td>Lost in maze</td><td>3</td><td>Bad</td></tr>
  <tr%R1%><td>Flying over mountains</td><td>8</td><td>Good</td></tr>
  <tr><td>Lost in maze</td><td>12</td><td>Bad</td></tr>
  <tr><td>Beach party</td><td>6</td><td>Good</td></tr>`;

const DIARY_LAYOUTS: Record<string, string> = {
  'thead + tbody': `<table><thead><tr><th>Dream Name</th><th>Days Ago</th><th>Dream Type</th></tr></thead><tbody>${ROWS.replaceAll('%R1%', '')}</tbody></table>`,
  'no thead/tbody, header row of <th>': `<table><tr><th>Dream Name</th><th>Days Ago</th><th>Dream Type</th></tr>${ROWS.replaceAll('%R1%', '')}</table>`,
  'columns in a different order (header-driven)': `<table><thead><tr><th>Dream Type</th><th>Dream Name</th><th>Days Ago</th></tr></thead><tbody>
      <tr><td>Good</td><td>Flying over mountains</td><td>2</td></tr><tr><td>Bad</td><td>Lost in maze</td><td>3</td></tr>
      <tr><td>Good</td><td>Flying over mountains</td><td>8</td></tr><tr><td>Bad</td><td>Lost in maze</td><td>12</td></tr>
      <tr><td>Good</td><td>Beach party</td><td>6</td></tr></tbody></table>`,
};

test.describe('DreamsDiaryPage table reader', () => {
  for (const [name, html] of Object.entries(DIARY_LAYOUTS)) {
    test(`parses entries + recurring dreams: ${name}`, async ({ page }) => {
      await page.setContent(`<body>${html}</body>`);
      const diary = new DreamsDiaryPage(page);
      const entries = await diary.getEntries();

      expect(entries).toHaveLength(5);
      expect(entries[0]).toMatchObject({ name: 'Flying over mountains', daysAgo: '2', type: 'Good' });
      expect(entries[1]).toMatchObject({ name: 'Lost in maze', daysAgo: '3', type: 'Bad' });

      const { names, strategy } = await diary.getRecurringDreams();
      expect(strategy).toBe('duplicate-names');
      expect(names.sort()).toEqual(['Flying over mountains', 'Lost in maze']);
    });
  }

  test('prefers explicit "recurring" row markers when the page provides them', async ({ page }) => {
    await page.setContent(`<body><table><tbody>
      <tr class="dream recurring"><td>Flying over mountains</td><td>2</td><td>Good</td></tr>
      <tr data-recurring="true"><td>Lost in maze</td><td>3</td><td>Bad</td></tr>
      <tr data-recurring="false"><td>Beach party</td><td>6</td><td>Good</td></tr>
    </tbody></table></body>`);
    const { names, strategy } = await new DreamsDiaryPage(page).getRecurringDreams();
    expect(strategy).toBe('row-marker');
    expect(names.sort()).toEqual(['Flying over mountains', 'Lost in maze']);
  });

  test('a row with an empty cell is reported as empty (not silently skipped)', async ({ page }) => {
    await page.setContent(`<body><table><tbody><tr><td>Odd dream</td><td></td><td>Bad</td></tr></tbody></table></body>`);
    const [e] = await new DreamsDiaryPage(page).getEntries();
    expect(e.daysAgo).toBe('');
    expect(e.cells).toHaveLength(3);
  });
});
