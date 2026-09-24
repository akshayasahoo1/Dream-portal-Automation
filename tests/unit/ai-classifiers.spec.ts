import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { test, expect } from '@playwright/test';
import { HeuristicClassifier, OllamaClassifier, OpenAIClassifier, createClassifier, parseLabel } from '../../src/ai';
import { OBVIOUS_DREAMS } from '../../src/data/expected';
import type { ENV } from '../../src/config/env';

test.describe('parseLabel', () => {
  test('extracts Good/Bad from messy model output', () => {
    expect(parseLabel('Good')).toBe('Good');
    expect(parseLabel('bad.')).toBe('Bad');
    expect(parseLabel('**Bad**')).toBe('Bad');
    expect(parseLabel('Classification: good')).toBe('Good');
  });
  test('throws on unusable output', () => {
    expect(() => parseLabel('I am not sure')).toThrow(/not a Good\/Bad label/);
  });
});

test.describe('HeuristicClassifier (offline fallback)', () => {
  const c = new HeuristicClassifier();
  test('is flagged as not a real model', () => expect(c.isRealModel).toBe(false));
  for (const { name, label } of OBVIOUS_DREAMS) {
    test(`"${name}" -> ${label}`, async () => expect(await c.classify(name)).toBe(label));
  }
  test('whole-word matching: "chocolate" must not trigger "late"', async () => {
    expect(await c.classify('Chocolate factory')).toBe('Good');
  });
});

test.describe('createClassifier provider selection', () => {
  const base = {
    provider: 'auto', openaiKey: '', openaiModel: 'gpt-4o-mini', openaiBaseUrl: 'https://x/v1',
    ollamaUrl: 'http://o', ollamaModel: 'm', minAccuracy: 0.8, strict: false,
  } as unknown as typeof ENV.ai;

  test('auto without key -> heuristic with a notice', () => {
    const s = createClassifier(base);
    expect(s.classifier).toBeInstanceOf(HeuristicClassifier);
    expect(s.notice).toMatch(/OPENAI_API_KEY/);
  });
  test('auto with key -> OpenAI', () => {
    expect(createClassifier({ ...base, openaiKey: 'k' }).classifier).toBeInstanceOf(OpenAIClassifier);
  });
  test('openai without key -> skip reason', () => {
    const s = createClassifier({ ...base, provider: 'openai' });
    expect(s.classifier).toBeUndefined();
    expect(s.skipReason).toMatch(/OPENAI_API_KEY/);
  });
  test('ollama -> Ollama', () => {
    expect(createClassifier({ ...base, provider: 'ollama' }).classifier).toBeInstanceOf(OllamaClassifier);
  });
});

test.describe('HTTP providers against a local stub server', () => {
  let server: http.Server;
  let baseUrl: string;
  const seen: { url?: string; auth?: string; body?: any }[] = [];
  let failFirst = 0;

  test.beforeAll(async () => {
    server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const body = raw ? JSON.parse(raw) : {};
        seen.push({ url: req.url, auth: req.headers.authorization, body });
        if (failFirst > 0) {
          failFirst--;
          res.writeHead(503).end('busy');
          return;
        }
        const dream = String(body.messages?.at(-1)?.content ?? '');
        const label = /monster/i.test(dream) ? 'Bad.' : 'Good';
        res.setHeader('Content-Type', 'application/json');
        if (req.url === '/v1/chat/completions') res.end(JSON.stringify({ choices: [{ message: { content: label } }] }));
        else if (req.url === '/api/chat') res.end(JSON.stringify({ message: { content: label } }));
        else res.writeHead(404).end();
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  test.afterAll(() => new Promise<void>((r) => server.close(() => r())));
  test.beforeEach(() => { seen.length = 0; failFirst = 0; });

  test('OpenAIClassifier sends bearer auth + prompt and parses the reply', async () => {
    const c = new OpenAIClassifier({ apiKey: 'sk-test', model: 'gpt-4o-mini', baseUrl: `${baseUrl}/v1` });
    expect(await c.classify('Monster chase')).toBe('Bad');
    expect(await c.classify('Flying over mountains')).toBe('Good');
    expect(seen[0].auth).toBe('Bearer sk-test');
    expect(seen[0].body.model).toBe('gpt-4o-mini');
    expect(seen[0].body.temperature).toBe(0);
    expect(seen[0].body.messages[1].content).toContain('Monster chase');
  });

  test('OpenAIClassifier omits temperature for gpt-5 / o-series models', async () => {
    const c = new OpenAIClassifier({ apiKey: 'k', model: 'gpt-5-mini', baseUrl: `${baseUrl}/v1` });
    await c.classify('Monster chase');
    expect(seen[0].body).not.toHaveProperty('temperature');
  });

  test('retries on 503 then succeeds', async () => {
    failFirst = 1;
    const c = new OpenAIClassifier({ apiKey: 'k', model: 'gpt-4o-mini', baseUrl: `${baseUrl}/v1` });
    expect(await c.classify('Monster chase')).toBe('Bad');
    expect(seen).toHaveLength(2);
  });

  test('OllamaClassifier talks to /api/chat', async () => {
    const c = new OllamaClassifier(baseUrl, 'llama3.1');
    expect(await c.classify('Monster chase')).toBe('Bad');
    expect(seen[0].url).toBe('/api/chat');
    expect(seen[0].body.stream).toBe(false);
  });
});
