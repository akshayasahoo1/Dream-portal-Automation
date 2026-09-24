import fs from 'node:fs';
import path from 'node:path';

type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'STEP';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'test-run.log');
let dirReady = false;

function write(level: Level, message: string): void {
  const worker = process.env.TEST_WORKER_INDEX ?? '-';
  const line = `${new Date().toISOString()} [${level.padEnd(5)}] [w${worker}] ${message}`;
  // Console (picked up by the Playwright reporters)
  // eslint-disable-next-line no-console
  console.log(line);
  try {
    if (!dirReady) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      dirReady = true;
    }
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {
    /* logging must never fail a test */
  }
}

/** Tiny dependency-free logger: console + logs/test-run.log. */
export const logger = {
  debug: (m: string) => write('DEBUG', m),
  info: (m: string) => write('INFO', m),
  warn: (m: string) => write('WARN', m),
  error: (m: string) => write('ERROR', m),
  step: (m: string) => write('STEP', m),
};
