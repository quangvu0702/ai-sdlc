# CT-75 Intent

Local CLI that prints a Digest of the Operator's newest Inbox Unread Messages. Origin: https://gfgroup.atlassian.net/browse/CT-75. Glossary: `CONTEXT.md` (repo root).

## In the originator's words

design an cli tool that can connect to gmail fetch the last 10 unread emails and use AI to summarize it

## What we mean by that

1. A **CLI** the **Operator** runs on their machine. It reads **their** Gmail. It is not a hosted product.
2. It fetches up to the 10 newest **Unread Messages** in the **Inbox** (by received time). Spam, Trash, and other labels are out.
3. If fewer than 10 Unread Messages exist, it uses all of them. If zero, it says so and does not call AI.
4. The **Digest** is one AI summary of those messages (each message contributes From, Subject, and **Body**) plus a one-line From/Subject for each.
5. Body is visible text only: no attachments, no images. HTML→text is a Design detail.
6. The CLI does not send mail and does not mark messages read. The same 10 can appear on every run until the Operator marks them read in Gmail.
7. If Gmail fails: stderr error, non-zero exit, no fake Digest. If Gmail works and AI fails: print the From/Subject lines, then stderr error, non-zero exit, no invented summary.

## Out of scope

- Xray test cases (in-repo automated tests instead)
- Sending or forwarding mail
- Marking messages read or unread
- Hosted service, daemon, or bot
- Non-Inbox sources (Spam, Trash, arbitrary labels)
- Attachments and images in the Digest

## Assumptions

- The `[test]` summary and the Xray Automation comment are a team template, not extra product scope.
- This SDLC repo already has `tic-tac-toe/`; the CLI is new work, not a change to that Game.
- The Operator will supply Gmail access and an AI credential on their machine. Secrets are not committed.
- Message Bodies are sent to the chosen AI in order to produce the Digest (privacy is accepted for this tool).

## Open for Design

- How the CLI authenticates to Gmail
- Which AI provider/model, and how the Operator supplies that credential
- Language, runtime, package layout, and CLI command name
- How HTML is stripped and whether/how Body is truncated
- Config and secrets file format
- How tests cover Gmail/AI without live accounts in CI

## Success criteria

A later stage can treat this as done when all of the following pass:

1. Run the CLI with Gmail access → it selects up to 10 newest Inbox Unread Messages (or fewer / zero as above).
2. On a successful run with at least one Unread Message → stdout has one Digest: AI summary plus From/Subject lines; messages stay unread.
3. Zero Unread Messages → a clear empty result, no AI call.
4. Gmail failure → stderr error, non-zero exit, no fake Digest.
5. AI failure after a successful Gmail fetch → From/Subject lines printed, stderr error, non-zero exit, no invented summary.
6. Automated tests fail if rules 3–5 (and the “do not mark read” rule) are broken, then pass when the CLI implements them.
