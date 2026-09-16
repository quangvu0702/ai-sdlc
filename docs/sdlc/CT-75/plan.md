# Email Summarizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a local CLI that prints a Digest of the Operator's newest Inbox Unread Messages via Gmail API OAuth and an OpenAI-compatible model.

**Architecture:** `runDigest` orchestrates fake-able `gmail` and `summarize` ports. `body.js` normalizes text. Real HTTP lives only in `gmail.js` and `summarize.js`. `cli.js` maps results to stdout/stderr/exit codes.

**Tech Stack:** JavaScript ESM, `node --test`, Node 18+ `fetch`. No CLI framework. No `googleapis` package.

**Spec:** `docs/sdlc/CT-75/spec.md`

## Global Constraints

- All product code lives in `email-summarizer/` at the repo root. Do not add it under `skills/` or `docs/sdlc/`.
- `package.json` has `"type": "module"`. No TypeScript, no bundler, no oclif.
- `"test": "node --test"`, `"start": "node cli.js"`, `"auth": "node auth-gmail.js"`.
- Zero Unread Messages stdout is exactly `No unread messages in Inbox.\n`.
- From/Subject lines are exactly `From: ${from} | Subject: ${subject}`.
- Success Digest stdout is `summary + "\n\n" + lines.join("\n") + "\n"`.
- Gmail scope is `https://www.googleapis.com/auth/gmail.readonly`. No modify/send APIs.
- CI tests must not call the network or require credentials.
- No Xray. Do not change `tic-tac-toe/`, `skills/`, or `flows/`.

## File structure

- Create: `email-summarizer/package.json`
- Create: `email-summarizer/body.js` — `extractBody`
- Create: `email-summarizer/body.test.js`
- Create: `email-summarizer/run-digest.js` — `runDigest`
- Create: `email-summarizer/run-digest.test.js`
- Create: `email-summarizer/gmail.js` — `createGmail({ fetchImpl, env })`, `parseGmailMessage`
- Create: `email-summarizer/gmail.test.js`
- Create: `email-summarizer/summarize.js` — `createSummarizer({ fetchImpl, env })`
- Create: `email-summarizer/summarize.test.js`
- Create: `email-summarizer/cli.js` — `runCli({ env, stdout, stderr, runDigestFn, gmail, summarize })`
- Create: `email-summarizer/cli.test.js`
- Create: `email-summarizer/auth-gmail.js`

---

### Task 1: `extractBody`

**Files:**
- Create: `email-summarizer/package.json`
- Create: `email-summarizer/body.test.js`
- Create: `email-summarizer/body.js`
- Test: `email-summarizer/body.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `extractBody({ textPlain?: string, textHtml?: string }): string`

- [ ] **Step 1: Create `email-summarizer/package.json`**

```json
{
  "name": "email-summarizer",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "start": "node cli.js",
    "auth": "node auth-gmail.js"
  }
}
```

- [ ] **Step 2: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractBody } from './body.js';

test('prefers text/plain over HTML', () => {
  assert.equal(
    extractBody({ textPlain: '  hello  ', textHtml: '<p>nope</p>' }),
    'hello',
  );
});

test('strips tags from HTML-only', () => {
  assert.equal(extractBody({ textHtml: '<p>Hi <b>there</b></p>' }), 'Hi there');
});

test('truncates to 4000 characters', () => {
  const textPlain = 'x'.repeat(5000);
  const out = extractBody({ textPlain });
  assert.equal(out.length, 4000);
});

test('empty parts return empty string', () => {
  assert.equal(extractBody({}), '');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd email-summarizer && npm test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./body.js`.

- [ ] **Step 4: Write minimal implementation**

```js
export function extractBody({ textPlain, textHtml } = {}) {
  const plain = typeof textPlain === 'string' ? textPlain.trim() : '';
  if (plain) return plain.slice(0, 4000);
  const html = typeof textHtml === 'string' ? textHtml : '';
  if (!html) return '';
  const stripped = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.slice(0, 4000);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd email-summarizer && npm test`

Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add email-summarizer/package.json email-summarizer/body.js email-summarizer/body.test.js
git commit -m "$(cat <<'EOF'
feat(email-summarizer): extract message body text

EOF
)"
```

---

### Task 2: `runDigest` success paths

**Files:**
- Create: `email-summarizer/run-digest.test.js`
- Create: `email-summarizer/run-digest.js`
- Test: `email-summarizer/run-digest.test.js`

**Interfaces:**
- Consumes: `extractBody` from `./body.js`
- Produces: `runDigest({ gmail, summarize }): Promise<{ ok: boolean, empty?: boolean, stage?: "gmail"|"ai", error?: Error, stdout?: string }>`
- `gmail.listUnreadInbox({ max: number }): Promise<Array<{ from: string, subject: string, body?: string, textPlain?: string, textHtml?: string, receivedAt: number|string }>>`
- `summarize(messages: Array<{ from: string, subject: string, body: string, receivedAt: number|string }>): Promise<string>`

If a message has `textPlain` or `textHtml`, set `body` via `extractBody`. Otherwise use `message.body ?? ""`.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runDigest } from './run-digest.js';

function fakeGmail(messages) {
  return {
    listUnreadInbox: async () => messages,
    calls: [],
  };
}

test('zero unread does not call summarize', async () => {
  let called = 0;
  const result = await runDigest({
    gmail: fakeGmail([]),
    summarize: async () => {
      called += 1;
      return 'nope';
    },
  });
  assert.equal(called, 0);
  assert.equal(result.ok, true);
  assert.equal(result.empty, true);
  assert.equal(result.stdout, 'No unread messages in Inbox.\n');
});

test('three messages: one summarize call and digest stdout', async () => {
  const msgs = [
    { from: 'a@x', subject: 'S1', body: 'B1', receivedAt: 1 },
    { from: 'b@x', subject: 'S2', body: 'B2', receivedAt: 2 },
    { from: 'c@x', subject: 'S3', body: 'B3', receivedAt: 3 },
  ];
  let received;
  const result = await runDigest({
    gmail: fakeGmail(msgs),
    summarize: async (m) => {
      received = m;
      return 'SUMMARY';
    },
  });
  assert.equal(received.length, 3);
  assert.equal(received[0].body, 'B1');
  assert.equal(result.ok, true);
  assert.equal(
    result.stdout,
    'SUMMARY\n\nFrom: a@x | Subject: S1\nFrom: b@x | Subject: S2\nFrom: c@x | Subject: S3\n',
  );
});

test('twelve messages: only 10 newest go to summarize', async () => {
  const msgs = Array.from({ length: 12 }, (_, i) => ({
    from: `${i}@x`,
    subject: `S${i}`,
    body: `B${i}`,
    receivedAt: i,
  }));
  let received;
  await runDigest({
    gmail: fakeGmail(msgs),
    summarize: async (m) => {
      received = m;
      return 'S';
    },
  });
  assert.equal(received.length, 10);
  assert.equal(received[0].from, '11@x');
  assert.equal(received[9].from, '2@x');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd email-summarizer && npm test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./run-digest.js`.

- [ ] **Step 3: Write minimal implementation**

```js
import { extractBody } from './body.js';

function receivedMs(value) {
  if (typeof value === 'number') return value;
  const n = Number(value);
  if (!Number.isNaN(n) && String(value).trim() !== '' && !String(value).includes('-')) return n;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

function prepare(message) {
  const hasParts = message.textPlain != null || message.textHtml != null;
  const body = hasParts
    ? extractBody({ textPlain: message.textPlain, textHtml: message.textHtml })
    : (message.body ?? '');
  return {
    from: message.from,
    subject: message.subject,
    body,
    receivedAt: message.receivedAt,
  };
}

export async function runDigest({ gmail, summarize }) {
  const listed = await gmail.listUnreadInbox({ max: 10 });
  const sorted = [...listed].sort((a, b) => receivedMs(b.receivedAt) - receivedMs(a.receivedAt));
  const selected = sorted.slice(0, 10).map(prepare);
  if (selected.length === 0) {
    return { ok: true, empty: true, stdout: 'No unread messages in Inbox.\n' };
  }
  const lines = selected.map((m) => `From: ${m.from} | Subject: ${m.subject}`);
  const summary = await summarize(selected);
  return {
    ok: true,
    empty: false,
    stdout: `${summary}\n\n${lines.join('\n')}\n`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd email-summarizer && npm test`

Expected: PASS (previous body tests + 3 new).

- [ ] **Step 5: Commit**

```bash
git add email-summarizer/run-digest.js email-summarizer/run-digest.test.js
git commit -m "$(cat <<'EOF'
feat(email-summarizer): runDigest empty, digest, and cap 10

EOF
)"
```

---

### Task 3: `runDigest` failures and no mark-read

**Files:**
- Modify: `email-summarizer/run-digest.test.js`
- Modify: `email-summarizer/run-digest.js`
- Test: `email-summarizer/run-digest.test.js`

**Interfaces:**
- Consumes: `runDigest` from Task 2
- Produces: on Gmail throw `{ ok: false, stage: "gmail", error }` with no Digest `stdout`; on summarize throw `{ ok: false, stage: "ai", error, stdout }` From/Subject lines only. `runDigest` only calls `gmail.listUnreadInbox`.

- [ ] **Step 1: Write the failing tests** (append to `run-digest.test.js`)

```js
test('gmail throw: stage gmail, summarize not called', async () => {
  let called = 0;
  const err = new Error('boom');
  const result = await runDigest({
    gmail: {
      listUnreadInbox: async () => {
        throw err;
      },
    },
    summarize: async () => {
      called += 1;
      return 'x';
    },
  });
  assert.equal(called, 0);
  assert.equal(result.ok, false);
  assert.equal(result.stage, 'gmail');
  assert.equal(result.error, err);
  assert.equal(result.stdout, undefined);
});

test('ai throw: stage ai and from/subject lines', async () => {
  const result = await runDigest({
    gmail: {
      listUnreadInbox: async () => [
        { from: 'a@x', subject: 'S1', body: 'B1', receivedAt: 1 },
      ],
    },
    summarize: async () => {
      throw new Error('down');
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.stage, 'ai');
  assert.equal(result.stdout, 'From: a@x | Subject: S1\n');
});

test('does not call mark-read or modify on gmail', async () => {
  const calls = [];
  const gmail = new Proxy(
    {
      listUnreadInbox: async () => [
        { from: 'a@x', subject: 'S', body: 'B', receivedAt: 1 },
      ],
    },
    {
      get(target, prop) {
        calls.push(String(prop));
        return target[prop];
      },
    },
  );
  await runDigest({
    gmail,
    summarize: async () => 'ok',
  });
  assert.deepEqual(calls, ['listUnreadInbox']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd email-summarizer && npm test`

Expected: FAIL — `runDigest` does not catch throws yet (unhandled exception or missing `stage`).

- [ ] **Step 3: Wrap the existing `runDigest` body**

```js
export async function runDigest({ gmail, summarize }) {
  let listed;
  try {
    listed = await gmail.listUnreadInbox({ max: 10 });
  } catch (error) {
    return { ok: false, stage: 'gmail', error };
  }
  const sorted = [...listed].sort((a, b) => receivedMs(b.receivedAt) - receivedMs(a.receivedAt));
  const selected = sorted.slice(0, 10).map(prepare);
  if (selected.length === 0) {
    return { ok: true, empty: true, stdout: 'No unread messages in Inbox.\n' };
  }
  const lines = selected.map((m) => `From: ${m.from} | Subject: ${m.subject}`);
  try {
    const summary = await summarize(selected);
    return {
      ok: true,
      empty: false,
      stdout: `${summary}\n\n${lines.join('\n')}\n`,
    };
  } catch (error) {
    return { ok: false, stage: 'ai', error, stdout: `${lines.join('\n')}\n` };
  }
}
```

Keep `extractBody` / `prepare` / `receivedMs` from Task 2.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd email-summarizer && npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add email-summarizer/run-digest.js email-summarizer/run-digest.test.js
git commit -m "$(cat <<'EOF'
feat(email-summarizer): fail closed on Gmail and AI errors

EOF
)"
```

---

### Task 4: Gmail port with injected `fetch`

**Files:**
- Create: `email-summarizer/gmail.js`
- Create: `email-summarizer/gmail.test.js`
- Test: `email-summarizer/gmail.test.js`

**Interfaces:**
- Consumes: `extractBody` from `./body.js`
- Produces: `createGmail({ fetchImpl, env }).listUnreadInbox({ max }): Promise<message[]>`
- `parseGmailMessage(resource): { from, subject, textPlain, textHtml, receivedAt }`
- Token URL: `POST https://oauth2.googleapis.com/token` with `grant_type=refresh_token`
- List URL: `GET https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread+in:inbox&maxResults=` + max
- Get URL: `GET https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}?format=full`
- Header: `Authorization: Bearer {access_token}`
- Do not implement modify/send functions.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGmail, parseGmailMessage } from './gmail.js';

test('parseGmailMessage reads headers, date, and text/plain', () => {
  const parsed = parseGmailMessage({
    internalDate: '1700000000000',
    payload: {
      headers: [
        { name: 'From', value: 'Ada <ada@x>' },
        { name: 'Subject', value: 'Hello' },
      ],
      mimeType: 'text/plain',
      body: { data: Buffer.from('Hi there').toString('base64url') },
    },
  });
  assert.equal(parsed.from, 'Ada <ada@x>');
  assert.equal(parsed.subject, 'Hello');
  assert.equal(parsed.textPlain, 'Hi there');
  assert.equal(parsed.receivedAt, 1700000000000);
});

test('listUnreadInbox uses readonly list+get and not modify', async () => {
  const urls = [];
  const fetchImpl = async (url, opts = {}) => {
    urls.push({ url: String(url), method: opts.method || 'GET', body: opts.body });
    if (String(url).includes('oauth2.googleapis.com/token')) {
      return { ok: true, json: async () => ({ access_token: 'tok' }) };
    }
    if (String(url).includes('/messages?') || String(url).endsWith('/messages')) {
      return { ok: true, json: async () => ({ messages: [{ id: 'm1' }] }) };
    }
    return {
      ok: true,
      json: async () => ({
        id: 'm1',
        internalDate: '2',
        payload: {
          headers: [
            { name: 'From', value: 'a@x' },
            { name: 'Subject', value: 'S' },
          ],
          mimeType: 'text/plain',
          body: { data: Buffer.from('B').toString('base64url') },
        },
      }),
    };
  };
  const gmail = createGmail({
    fetchImpl,
    env: {
      GMAIL_CLIENT_ID: 'id',
      GMAIL_CLIENT_SECRET: 'sec',
      GMAIL_REFRESH_TOKEN: 'ref',
    },
  });
  const msgs = await gmail.listUnreadInbox({ max: 10 });
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].from, 'a@x');
  assert.equal(msgs[0].subject, 'S');
  assert.ok(urls.some((u) => u.url.includes('q=is:unread+in:inbox') || u.url.includes('q=is%3Aunread%20in%3Ainbox')));
  assert.ok(!urls.some((u) => /modify|send|trash/i.test(u.url)));
});

test('non-2xx Gmail response throws', async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes('token')) {
      return { ok: true, json: async () => ({ access_token: 'tok' }) };
    }
    return { ok: false, status: 401, json: async () => ({}) };
  };
  const gmail = createGmail({
    fetchImpl,
    env: {
      GMAIL_CLIENT_ID: 'id',
      GMAIL_CLIENT_SECRET: 'sec',
      GMAIL_REFRESH_TOKEN: 'ref',
    },
  });
  await assert.rejects(() => gmail.listUnreadInbox({ max: 10 }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd email-summarizer && npm test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./gmail.js`.

- [ ] **Step 3: Write `gmail.js`**

Decode Gmail `body.data` with `Buffer.from(data, 'base64url')` (or standard base64 with `-`/`_` fixed). Walk `payload.parts` recursively for `text/plain` and `text/html`. Use `URLSearchParams` for the token POST body: `client_id`, `client_secret`, `refresh_token`, `grant_type=refresh_token`. If `json().messages` is missing, return `[]`.

Throw `new Error` with status text when `ok` is false.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd email-summarizer && npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add email-summarizer/gmail.js email-summarizer/gmail.test.js
git commit -m "$(cat <<'EOF'
feat(email-summarizer): Gmail API list and get via injected fetch

EOF
)"
```

---

### Task 5: Summarizer, CLI, auth helper

**Files:**
- Create: `email-summarizer/summarize.js`
- Create: `email-summarizer/summarize.test.js`
- Create: `email-summarizer/cli.js`
- Create: `email-summarizer/cli.test.js`
- Create: `email-summarizer/auth-gmail.js`
- Test: `email-summarizer/summarize.test.js`, `email-summarizer/cli.test.js`

**Interfaces:**
- Produces: `createSummarizer({ fetchImpl, env }).summarize(messages): Promise<string>`
- Default base `https://api.openai.com/v1`, default model `gpt-4o-mini`
- POST `{base}/chat/completions` with `Authorization: Bearer ${OPENAI_API_KEY}` and JSON `{ model, messages: [{ role: "user", content }] }`
- `content` includes each message's From, Subject, Body and asks for one short Digest paragraph
- Non-2xx throws
- `runCli({ env, stdout, stderr, runDigestFn })` returns exit code
- Required env: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `OPENAI_API_KEY`
- Missing env: stderr `Missing env: <NAME>\n`, return `1`, no stdout write
- `ok`: write `result.stdout` to stdout, return `0`
- `stage === "gmail"`: stderr `Gmail error: ${error.message}\n`, return `1`
- `stage === "ai"`: write `result.stdout` to stdout, stderr `AI error: ${error.message}\n`, return `1`
- `cli.js` when run as main: `process.exit(await runCli({ env: process.env, stdout: process.stdout, stderr: process.stderr, runDigestFn: runDigest wired with createGmail({ fetchImpl: fetch, env }) and createSummarizer({ fetchImpl: fetch, env }) }))`
- `auth-gmail.js`: listen on `http://127.0.0.1:0`, print Google auth URL (`scope=https://www.googleapis.com/auth/gmail.readonly`, `access_type=offline`, `prompt=consent`, `response_type=code`, `redirect_uri=http://127.0.0.1:<port>`), exchange `code` for tokens, print refresh token, exit. Requires `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`. No tests for this file.

- [ ] **Step 1: Write failing `summarize.test.js` and `cli.test.js`**

```js
// summarize.test.js
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
  const out = await s.summarize([
    { from: 'a@x', subject: 'S', body: 'B' },
  ]);
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
```

```js
// cli.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd email-summarizer && npm test`

Expected: FAIL missing `./summarize.js` / `./cli.js`.

- [ ] **Step 3: Implement `summarize.js`, `cli.js`, `auth-gmail.js`**

`summarize.js`: build `content` as:

```
Summarize these unread emails in one short paragraph.

From: ...
Subject: ...
Body: ...
```

(repeat per message). Read `choices[0].message.content` and trim. Honor `OPENAI_BASE_URL` (strip trailing slash) and `OPENAI_MODEL`.

`cli.js`: check env names in that order; first missing wins. Export `runCli`. At bottom:

```js
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) ||
  import.meta.url === `file://${process.argv[1]}`;
```

Use this reliable main check instead:

```js
import { pathToFileURL } from 'node:url';

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { createGmail } = await import('./gmail.js');
  const { createSummarizer } = await import('./summarize.js');
  const { runDigest } = await import('./run-digest.js');
  const gmail = createGmail({ fetchImpl: globalThis.fetch, env: process.env });
  const summarizer = createSummarizer({ fetchImpl: globalThis.fetch, env: process.env });
  const code = await runCli({
    env: process.env,
    stdout: process.stdout,
    stderr: process.stderr,
    runDigestFn: () => runDigest({ gmail, summarize: (m) => summarizer.summarize(m) }),
  });
  process.exit(code);
}
```

`auth-gmail.js`: `http.createServer` on `127.0.0.1`, port 0; print `https://accounts.google.com/o/oauth2/v2/auth?...`; on `/?code=`; POST token endpoint; `console.log(refresh_token)`; `server.close()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd email-summarizer && npm test`

Expected: PASS all tests including summarize + cli.

- [ ] **Step 5: Commit**

```bash
git add email-summarizer/summarize.js email-summarizer/summarize.test.js email-summarizer/cli.js email-summarizer/cli.test.js email-summarizer/auth-gmail.js
git commit -m "$(cat <<'EOF'
feat(email-summarizer): OpenAI-compatible summarize, CLI, and OAuth helper

EOF
)"
```

---

## Spec coverage

| Spec requirement | Task |
| --- | --- |
| `extractBody` plain/HTML/4000 | 1 |
| Empty inbox, 3-message Digest, cap 10 | 2 |
| Gmail/AI errors, no modify | 3 |
| Gmail API OAuth list/get | 4 |
| OpenAI-compatible HTTP, CLI env/exits, auth helper | 5 |
| No Xray, no live CI network | all tests use fakes/injected fetch |

## Placeholder scan

None. Signatures use `runDigest`, `extractBody`, `createGmail`, `createSummarizer`, `runCli` throughout.
