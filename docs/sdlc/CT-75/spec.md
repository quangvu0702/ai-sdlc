# CT-75 Spec: Email Summarizer CLI

**Intent:** `docs/sdlc/CT-75/intent.md`  
**Glossary:** `CONTEXT.md`  
**Issue:** https://gfgroup.atlassian.net/browse/CT-75  
**ADR:** `docs/adr/0001-gmail-api-oauth.md`

A local CLI in `email-summarizer/` that fetches up to 10 newest Inbox Unread Messages via the Gmail API (OAuth) and prints one Digest: an OpenAI-compatible AI summary plus From/Subject lines. Orchestration is testable with fake Gmail and summarizer ports. No application code lives under `skills/` or `docs/sdlc/`.

## Architecture

| File | Responsibility |
|------|----------------|
| `run-digest.js` | Orchestration. Calls Gmail and summarizer ports. No HTTP. |
| `body.js` | Prefer `text/plain`; else strip HTML tags; cap 4000 characters. |
| `gmail.js` | OAuth + Gmail REST. List and get only. Never modify messages. |
| `summarize.js` | One OpenAI-compatible chat completion. |
| `cli.js` | Env, stdout/stderr, exit codes. Wires real ports into `runDigest`. |
| `auth-gmail.js` | One-time OAuth helper that prints `GMAIL_REFRESH_TOKEN`. Not used by `npm start`. |
| `*.test.js` | `node --test` against `run-digest.js` and `body.js` with fakes. |
| `package.json` | `"type": "module"`. Scripts below. |

Scripts:

- `"test": "node --test"`
- `"start": "node cli.js"`
- `"auth": "node auth-gmail.js"`

Dependencies: only what `gmail.js` and `summarize.js` need for OAuth and HTTP (no CLI framework). `node --test` is the test runner. No TypeScript. No bundler.

## Components

### Message value

A message passed into `runDigest` / `summarize` is a plain object:

- `from`: string
- `subject`: string
- `body`: string (already passed through `body.js` rules, or raw parts for `body.js` itself)
- `receivedAt`: ISO-8601 string or epoch ms, used only to pick the 10 newest when the fake returns more than 10

### `body.js`

**`extractBody({ textPlain, textHtml })`**

- If `textPlain` is a non-empty string after trim, return it trimmed and sliced to 4000 characters.
- Else if `textHtml` is present, strip tags (replace tags with space, collapse whitespace), then trim and slice to 4000.
- Else return `""`.
- Do not include attachment or image bytes.

### `run-digest.js`

**`runDigest({ gmail, summarize })`**

`gmail` must implement `listUnreadInbox({ max })` and must **not** expose or call a modify/mark-read API from this function.

`summarize` must implement `summarize(messages)` and return a string (the Digest paragraph).

Behavior:

1. `messages = await gmail.listUnreadInbox({ max: 10 })`.
2. If the implementation returns more than 10, `runDigest` keeps the 10 newest by `receivedAt` descending.
3. If length is 0: return `{ ok: true, empty: true, stdout: "No unread messages in Inbox.\n" }`. Do not call `summarize`.
4. Otherwise map each message through `extractBody` if parts are present; build `lines` as `From: ${from} | Subject: ${subject}` one per message (same order as selected).
5. `summary = await summarize(preparedMessages)`.
6. Return `{ ok: true, empty: false, stdout: summary + "\n\n" + lines.join("\n") + "\n" }`.
7. If `gmail.listUnreadInbox` throws: return `{ ok: false, stage: "gmail", error }` with no Digest stdout.
8. If `summarize` throws: return `{ ok: false, stage: "ai", error, stdout: lines.join("\n") + "\n" }`.

### `gmail.js` (real port)

- Env: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`.
- Scope: `https://www.googleapis.com/auth/gmail.readonly`.
- `users.messages.list` with `q=is:unread in:inbox`, `maxResults=10`.
- `users.messages.get` with `format=full` for each id. Parse From, Subject, `text/plain` / `text/html` parts, internal date.
- No `modify`, `batchModify`, `trash`, or send APIs.

### `summarize.js` (real port)

- Env: `OPENAI_API_KEY` required. `OPENAI_BASE_URL` optional, default `https://api.openai.com/v1`. `OPENAI_MODEL` optional, default `gpt-4o-mini`.
- POST `{base}/chat/completions` with one user message containing From, Subject, and Body of each selected Unread Message. Ask for a short paragraph Digest.
- On non-2xx or network failure, throw.

### `cli.js`

- Read env. If a required var is missing: stderr `Missing env: <NAME>\n`, exit 1, empty stdout.
- Call `runDigest` with real `gmail` and `summarize`.
- `ok && empty` or `ok && !empty`: write `stdout` as returned, exit 0.
- `stage === "gmail"`: stderr `Gmail error: ${error.message}\n`, exit 1, empty stdout.
- `stage === "ai"`: write the From/Subject `stdout` from the result, stderr `AI error: ${error.message}\n`, exit 1.

### `auth-gmail.js`

Installed-app OAuth with a localhost redirect. Prints the refresh token to stdout. Operator pastes it into the environment. Do not write tokens into the repo.

## Data flow

```
npm start
  → cli env check
  → runDigest
       → gmail.listUnreadInbox (read-only)
       → 0?  print empty line, exit 0
       → extractBody each
       → summarize
       → print summary, blank line, From|Subject lines, exit 0

gmail throw → stderr Gmail error, exit 1
AI throw    → From|Subject on stdout, stderr AI error, exit 1
```

Each run is a fresh fetch. No Digest persistence. Messages stay unread.

## Error handling

| Case | stdout | stderr | exit |
|------|--------|--------|------|
| Digest | summary + blank line + From\|Subject lines | empty | 0 |
| Zero unread | `No unread messages in Inbox.` plus newline | empty | 0 |
| Missing env | empty | `Missing env: <NAME>` | 1 |
| Gmail/OAuth/API fail | empty | `Gmail error: …` | 1 |
| AI/HTTP fail | From\|Subject lines only | `AI error: …` | 1 |

No retries. No invented summary. Uncaught programmer errors may still crash with a non-zero exit.

## Testing

`npm test` in `email-summarizer/` runs `node --test`. Tests use fake `gmail` and `summarize`. CI must not require Google or OpenAI credentials.

Required cases (write failing tests first at Build):

1. Zero Unread Messages → empty stdout text as specified; `summarize` not called.
2. Three Unread Messages → `summarize` called once with those From/Subject/Body; stdout has summary then From\|Subject lines.
3. Twelve Unread Messages → only 10 newest reach `summarize`.
4. Gmail throws → `stage === "gmail"`; `summarize` not called.
5. Gmail ok, summarize throws → `stage === "ai"` and From\|Subject lines present.
6. After a successful list, fake Gmail has no modify/mark-read calls.
7. `extractBody`: prefers `text/plain`; HTML-only strips tags; result length ≤ 4000.

No Xray. No Playwright. No live-network tests in CI.

## Out of scope

- IMAP, app passwords, hosted service, daemon, sending mail, marking read
- Xray, TypeScript, CLI frameworks (oclif), config files for secrets
- Changes to `tic-tac-toe/`, `skills/`, or `flows/` except CT-75 artifacts and `docs/adr/0001-gmail-api-oauth.md`
