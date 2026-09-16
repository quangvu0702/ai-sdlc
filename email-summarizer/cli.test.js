import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { runCli } from './cli.js';

function collect() {
  let text = '';
  const stream = new Writable({
    write(chunk, _enc, cb) {
      text += chunk.toString();
      cb();
    },
  });
  return { stream, text: () => text };
}

const fullEnv = {
  GMAIL_CLIENT_ID: 'id',
  GMAIL_CLIENT_SECRET: 'sec',
  GMAIL_REFRESH_TOKEN: 'ref',
  OPENAI_API_KEY: 'k',
};

test('missing env', async () => {
  const out = collect();
  const err = collect();
  const code = await runCli({
    env: {},
    stdout: out.stream,
    stderr: err.stream,
    runDigestFn: async () => ({ ok: true, stdout: 'nope' }),
  });
  assert.equal(code, 1);
  assert.equal(out.text(), '');
  assert.match(err.text(), /^Missing env: GMAIL_CLIENT_ID\n$/);
});

test('gmail failure', async () => {
  const out = collect();
  const err = collect();
  const code = await runCli({
    env: fullEnv,
    stdout: out.stream,
    stderr: err.stream,
    runDigestFn: async () => ({
      ok: false,
      stage: 'gmail',
      error: new Error('nope'),
    }),
  });
  assert.equal(code, 1);
  assert.equal(out.text(), '');
  assert.equal(err.text(), 'Gmail error: nope\n');
});

test('ai failure prints lines', async () => {
  const out = collect();
  const err = collect();
  const code = await runCli({
    env: fullEnv,
    stdout: out.stream,
    stderr: err.stream,
    runDigestFn: async () => ({
      ok: false,
      stage: 'ai',
      error: new Error('down'),
      stdout: 'From: a@x | Subject: S\n',
    }),
  });
  assert.equal(code, 1);
  assert.equal(out.text(), 'From: a@x | Subject: S\n');
  assert.equal(err.text(), 'AI error: down\n');
});

test('success digest', async () => {
  const out = collect();
  const err = collect();
  const code = await runCli({
    env: fullEnv,
    stdout: out.stream,
    stderr: err.stream,
    runDigestFn: async () => ({ ok: true, stdout: 'OK\n' }),
  });
  assert.equal(code, 0);
  assert.equal(out.text(), 'OK\n');
  assert.equal(err.text(), '');
});
