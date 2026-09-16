# ai-sdlc

A step-by-step software development lifecycle (SDLC) that an AI coding agent runs **with you, one step at a time**. Works in **Cursor**, **Claude Code**, and **Codex**.

You type `/sdlc CT-68`. The agent fetches the ticket, interviews you about intent, designs the solution with you, builds it with tests, reviews it, and opens a pull request. After every step it stops and asks for your approval. Every step leaves a file behind, so you can resume, audit, or redo any part later.

## Contents

- [How it works in 30 seconds](#how-it-works-in-30-seconds)
- [Quick start](#quick-start)
- [The `dev` flow, step by step](#the-dev-flow-step-by-step)
- [What you say at each gate](#what-you-say-at-each-gate)
- [Where the files go](#where-the-files-go)
- [Install into your own repo](#install-into-your-own-repo)
- [Customize](#customize)
- [Repo layout](#repo-layout)
- [Troubleshooting](#troubleshooting)
- [Sources](#sources)

## How it works in 30 seconds

Three kinds of files do all the work:

```text
flows/dev.json            WHAT to do, in order        (7 steps, each with a prompt)
skills/*/SKILL.md         HOW to do each step         (reusable agent instructions)
docs/sdlc/<slug>/*.md     WHAT HAPPENED                (artifacts + STATUS.md log)
```

The `/sdlc` command is the **orchestrator** ([`skills/sdlc/SKILL.md`](skills/sdlc/SKILL.md)). It:

1. Reads the flow file and runs the steps strictly in order.
2. When a step prompt says `$brainstorming`, it reads `skills/brainstorming/SKILL.md` and follows it.
3. After each step, writes the outcome to `docs/sdlc/<slug>/STATUS.md`, then **stops and asks** before continuing.

```text
 you ──► /sdlc CT-68
            │
            ▼
   ┌──────────────────┐   reads    ┌────────────────┐
   │ skills/sdlc      │──────────► │ flows/dev.json │
   │ (orchestrator)   │            └────────────────┘
   └────────┬─────────┘
            │  for each step:
            │    read the $skills the prompt names
            │    do the step
            │    write docs/sdlc/CT-68/STATUS.md
            │    ask "Proceed to step k+1?"  ◄── you answer
            ▼
   requirements.md → intent.md → spec.md + plan.md → Jira → code → review → PR
```

The flow file is the authority for **what** each step does. The orchestrator only controls **sequencing and gates**.

## Quick start

1. Open this repo in Cursor, Claude Code, or Codex.
2. Run `/sdlc` (Codex also accepts `$sdlc`). In an already-open Claude Code session run `/reload-skills` first.
3. When asked, give a **Jira key** (`CT-68`), a **URL**, or a **one-line description** of the work.
4. Read what the agent produced, then answer `yes` to move to the next step.

Other ways to start:

```text
/sdlc CT-68                 # dev flow, Jira issue CT-68 (slug = CT-68)
/sdlc add login API         # dev flow, free-text requirements (slug derived from text)
/sdlc dev CT-68             # same as the first line, flow named explicitly
/sdlc resume                # continue a paused run from its STATUS.md
```

The first word is a flow name only if `flows/<word>.json` exists. Otherwise it is part of your input.

**Prerequisites**

- Cursor, Claude Code, or Codex
- Git (branches, commits, and worktrees during Build)
- Atlassian MCP connected, if you want Jira fetch and Jira sync (steps 1 and 4)

## The `dev` flow, step by step

Defined in [`flows/dev.json`](flows/dev.json). Seven steps, always in this order. Each row says what the agent needs, what it does, and what file it leaves behind.

| # | Step | The agent... | You get |
|---|------|--------------|---------|
| 1 | **Get Jira / Requirements** | Fetches the Jira issue (or takes your text), saves it verbatim, and reads it back to you. | `requirements.md` |
| 2 | **Intent** | Interviews you about **what** and **why** only (`grill-with-docs`). Parks every **how** question for Design. Adds glossary terms to root `CONTEXT.md`. | `intent.md` |
| 3 | **Design** | Brainstorms approaches with you, writes the spec, then a TDD plan. Records big decisions as ADRs. Scores the plan against the Karpathy guidelines and revises until the average is 8/10 or higher. | `spec.md`, `plan.md`, `docs/adr/*` |
| 4 | **Sync to Jira** | Creates one Jira issue (or subtasks under your ticket) per plan task. Safe to re-run: existing keys are updated, not duplicated. | Jira keys in `STATUS.md` |
| 5 | **Build** | Creates a git worktree and feature branch, then implements the plan task by task with tests first. One commit per task. | Feature branch, commits |
| 6 | **Local Review** | Reviews the diff on two axes: repo standards and the spec. Walks you through findings one at a time: `fix`, `defer`, or `dismiss`. | Review fixes committed |
| 7 | **Push & Open PR** | Pushes the branch, opens a PR against the base, and keeps it merge-ready (`babysit`). Never merges. | Pull request |

After step 7 the agent prints a run summary and offers cleanup only (remove the worktree; delete the local branch once the PR is merged).

**Hard rules the agent follows**

- No application code before **Build**, and never without an approved `spec.md` and `plan.md`.
- Steps are never skipped, reordered, or merged unless you decide so at a gate.
- Facts are looked up by the agent. Only **decisions** come to you, one question at a time.

## What you say at each gate

After every step the agent asks exactly one question, for example:

> Step 3 (Design) complete. Proceed to step 4 (Sync to Jira)?

| You say | What happens |
|---------|--------------|
| `yes` / `proceed` | Next step starts. |
| `stop` or `pause` | Agent marks the step `in-progress` in `STATUS.md` and stops. Come back later with `/sdlc resume`. |
| `skip step 4` | Agent skips it. You own that decision, and it is recorded. |
| `go back to Intent` | Agent redoes that step and **re-runs every step after it**. Downstream files are regenerated, never patched. |
| `approved` | Used inside Intent and Design to close the interview or design loop. |

## Where the files go

For a run with slug `CT-68`:

```text
docs/sdlc/CT-68/
  requirements.md     raw Jira issue or your text          (step 1)
  intent.md           what, why, out of scope, success     (step 2)
  spec.md             approved design                      (step 3)
  plan.md             TDD implementation plan              (step 3)
  STATUS.md           one dated entry per step; resume here

docs/adr/             architecture decision records        (step 3)
CONTEXT.md            domain glossary, repo root           (step 2)
```

`STATUS.md` looks like this and is what `/sdlc resume` reads:

```markdown
# CT-68
flow: dev
## Get Jira/Requirements — done 2026-09-15 14:56 +0700
Fetched CT-68 from Jira. Saved to requirements.md.
## Intent — done 2026-09-15 15:20 +0700
...
```

## Install into your own repo

```bash
./install.sh /path/to/your-repo
```

This copies `skills/` and `flows/`, adds `CLAUDE.md` and `AGENTS.md`, wires `/sdlc` for all three tools via symlinks, and creates empty `docs/sdlc/` and `docs/adr/`. Then open your repo in your tool and run `/sdlc`.

Use `--force` to overwrite existing `flows/*.json`, `CLAUDE.md`, `AGENTS.md`, and the Cursor rule.

## Customize

**Change what a step does.** Edit its `prompt` in [`flows/dev.json`](flows/dev.json). The prompt is the authority; nothing else needs to change.

**Add a flow.**

1. Copy `flows/dev.json` to `flows/my-flow.json`.
2. Edit the `steps` array. Each step needs `name`, `description`, and `prompt`.
3. Reference skills as `$skill-name`. Each must exist at `skills/<skill-name>/SKILL.md`.
4. Run `/sdlc my-flow YOUR-INPUT`.

**Add or edit a skill.** Work only under [`skills/`](skills/). The `.cursor/`, `.claude/`, and `.agents/` folders are symlinks into it, so never copy skill text there. See `skills/writing-skills/` for the format.

**Skills used by the `dev` flow**

| Skill | Used in | Purpose |
|-------|---------|---------|
| `grill-with-docs` | Intent | Interview until the what and why are clear |
| `brainstorming`, `writing-plans`, `domain-modeling`, `karpathy-guidelines` | Design | Explore approaches, write spec and plan, record ADRs, score the plan |
| `using-git-worktrees`, `subagent-driven-development`, `test-driven-development` | Build | Isolated branch, one task at a time, tests first |
| `code-review` | Local Review | Standards and spec review in parallel |
| `babysit`, `finishing-a-development-branch` | Push & PR, Finish | Keep the PR green, clean up |

The other skills in `skills/` (`systematic-debugging`, `receiving-code-review`, `caveman`, `i-have-adhd`, ...) are available to call directly by name.

## Repo layout

```text
skills/                        edit skills and /sdlc here only
  sdlc/SKILL.md                orchestrator: sequencing and gates
  */SKILL.md                   one folder per skill
flows/dev.json                 the 7-step dev flow
docs/sdlc/<slug>/              per-run artifacts (created by runs)
docs/adr/                      architecture decision records
CLAUDE.md                      always-on instructions for Claude Code
AGENTS.md                      always-on instructions for Codex
install.sh                     copy the kit into another repo

.cursor/skills   -> skills/    .cursor/commands/sdlc.md -> skills/sdlc/SKILL.md
.claude/skills   -> skills/    .claude/commands/sdlc.md -> skills/sdlc/SKILL.md
.agents/skills   -> skills/
```

## Troubleshooting

- **`/sdlc` is not recognised in Claude Code.** Run `/reload-skills`, or restart the session.
- **Step 1 or 4 fails on Jira.** Connect the Atlassian MCP in your tool, or give free-text requirements instead of a key and skip step 4 at its gate.
- **Agent says a skill is missing.** A `$name` in a flow prompt has no `skills/<name>/SKILL.md`. Create it or change the prompt.
- **Lost track of a run.** Run `/sdlc resume`. It lists every `docs/sdlc/*/STATUS.md` and continues at the first step not marked `done`.
- **Want to redo an early step.** Say `go back to <step name>` at any gate. Do not hand-edit later artifacts.

## Sources

Most of the skills in `skills/` are borrowed, then trimmed and adapted to fit this flow. Credit where it is due:

| Upstream | License | Skills taken from it |
|----------|---------|----------------------|
| [obra/superpowers](https://github.com/obra/superpowers) — Jesse Vincent and the team at Prime Radiant | MIT | `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`, `test-driven-development`, `systematic-debugging`, `using-git-worktrees`, `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch`, `writing-skills` |
| [mattpocock/skills](https://github.com/mattpocock/skills) — Matt Pocock | see repo | `grill-me`, `grill-with-docs`, `domain-modeling`, `code-review` |
| [Andrej Karpathy's notes on LLM coding pitfalls](https://x.com/karpathy/status/2015883857489522876) | — | `karpathy-guidelines` |

The remaining pieces — `sdlc` (the orchestrator), `flows/dev.json`, `babysit`, `caveman`, `i-have-adhd` — are this repo's own or have no upstream we tracked. Text may have drifted from the originals; go to the upstream repos for the canonical versions.

## Contributors

- quy.tran
- vu.le
