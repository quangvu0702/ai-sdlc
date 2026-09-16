import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSummarizer } from './summarize.js';

test('posts chat completions and returns content', async () => {
  let captured;
  const fetchImpl = async (url, opts) => {
    captured = { url: String(url), ...opts };
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'DIGEST' } }],
      }),
    };
  };
  const s = createSummarizer({
    fetchImpl,
    env: { OPENAI_API_KEY: 'k' },
  });
  const out = await s.summarize([{ from: 'a@x', subject: 'S', body: 'B' }]);
  assert.equal(out, 'DIGEST');
  assert.equal(captured.url, 'https://api.openai.com/v1/chat/completions');
  assert.match(captured.headers.Authorization, /Bearer k/);
  const payload = JSON.parse(captured.body);
  assert.equal(payload.model, 'gpt-4o-mini');
  assert.match(payload.messages[0].content, /a@x/);
});

test('non-2xx throws', async () => {
  const s = createSummarizer({
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }),
    env: { OPENAI_API_KEY: 'k' },
  });
  await assert.rejects(() => s.summarize([]));
});
