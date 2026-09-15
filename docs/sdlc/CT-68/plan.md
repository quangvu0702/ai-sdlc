# Tic-Tac-Toe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a local two-player 3×3 tic-tac-toe Game in the browser, with Node tests for the rules.

**Architecture:** Pure `game.js` is the source of truth (create / place / new Game). `ui.js` holds one Game and paints `index.html`. No bundler, no libraries.

**Tech Stack:** JavaScript ESM, `node --test`, `npx serve` for the static page.

**Spec:** `docs/sdlc/CT-68/spec.md`

## Global Constraints

- All Game code lives in `tic-tac-toe/` at the repo root. Do not add Game files under `skills/` or `docs/sdlc/`.
- `package.json` has `"type": "module"` and no `dependencies` or `devDependencies`.
- `"test": "node --test game.test.js"`
- `"start": "npx --yes serve ."` — Do not use `file://` (ES modules).
- Status text is exactly: `"X's turn"` / `"O's turn"` / `"X wins"` / `"O wins"` / `"Draw"`.
- New Game button labelled `New Game`.
- `placeMark` illegal cases return the **same object** `game` (no throw).
- Legal `placeMark` returns a **new** Game object with a **new** `board` array; do not mutate the input.
- No Playwright. No Xray. No unit tests for `ui.js`.
- Node is the only required toolchain.

## File structure

- Create: `tic-tac-toe/package.json` — ESM + scripts
- Create: `tic-tac-toe/game.js` — `createGame`, `placeMark`, `newGame`
- Create: `tic-tac-toe/game.test.js` — Node tests
- Create: `tic-tac-toe/index.html` — Board, `#status`, `#new-game`
- Create: `tic-tac-toe/ui.js` — DOM bindings

---

### Task 1: Scaffold and `createGame`

**Files:**
- Create: `tic-tac-toe/package.json`
- Create: `tic-tac-toe/game.test.js`
- Create: `tic-tac-toe/game.js`
- Test: `tic-tac-toe/game.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `createGame(): { board: (null|"X"|"O")[], turn: "X"|"O", outcome: "playing"|"X"|"O"|"draw" }` with `board` length 9, all `null`, `turn === "X"`, `outcome === "playing"`

- [x] **Step 1: Create `tic-tac-toe/package.json`**

```json
{
  "name": "tic-tac-toe",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test game.test.js",
    "start": "npx --yes serve ."
  }
}
```

- [x] **Step 2: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './game.js';

test('createGame returns empty board, X turn, playing', () => {
  const game = createGame();
  assert.deepEqual(game.board, [null, null, null, null, null, null, null, null, null]);
  assert.equal(game.turn, 'X');
  assert.equal(game.outcome, 'playing');
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `cd tic-tac-toe && npm test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./game.js` (file missing).

- [x] **Step 4: Write minimal implementation**

```js
export function createGame() {
  return {
    board: [null, null, null, null, null, null, null, null, null],
    turn: 'X',
    outcome: 'playing',
  };
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `cd tic-tac-toe && npm test`

Expected: PASS (1 test).

- [x] **Step 6: Commit**

```bash
git add tic-tac-toe/package.json tic-tac-toe/game.js tic-tac-toe/game.test.js
git commit -m "$(cat <<'EOF'
feat(tic-tac-toe): add createGame and Node test harness

EOF
)"
```

---

### Task 2: `placeMark` legal and illegal

**Files:**
- Modify: `tic-tac-toe/game.test.js`
- Modify: `tic-tac-toe/game.js`
- Test: `tic-tac-toe/game.test.js`

**Interfaces:**
- Consumes: `createGame()` from Task 1
- Produces: `placeMark(game, index): game`. Legal: new object, new `board`, Cell set to `game.turn`, `turn` flipped, `outcome` still `"playing"` for a non-winning placement. Illegal (occupied, index not an integer 0–8, or `outcome !== "playing"`): same object, no throw.

- [x] **Step 1: Write the failing tests**

Append to `tic-tac-toe/game.test.js` (keep the existing import of `createGame`; add `placeMark`):

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, placeMark } from './game.js';

test('createGame returns empty board, X turn, playing', () => {
  const game = createGame();
  assert.deepEqual(game.board, [null, null, null, null, null, null, null, null, null]);
  assert.equal(game.turn, 'X');
  assert.equal(game.outcome, 'playing');
});

test('placeMark on empty cell writes the mark and flips turn', () => {
  const start = createGame();
  const next = placeMark(start, 0);
  assert.notEqual(next, start);
  assert.notEqual(next.board, start.board);
  assert.equal(next.board[0], 'X');
  assert.equal(start.board[0], null);
  assert.equal(next.turn, 'O');
  assert.equal(next.outcome, 'playing');
});

test('placeMark on occupied cell returns the same object', () => {
  const start = createGame();
  const afterX = placeMark(start, 4);
  const again = placeMark(afterX, 4);
  assert.equal(again, afterX);
  assert.equal(afterX.board[4], 'X');
});

test('placeMark with out-of-range index returns the same object', () => {
  const start = createGame();
  assert.equal(placeMark(start, -1), start);
  assert.equal(placeMark(start, 9), start);
  assert.equal(placeMark(start, 1.5), start);
  assert.deepEqual(start.board, [null, null, null, null, null, null, null, null, null]);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd tic-tac-toe && npm test`

Expected: FAIL — `placeMark` is not exported / not a function.

- [x] **Step 3: Write minimal implementation**

Replace `tic-tac-toe/game.js` with:

```js
export function createGame() {
  return {
    board: [null, null, null, null, null, null, null, null, null],
    turn: 'X',
    outcome: 'playing',
  };
}

export function placeMark(game, index) {
  if (game.outcome !== 'playing') return game;
  if (!Number.isInteger(index) || index < 0 || index > 8) return game;
  if (game.board[index] !== null) return game;
  const board = game.board.slice();
  board[index] = game.turn;
  return {
    board,
    turn: game.turn === 'X' ? 'O' : 'X',
    outcome: 'playing',
  };
}
```

Do not add Win/Draw detection yet. Task 3 tests will force that.

- [x] **Step 4: Run test to verify it passes**

Run: `cd tic-tac-toe && npm test`

Expected: PASS (all tests so far).

- [x] **Step 5: Commit**

```bash
git add tic-tac-toe/game.js tic-tac-toe/game.test.js
git commit -m "$(cat <<'EOF'
feat(tic-tac-toe): placeMark legal move and silent no-ops

EOF
)"
```

---

### Task 3: Win and Draw outcomes

**Files:**
- Modify: `tic-tac-toe/game.test.js`
- Modify: `tic-tac-toe/game.js`
- Test: `tic-tac-toe/game.test.js`

**Interfaces:**
- Consumes: `createGame()`, `placeMark(game, index)` from Tasks 1–2
- Produces: after a legal placement, `outcome` is `"X"` or `"O"` if any Line is three of that Mark; `"draw"` if the Board is full and there is no Line; otherwise `"playing"`. A placement that fills the Board and completes a Line is a Win. After a Win or Draw, `turn` stays as the Player who just placed. `placeMark` after a Win or Draw returns the same object.

Winning Lines: `[0,1,2]`, `[3,4,5]`, `[6,7,8]`, `[0,3,6]`, `[1,4,7]`, `[2,5,8]`, `[0,4,8]`, `[2,4,6]`.

- [x] **Step 1: Write the failing tests**

The file must be the Task 2 tests plus the following (full file so this task can be implemented alone):

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, placeMark } from './game.js';

function play(indexes) {
  let game = createGame();
  for (const index of indexes) {
    game = placeMark(game, index);
  }
  return game;
}

test('createGame returns empty board, X turn, playing', () => {
  const game = createGame();
  assert.deepEqual(game.board, [null, null, null, null, null, null, null, null, null]);
  assert.equal(game.turn, 'X');
  assert.equal(game.outcome, 'playing');
});

test('placeMark on empty cell writes the mark and flips turn', () => {
  const start = createGame();
  const next = placeMark(start, 0);
  assert.notEqual(next, start);
  assert.notEqual(next.board, start.board);
  assert.equal(next.board[0], 'X');
  assert.equal(start.board[0], null);
  assert.equal(next.turn, 'O');
  assert.equal(next.outcome, 'playing');
});

test('placeMark on occupied cell returns the same object', () => {
  const start = createGame();
  const afterX = placeMark(start, 4);
  const again = placeMark(afterX, 4);
  assert.equal(again, afterX);
  assert.equal(afterX.board[4], 'X');
});

test('placeMark with out-of-range index returns the same object', () => {
  const start = createGame();
  assert.equal(placeMark(start, -1), start);
  assert.equal(placeMark(start, 9), start);
  assert.equal(placeMark(start, 1.5), start);
  assert.deepEqual(start.board, [null, null, null, null, null, null, null, null, null]);
});

test('three in a row is a win for that player', () => {
  const game = play([0, 3, 1, 4, 2]);
  assert.equal(game.outcome, 'X');
  assert.equal(game.turn, 'X');
});

test('three in a column is a win for that player', () => {
  const game = play([0, 1, 3, 2, 6]);
  assert.equal(game.outcome, 'X');
});

test('three on a diagonal is a win for that player', () => {
  const game = play([0, 1, 4, 2, 8]);
  assert.equal(game.outcome, 'X');
});

test('placeMark after a win returns the same object', () => {
  const won = play([0, 3, 1, 4, 2]);
  const again = placeMark(won, 8);
  assert.equal(again, won);
  assert.equal(won.board[8], null);
});

test('full board with no line is a draw', () => {
  const game = play([0, 1, 2, 4, 3, 5, 7, 6, 8]);
  assert.equal(game.outcome, 'draw');
  assert.deepEqual(game.board, ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']);
});

test('full board that completes a line is a win not a draw', () => {
  const game = play([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(game.outcome, 'X');
  assert.notEqual(game.outcome, 'draw');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd tic-tac-toe && npm test`

Expected: FAIL — row-win test: `outcome` is `'playing'`, expected `'X'`.

- [x] **Step 3: Write minimal implementation**

Replace `tic-tac-toe/game.js` with:

```js
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createGame() {
  return {
    board: [null, null, null, null, null, null, null, null, null],
    turn: 'X',
    outcome: 'playing',
  };
}

function outcomeFor(board) {
  for (const [a, b, c] of LINES) {
    const mark = board[a];
    if (mark !== null && mark === board[b] && mark === board[c]) return mark;
  }
  if (board.every((cell) => cell !== null)) return 'draw';
  return 'playing';
}

export function placeMark(game, index) {
  if (game.outcome !== 'playing') return game;
  if (!Number.isInteger(index) || index < 0 || index > 8) return game;
  if (game.board[index] !== null) return game;
  const board = game.board.slice();
  board[index] = game.turn;
  const outcome = outcomeFor(board);
  return {
    board,
    turn: outcome === 'playing' ? (game.turn === 'X' ? 'O' : 'X') : game.turn,
    outcome,
  };
}
```

Win is checked before Draw inside `outcomeFor`.

- [x] **Step 4: Run test to verify it passes**

Run: `cd tic-tac-toe && npm test`

Expected: PASS (all tests so far).

- [x] **Step 5: Commit**

```bash
git add tic-tac-toe/game.js tic-tac-toe/game.test.js
git commit -m "$(cat <<'EOF'
feat(tic-tac-toe): detect win lines and draws

EOF
)"
```

---

### Task 4: `newGame`

**Files:**
- Modify: `tic-tac-toe/game.test.js`
- Modify: `tic-tac-toe/game.js`
- Test: `tic-tac-toe/game.test.js`

**Interfaces:**
- Consumes: `createGame()`, `placeMark(game, index)` from Tasks 1–3
- Produces: `newGame():` same shape as `createGame()` — empty Board, `turn === "X"`, `outcome === "playing"`

- [ ] **Step 1: Write the failing test**

Add this import and test to `tic-tac-toe/game.test.js`. Change the import line to:

```js
import { createGame, placeMark, newGame } from './game.js';
```

Add:

```js
test('newGame after a finished game returns an empty playing board with X turn', () => {
  const won = play([0, 3, 1, 4, 2]);
  const fresh = newGame();
  assert.notEqual(fresh, won);
  assert.deepEqual(fresh.board, [null, null, null, null, null, null, null, null, null]);
  assert.equal(fresh.turn, 'X');
  assert.equal(fresh.outcome, 'playing');
});
```

Keep `play` and every earlier test in the file unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tic-tac-toe && npm test`

Expected: FAIL — `newGame` is not exported / not a function.

- [ ] **Step 3: Write minimal implementation**

Add to `tic-tac-toe/game.js` (do not change `createGame`, `placeMark`, `outcomeFor`, or `LINES`):

```js
export function newGame() {
  return createGame();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tic-tac-toe && npm test`

Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add tic-tac-toe/game.js tic-tac-toe/game.test.js
git commit -m "$(cat <<'EOF'
feat(tic-tac-toe): add newGame

EOF
)"
```

---

### Task 5: Browser UI

**Files:**
- Create: `tic-tac-toe/index.html`
- Create: `tic-tac-toe/ui.js`
- Test: no new unit tests (spec: no unit tests for `ui.js`). Re-run `npm test` to confirm `game.js` is unchanged.

**Interfaces:**
- Consumes: `createGame()`, `placeMark(game, index)`, `newGame()` from `./game.js`
- Produces: page that renders one Game: nine `<button data-index>` Cells, `#status`, `#new-game`

- [ ] **Step 1: Create `tic-tac-toe/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Tic-Tac-Toe</title>
    <style>
      #board {
        display: grid;
        grid-template-columns: repeat(3, 80px);
        grid-template-rows: repeat(3, 80px);
        gap: 4px;
      }
      #board button {
        font-size: 2rem;
      }
    </style>
  </head>
  <body>
    <p id="status"></p>
    <div id="board">
      <button type="button" data-index="0"></button>
      <button type="button" data-index="1"></button>
      <button type="button" data-index="2"></button>
      <button type="button" data-index="3"></button>
      <button type="button" data-index="4"></button>
      <button type="button" data-index="5"></button>
      <button type="button" data-index="6"></button>
      <button type="button" data-index="7"></button>
      <button type="button" data-index="8"></button>
    </div>
    <button type="button" id="new-game">New Game</button>
    <script type="module" src="./ui.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `tic-tac-toe/ui.js`**

```js
import { createGame, placeMark, newGame } from './game.js';

let game = createGame();
const statusEl = document.querySelector('#status');
const newGameEl = document.querySelector('#new-game');
const cells = [...document.querySelectorAll('#board [data-index]')];

function statusText(current) {
  if (current.outcome === 'playing') return `${current.turn}'s turn`;
  if (current.outcome === 'draw') return 'Draw';
  return `${current.outcome} wins`;
}

function render() {
  for (const cell of cells) {
    const mark = game.board[Number(cell.dataset.index)];
    cell.textContent = mark === null ? '' : mark;
  }
  statusEl.textContent = statusText(game);
}

for (const cell of cells) {
  cell.addEventListener('click', () => {
    game = placeMark(game, Number(cell.dataset.index));
    render();
  });
}

newGameEl.addEventListener('click', () => {
  game = newGame();
  render();
});

render();
```

Status strings must be `X's turn`, `O's turn`, `X wins`, `O wins`, `Draw`. No `alert`. No `console` on illegal clicks.

- [ ] **Step 3: Run tests to verify they still pass**

Run: `cd tic-tac-toe && npm test`

Expected: PASS (unchanged `game.js` tests).

- [ ] **Step 4: Commit**

```bash
git add tic-tac-toe/index.html tic-tac-toe/ui.js
git commit -m "$(cat <<'EOF'
feat(tic-tac-toe): add browser board UI

EOF
)"
```

Manual check after Build (not a unit test): `cd tic-tac-toe && npm start`, open the printed URL, confirm a 3×3 Board, X’s turn, a Win, a Draw, and New Game.

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| `package.json` ESM, `test`, `start`, no deps | 1 |
| `createGame` empty Board, X, playing | 1 |
| Legal `placeMark` new object, new board, flip turn | 2 |
| Illegal occupied / bad index → same object | 2 |
| Win row, column, diagonal | 3 |
| `placeMark` after Win → same object | 3 |
| Draw on full Board, no Line | 3 |
| Full Board + Line → Win not Draw | 3 |
| `turn` stays on the Player who won | 3 (row-win asserts `turn === "X"`) |
| `newGame` | 4 |
| `index.html` + `ui.js` status copy, New Game, silent clicks | 5 |
| No Playwright / Xray / ui unit tests | 5 |
