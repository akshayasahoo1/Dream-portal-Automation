import 'dotenv/config';

const truthy = (v?: string) => ['1', 'true', 'yes'].includes((v ?? '').toLowerCase());

const useMock = truthy(process.env.USE_MOCK);
const mockPort = Number(process.env.MOCK_PORT ?? 4173);

const LIVE_URL = 'https://arjitnigam.github.io/myDreams/';
const rawBase = process.env.BASE_URL?.trim() || (useMock ? `http://localhost:${mockPort}/` : LIVE_URL);

export type AiProvider = 'auto' | 'openai' | 'ollama' | 'heuristic';

/** Central place for every environment-driven setting. */
export const ENV = {
  /** Always ends with "/" so relative page paths (e.g. "dreams-diary.html") resolve correctly. */
  baseUrl: rawBase.endsWith('/') ? rawBase : `${rawBase}/`,
  useMock,
  mockPort,
  headless: process.env.HEADLESS !== 'false',
  chromiumPath: process.env.CHROMIUM_PATH?.trim() || undefined,
  noSandbox: truthy(process.env.CHROMIUM_NO_SANDBOX),
  isCI: !!process.env.CI,
  ai: {
    provider: (process.env.AI_PROVIDER?.trim().toLowerCase() || 'auto') as AiProvider,
    openaiKey: process.env.OPENAI_API_KEY?.trim() || '',
    openaiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
    openaiBaseUrl: (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    ollamaUrl: (process.env.OLLAMA_URL?.trim() || 'http://localhost:11434').replace(/\/+$/, ''),
    ollamaModel: process.env.OLLAMA_MODEL?.trim() || 'llama3.1',
    minAccuracy: Number(process.env.AI_MIN_ACCURACY ?? 0.8),
    strict: truthy(process.env.AI_STRICT),
  },
} as const;
