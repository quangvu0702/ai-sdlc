# CT-68 Intent

Playable two-player tic-tac-toe in the browser. Origin: https://gfgroup.atlassian.net/browse/CT-68. Glossary: `docs/sdlc/CT-68/CONTEXT.md`.

## In the originator's words

I want to build a tic tac toe game.

## What we mean by that

1. A local two-player 3×3 **Game** in the browser. Two humans share one **Board**. No computer Player.
2. Code lives in `tic-tac-toe/` at the repo root. Do not put game code in `skills/` or `docs/sdlc/`.
3. Classic rules: **Mark** X takes the first **Turn**; Players alternate; a **Line** of three identical Marks is a **Win**; a full Board with no Win is a **Draw**.
4. After a Win or Draw, Cells ignore clicks and the page shows the outcome. **New Game** clears the Board and starts with X.
5. Occupied Cells ignore clicks. The page shows whose Turn it is.

## Out of scope

- Xray test cases (in-repo automated tests instead)
- AI / computer opponent
- Accounts, network, multi-browser play
- Score history, animations, extra modes (misère, larger Board)

## Assumptions

- This SDLC repo has no existing app; the Game is new work in `tic-tac-toe/`.
- "Test case at Xray" from Jira Automation is a team template, not a requirement for this `[test]` ticket.
- A static page plus tests is enough; framework choice is a Design decision, not intent.

## Success criteria

A later stage can treat this as done when all of the following pass:

1. Open the Game in a browser → a 3×3 Board is visible and X's Turn is shown.
2. Place Marks in empty Cells only → occupied Cells and post-Win/Draw Cells do not change.
3. Make three in a Line → the page reports that Player's Win and further Cell clicks do nothing.
4. Fill the Board with no Line → the page reports a Draw.
5. Use New Game after a Win or Draw → Board is empty and it is X's Turn.
6. Automated tests in `tic-tac-toe/` fail if any of rules 2–5 are broken, then pass when the Game implements them.
