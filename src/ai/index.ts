import { ENV } from '../config/env';
import { HeuristicClassifier } from './HeuristicClassifier';
import { OllamaClassifier } from './OllamaClassifier';
import { OpenAIClassifier } from './OpenAIClassifier';
import type { DreamClassifier, DreamLabel } from './types';

export * from './types';
export { HeuristicClassifier, OllamaClassifier, OpenAIClassifier };

export interface ClassifierSelection {
  classifier?: DreamClassifier;
  /** Set when the requested provider cannot be used (test should skip with this reason). */
  skipReason?: string;
  /** Extra information worth surfacing in the report. */
  notice?: string;
}

/** Picks a provider from env (AI_PROVIDER = auto | openai | ollama | heuristic). */
export function createClassifier(cfg = ENV.ai): ClassifierSelection {
  switch (cfg.provider) {
    case 'openai':
      return cfg.openaiKey
        ? { classifier: new OpenAIClassifier({ apiKey: cfg.openaiKey, model: cfg.openaiModel, baseUrl: cfg.openaiBaseUrl }) }
        : { skipReason: 'AI_PROVIDER=openai but OPENAI_API_KEY is not set' };
    case 'ollama':
      return { classifier: new OllamaClassifier(cfg.ollamaUrl, cfg.ollamaModel) };
    case 'heuristic':
      return { classifier: new HeuristicClassifier(), notice: 'Using offline heuristic (AI_PROVIDER=heuristic)' };
    case 'auto':
    default:
      if (cfg.openaiKey) {
        return { classifier: new OpenAIClassifier({ apiKey: cfg.openaiKey, model: cfg.openaiModel, baseUrl: cfg.openaiBaseUrl }) };
      }
      return {
        classifier: new HeuristicClassifier(),
        notice: 'OPENAI_API_KEY not set - fell back to the OFFLINE HEURISTIC. Set the key (or AI_PROVIDER=ollama) for real AI validation.',
      };
  }
}

/** Runs `fn` over `items` with a fixed concurrency limit, preserving order. */
export async function mapWithConcurrency<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export type { DreamLabel };
