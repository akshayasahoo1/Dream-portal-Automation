import { logger } from '../utils/logger';

export interface PostJsonOptions {
  headers?: Record<string, string>;
  retries?: number;
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST JSON with timeout + exponential back-off on 429 / 5xx / network errors. */
export async function postJson<T>(url: string, body: unknown, opts: PostJsonOptions = {}): Promise<T> {
  const { headers = {}, retries = 3, timeoutMs = 30_000 } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) return (await res.json()) as T;

      const text = await res.text().catch(() => '');
      const retryable = res.status === 429 || res.status >= 500;
      const err = new Error(`HTTP ${res.status} from ${new URL(url).host}: ${text.slice(0, 300)}`);
      if (!retryable) throw Object.assign(err, { fatal: true });
      lastError = err;
    } catch (e) {
      if ((e as { fatal?: boolean }).fatal) throw e;
      lastError = e;
    }

    if (attempt < retries) {
      const delay = 500 * 2 ** attempt;
      logger.warn(`AI request failed (${(lastError as Error).message}); retry ${attempt + 1}/${retries} in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
