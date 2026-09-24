# Dream Portal – Test Automation

End-to-end functional tests for the **Dream Portal** dream-journal site
<https://arjitnigam.github.io/myDreams/>, built with **Playwright + TypeScript**, the **Page Object Model**,
HTML + **Allure** reporting, structured logging, screenshots, and an **AI-based validation** layer
(OpenAI, or an open-source model through Ollama).

| Area | Choice |
|---|---|
| Framework | Playwright Test (`expect` assertions, auto-waiting, parallel workers) |
| Language | TypeScript (strict) |
| Design | Page Object Model + custom fixtures |
| Reports | Playwright HTML report **and** Allure |
| Logging | Timestamped logger → console + `logs/test-run.log`, plus `test.step()` in reports |
| AI (bonus) | OpenAI (any OpenAI-compatible endpoint) · Ollama (open source) · offline heuristic fallback |
| CI | GitHub Actions workflow included |

---

## 1. Quick start

**Prerequisites:** Node.js ≥ 18.18 (20+ recommended). Java 11+ only if you want the Allure report.

```bash
npm install
npx playwright install chromium     # one-time browser download
npm test                            # runs against the live site
npm run report                      # open the HTML report
```

Everything is configured through environment variables (copy `.env.example` → `.env`):

| Variable | Default | Purpose |
|---|---|---|
| `BASE_URL` | `https://arjitnigam.github.io/myDreams/` | Site under test |
| `HEADLESS` | `true` | `false` to watch the browser |
| `CHROMIUM_PATH` | – | Use an installed Chrome/Chromium instead of the Playwright download |
| `AI_PROVIDER` | `auto` | `auto` \| `openai` \| `ollama` \| `heuristic` |
| `OPENAI_API_KEY` | – | Enables real OpenAI validation |
| `OPENAI_MODEL` / `OPENAI_BASE_URL` | `gpt-4o-mini` / OpenAI URL | Model / compatible endpoint |
| `OLLAMA_URL` / `OLLAMA_MODEL` | `http://localhost:11434` / `llama3.1` | Open-source model |
| `AI_MIN_ACCURACY` | `0.8` | Required AI-vs-table agreement |
| `AI_STRICT` | `false` | `true` = every single dream must match |

### Useful commands

| Command | What it does |
|---|---|
| `npm test` | Chromium UI + AI + resilience tests, plus browser-less unit tests |
| `npm run test:headed` | Same, with a visible browser |
| `npm run test:ui` | Playwright's interactive UI mode |
| `npm run test:ui-only` | Only the three page specs from Part 1 |
| `npm run test:ai` | Only the AI validation (Part 2) |
| `npm run test:all-browsers` | Chromium + Firefox + WebKit (`npx playwright install` first) |
| `npm run test:mock` | Run everything **offline** against the bundled replica site (see §6) |
| `npm run report` | Open the Playwright HTML report |
| `npm run allure` | Generate + open the Allure report |
| `npm run inspect` | Dump the live pages' HTML/text/screenshot into `debug/` (handy for locator tuning) |
| `npm run typecheck` | `tsc --noEmit` |

---

## 2. What is tested (mapped to the brief)

### Part 1 – Core UI tests (`tests/ui`)

| Brief requirement | Test |
|---|---|
| Loader appears and disappears after ~3 s | `home.spec.ts` › *loading animation appears, then disappears after ~3 seconds* – timing is measured **inside the browser** with `requestAnimationFrame`, so screenshots/polling can't skew it. Accepted window: 2–6 s. |
| Main content + "My Dreams" visible | `home.spec.ts` › *main content and "My Dreams" button become visible…* (heading, tagline, title, `10 Dreams` / `7 Days` badges, button visible + enabled) |
| Click opens diary + total in new tabs | `home.spec.ts` › *clicking "My Dreams" opens dreams-diary.html and dreams-total.html in new tabs* – verifies exactly two new tabs, their URLs, that both render, and screenshots each |
| Exactly 10 entries | `dreams-diary.spec.ts` › *has exactly 10 dream entries* |
| Types only Good/Bad | `dreams-diary.spec.ts` › *dream types are only "Good" or "Bad"* (every row reported via soft assertions) |
| All three columns filled | `dreams-diary.spec.ts` › *every row has Dream Name, Days Ago and Dream Type filled* (failure names the row) |
| Stats 6 / 4 / 10 / 2 | `dreams-total.spec.ts` › *shows Good 6, Bad 4, Total 10, Recurring 2* |
| Recurring = "Flying over mountains" & "Lost in maze" | `dreams-diary.spec.ts` and `dreams-total.spec.ts` – recurring dreams are **derived from the diary** and compared with the summary count |

Extras: header check, `Good + Bad = Total`, and a **cross-page consistency** test (summary numbers vs. what is
really in the diary table).

> **Recurring logic.** The page object first looks for rows explicitly flagged as recurring (a class or
> `data-recurring` attribute containing "recurring"); if none exist it treats a dream as recurring when the
> same name is logged more than once. The strategy used is attached to the report as a `recurring-strategy`
> annotation. If the site uses different logic, change `getRecurringDreams()` in
> `src/pages/DreamsDiaryPage.ts` – it is the only place.

> **Count-up animations.** Summary tests wait until all four numbers stop changing
> (`getStableStats()`) before asserting, so a counter that merely *passes through* the expected value
> can't produce a false pass.

### Part 2 – AI validation (`tests/ai`)

1. Reads the dream names from the diary table.
2. Sends each **distinct** name to the model with a strict one-word prompt (`Good` / `Bad`, temperature 0).
3. Compares the AI label with the table's *Dream Type* and attaches `ai-classification-report.json`.
4. Asserts agreement ≥ `AI_MIN_ACCURACY` (default 80 %), or **every** dream when `AI_STRICT=true`.
5. A second test checks obvious cases, e.g. `Monster chase → Bad`.

Provider selection (`AI_PROVIDER`):

* **`openai`** – set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, `OPENAI_BASE_URL`).
* **`ollama`** – free/open-source: `ollama pull llama3.1`, then `AI_PROVIDER=ollama`.
* **`auto`** (default) – OpenAI if a key exists, otherwise an **offline keyword heuristic** so the suite still runs
  end-to-end. The report and log state clearly that this is *not* an AI model
  (`ai-notice` annotation + warning).

Robustness: request timeout, retry with back-off on 429/5xx, reply parsing tolerant of `"Bad."` / `**Good**`,
concurrency limit, `gpt-5`/`o`-series compatibility (no `temperature`).

---

## 3. Project structure

```
├── playwright.config.ts        # reporters, projects, timeouts, mock web server
├── src/
│   ├── config/env.ts           # all env-driven settings
│   ├── pages/                  # Page Object Model
│   │   ├── BasePage.ts
│   │   ├── HomePage.ts         # loader probe, My Dreams, new-tab collection
│   │   ├── DreamsDiaryPage.ts  # table reader, recurring-dream logic
│   │   ├── DreamsTotalPage.ts  # label→number stat reader, settle-wait
│   │   └── dom-helpers.ts      # code that runs inside the browser
│   ├── fixtures/test-fixtures.ts   # page objects, `capture` screenshots, START/END logging
│   ├── ai/                     # OpenAI · Ollama · heuristic classifiers + factory
│   ├── data/expected.ts        # expected values from the brief
│   └── utils/                  # logger, dream helpers
├── tests/
│   ├── ui/                     # Part 1 specs (home, diary, total)
│   ├── ai/                     # Part 2 spec
│   ├── resilience/             # page objects vs. alternative markup layouts
│   └── unit/                   # pure-logic tests (no browser)
├── mock-site/                  # offline replica of the portal (+ tiny static server)
├── scripts/                    # inspect-site.mjs, fake-openai-server.js
├── screenshots/                # written on every run (committed as evidence)
└── .github/workflows/          # CI
```

Design notes: tests contain **no selectors** – all locators live in page objects; assertions live in the tests;
page objects only wait. Locators prefer roles/text over brittle CSS.

## 4. Reports, logs, screenshots

| Output | Location | Command |
|---|---|---|
| HTML report | `playwright-report/` | `npm run report` |
| Allure report | `allure-results/` → `allure-report/` | `npm run allure` |
| Log file | `logs/test-run.log` | – |
| Screenshots | `screenshots/<browser>/<test>/NN-label.png` (also attached to both reports) | – |
| Failure evidence | `test-results/` (screenshot, video, trace) | `npx playwright show-trace <trace.zip>` |

## 5. Troubleshooting

* **A locator can't find something on the live site** → run `npm run inspect`, look at `debug/*.html`,
  and adjust the single locator in the matching page object (`src/pages`). The resilience tests document the
  markup variants already supported.
* **Corporate network / no browser download** → `CHROMIUM_PATH="<path to chrome.exe>"`.
* **Linux CI/container sandbox errors** → `CHROMIUM_NO_SANDBOX=1`.
* **Allure fails** → it needs Java 11+ on `PATH`.

## 6. Offline replica (`npm run test:mock`)

`mock-site/` is a small hand-written stand-in for the portal (3 s loader, two-tab button, 10-row diary with
2 recurring dreams, count-up statistics). It lets the whole framework – including reporting, AI code paths and
CI – be exercised without internet. It is **not** the real site; the default target is the live URL.

To demo the OpenAI code path without a key:

```bash
npm run fake-ai        # terminal 1 – local OpenAI/Ollama-compatible stub
OPENAI_API_KEY=demo OPENAI_BASE_URL=http://localhost:8787/v1 npm run test:ai   # terminal 2
```

## 7. Delivering via GitHub (private repo)

```bash
git remote add origin https://github.com/<you>/dream-portal-automation.git
git push -u origin main
```

Then on GitHub: **Settings → Collaborators → Add people → `qawingify`**. Commit the `screenshots/` produced by a
run against the live site as evidence. The history uses Conventional Commits; to re-author it as yourself:

```bash
git config user.name "Your Name" && git config user.email "you@example.com"
git rebase -r --root --exec 'git commit --amend --no-edit --reset-author'
```
