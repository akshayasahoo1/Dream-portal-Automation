/**
 * Local stand-in for OpenAI / Ollama, handy for demoing the AI tests without a key:
 *   node scripts/fake-openai-server.js
 *   OPENAI_API_KEY=demo OPENAI_BASE_URL=http://localhost:8787/v1 npm test
 * It answers "Bad" for scary-sounding names and "Good" otherwise. NOT a real model.
 */
const http = require('node:http');
const PORT = Number(process.env.FAKE_AI_PORT || 8787);
const BAD = /monster|chase|maze|falling|nightmare|lost|trapped|drown|fire|dark|ghost/i;

http
  .createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : {};
      const last = String((body.messages || []).slice(-1)[0]?.content || '');
      const label = BAD.test(last) ? 'Bad' : 'Good';
      res.setHeader('Content-Type', 'application/json');
      if (req.url.endsWith('/chat/completions')) return res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: label } }] }));
      if (req.url === '/api/chat') return res.end(JSON.stringify({ message: { role: 'assistant', content: label } }));
      res.writeHead(404).end('not found');
    });
  })
  .listen(PORT, () => console.log(`Fake AI server on http://localhost:${PORT}  (OpenAI: /v1/chat/completions, Ollama: /api/chat)`));
