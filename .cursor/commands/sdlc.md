# /sdlc — Run the AI SDLC flow

You are the SDLC orchestrator. Run the flow defined in a JSON file under `flows/`,
one step at a time, with a human approval gate between steps.

## Arguments

`/sdlc [flow] [input]`

- `flow` — name of a file in `flows/` without `.json`. Default: `dev`.
  Only treat the first word as a flow name if `flows/<word>.json` exists.
- `input` — everything else: a Jira key (e.g. `PROJ-123`), free-text requirements,
  or `resume` to continue a paused run.
- No arguments → use `flows/dev.json` and ask for the input in the first step.

## Setup (before step 1)

1. Read `flows/<flow>.json`. Steps run strictly in array order. Each step has
   `name`, `description`, and `prompt`.
2. Resolve skills. A `$name` token in a step prompt means: read
   `skills/<name>/SKILL.md` and follow it. Resolve **all** skills for **all** steps
   now. If any file is missing, list the missing ones and ask the user for a
   substitute before starting. Never guess at what a missing skill does.
3. Pick the run slug: the Jira key if given, otherwise a short kebab-case name
   derived from the request. Artifacts go in `docs/sdlc/<slug>/`. Wherever a step
   prompt says `<slug>`, substitute this value.
4. If `input` is `resume`: read `docs/sdlc/*/STATUS.md`, ask which run to continue
   if there is more than one, and start from the first step not marked `done`.
5. Create one todo per step. Announce the flow:
   "Running flow `<flow>` — N steps: 1. <name> … N. <name>. Artifacts: `docs/sdlc/<slug>/`."

## Running each step

For step k of N:

1. Announce: `## Step k/N — <name>` followed by the step's `description`.
2. Read the skills referenced by this step's prompt (again — skills may have changed
   since setup). Announce "Using <skill> to <purpose>" for each.
3. Execute the step's `prompt` literally. The prompt is the authority for what the
   step does; this command only governs how steps are sequenced.
4. When the step's own exit condition is met, write the outcome to
   `docs/sdlc/<slug>/STATUS.md`:

   ```
   # <slug>
   flow: <flow>
   ## <step name> — done <YYYY-MM-DD>
   <3–6 line summary, links to any artifacts produced>
   ```

5. **Gate.** Summarise what the step produced and ask exactly one question:
   "Step k (<name>) complete. Proceed to step k+1 (<next name>)?"
   Then STOP and wait. Do not begin the next step in the same message as the
   question, even if the answer seems obvious.

## Rules

- Never skip, reorder, or merge steps. If a step seems unnecessary, say so at its
  gate and let the user decide.
- Ask one question at a time. Look up facts yourself; only decisions go to the user.
- Do not write application code before the step whose prompt tells you to build,
  and never without an approved plan and spec from the earlier steps.
- Any skill's own hard gates (e.g. brainstorming's approval gate) apply in addition
  to the step gates here — the stricter one wins.
- If the user says `stop` or `pause`, update `STATUS.md` with the current step
  marked `in-progress` and a note on where you left off, then stop.
- If the user changes their mind about an earlier step, go back to that step,
  redo it, and re-run every step after it. Do not patch later artifacts in place.

## Finish

After the last step's gate is approved, print a short run summary: slug, steps
completed, artifacts written, branch/worktree used. Then invoke
`skills/finishing-a-development-branch/SKILL.md` to decide how the work is
integrated (merge, PR, or cleanup).