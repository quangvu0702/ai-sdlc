# test-ai-sdlc

An AI-assisted software development lifecycle (SDLC) workflow for Cursor. Flows are JSON step lists; agents read **skills** for how to work; each run writes version-controlled artifacts under `docs/sdlc/<slug>/`.

This repo also contains a sample deliverable from a completed run: a two-player tic-tac-toe game in [`tic-tac-toe/`](tic-tac-toe/).

## What you get

| Piece | Purpose |
|-------|---------|
| [`flows/`](flows/) | Step definitions (name, description, prompt) |
| [`skills/`](skills/) | Reusable agent instructions (TDD, brainstorming, code review, …) |
| [`.cursor/commands/sdlc.md`](.cursor/commands/sdlc.md) | Cursor command that orchestrates a flow |
| [`docs/sdlc/<slug>/`](docs/sdlc/) | Per-run artifacts and progress |

Each run produces a traceable paper trail: requirements → intent → spec → plan → code → review.

## Prerequisites

- **Cursor** with agent chat and custom commands enabled
- **Git** for branches, commits, and worktrees during Build
- **Node.js** (for projects that use it; the sample game uses `node --test`)
- **Atlassian MCP** (optional but recommended) for Jira fetch and subtask sync in the `dev` flow

Skills live in [`skills/`](skills/). [`.cursor/skills`](.cursor/skills) is a symlink to that folder — add or edit skills there only.

## Quick start

1. Open this repo in Cursor.
2. Start a chat and run:

   ```
   /sdlc
   ```

3. When asked, give a **Jira key** (e.g. `CT-68`), a **URL**, or a **short description** of the work.
4. Approve each step when the agent asks: *"Step k complete. Proceed to step k+1?"*
5. Artifacts appear under `docs/sdlc/<slug>/`. Progress is recorded in `docs/sdlc/<slug>/STATUS.md`.

### Other invocations

```text
/sdlc CT-68              # default dev flow, Jira issue CT-68
/sdlc dev add login API  # free-text requirements, slug derived from text
/sdlc resume             # continue a paused run (reads STATUS.md files)
```

Only treat the first word as a flow name if `flows/<word>.json` exists; otherwise it is part of the input.

## The `dev` flow (7 steps)

Defined in [`flows/dev.json`](flows/dev.json). Steps run **in order**. The agent stops after each step until you say to continue.

| # | Step | What happens |
|---|------|----------------|
| 1 | **Get Jira/Requirements** | Fetch issue via Atlassian MCP or capture your text → `requirements.md` |
| 2 | **Intent** | Grill the *what and why* (`grill-with-docs`) → `intent.md`; glossary terms → root `CONTEXT.md`; *how* questions parked for Design |
| 3 | **Design** | Brainstorm from `intent.md` → approved `spec.md` and `plan.md`; ADRs → `docs/adr/`; `plan.md` scored vs Karpathy guidelines (average ≥ 8) |
| 4 | **Sync to Jira** | Create or update a Jira issue per plan task (Atlassian MCP); idempotent on re-run; keys recorded in `STATUS.md` |
| 5 | **Build** | Worktree + feature branch; base branch recorded in `STATUS.md`; subagent-driven TDD, one commit per task |
| 6 | **Local Review** | Two-axis review (standards + spec) against the recorded base; fix / defer / dismiss per finding |
| 7 | **Push & Open PR** | Push branch, open PR against the base, keep it merge-ready with `babysit`; no merge |

Skills referenced in prompts use a `$name` token → read [`skills/<name>/SKILL.md`](skills/). The orchestrator resolves all skills before step 1.

**Hard rules (from the command):**

- No application code before **Build**, and not without an approved spec and plan.
- Do not skip, reorder, or merge steps without your explicit decision at a gate.
- Skill-level gates (e.g. brainstorming approval) apply on top of step gates.
- Say `stop` or `pause` to halt; the agent updates `STATUS.md` and waits.
- To redo an earlier step, go back and re-run everything after it — do not patch downstream artifacts in place.

After the last step, the agent summarizes the run and runs `finishing-a-development-branch` for cleanup only (remove the worktree; delete the local branch once the PR is merged). Push and PR are owned by step 7, so Finish does not offer merge or PR again. The outcome is appended to `STATUS.md` as `## Finish`.

## Run artifacts

For slug `CT-68`, see [`docs/sdlc/CT-68/`](docs/sdlc/CT-68/):

| File | Contents |
|------|----------|
| `requirements.md` | Raw Jira / user input |
| `intent.md` | Captured intent, out-of-scope list, success criteria, open questions for Design |
| `CONTEXT.md` | Domain glossary (CT-68 run; newer runs write to the repo root `CONTEXT.md`) |
| `spec.md` | Approved design |
| `plan.md` | TDD implementation plan |
| `STATUS.md` | Step-by-step log (resume from here) |

## Sample application: tic-tac-toe

Built during the [CT-68](docs/sdlc/CT-68/) run (Jira test ticket).

```bash
cd tic-tac-toe
npm test    # 12 Node tests for game rules
npm start   # static server — open the printed URL (not file://)
```

Layout: pure rules in `game.js`, DOM in `ui.js`, page in `index.html`.

## Repo layout

```text
.cursor/
  commands/sdlc.md    # /sdlc orchestrator
  skills → ../skills  # symlink
flows/
  dev.json            # default flow
skills/
  */SKILL.md          # agent skills ($name in flow prompts)
docs/sdlc/<slug>/     # per-run artifacts
tic-tac-toe/          # example shipped code
```

## Add or change a flow

1. Copy [`flows/dev.json`](flows/dev.json) to `flows/my-flow.json`.
2. Edit the `steps` array: each step needs `name`, `description`, and `prompt`.
3. Reference skills as `$skill-name` (must exist under `skills/<skill-name>/SKILL.md`).
4. Run: `/sdlc my-flow YOUR-INPUT`

Keep prompts as the authority for *what* a step does; the command in `.cursor/commands/sdlc.md` only governs *sequencing and gates*.

## Tips for developers

- **Jira:** Connect the Atlassian plugin MCP in Cursor before runs that fetch or sync issues.
- **Resume:** `/sdlc resume` — agent picks the run from `docs/sdlc/*/STATUS.md`, takes the flow from its `flow:` line, and continues at the first step not marked `done`.
- **Isolation:** Build steps may use a git worktree (see `using-git-worktrees` skill). `.worktrees/` is gitignored.
- **Review findings:** Local Review asks `fix`, `defer`, or `dismiss` one finding at a time — answer literally.
- **Commits:** The agent commits during Build and after approved review fixes; you choose merge vs PR at the end.

## Related docs

- [`.cursor/commands/sdlc.md`](.cursor/commands/sdlc.md) — full orchestrator rules
- [`docs/sdlc/CT-68/STATUS.md`](docs/sdlc/CT-68/STATUS.md) — example completed run
