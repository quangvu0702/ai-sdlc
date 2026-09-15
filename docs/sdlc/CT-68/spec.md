# CT-68 Spec: Tic-Tac-Toe

**Intent:** `docs/sdlc/CT-68/intent.md`  
**Glossary:** `docs/sdlc/CT-68/CONTEXT.md`  
**Issue:** https://gfgroup.atlassian.net/browse/CT-68

A local two-player 3×3 Game in the browser. Rules live in a pure JS module. The page only renders that module. Tests run in Node, not in a browser.

## Architecture

All Game code lives in `tic-tac-toe/` at the repo root. Do not add Game files under `skills/` or `docs/sdlc/`.

| File | Responsibility |
|------|----------------|
| `game.js` | Rules. No DOM, no `window`. |
| `game.test.js` | `node --test` against `game.js`. |
| `ui.js` | Holds one Game, binds clicks, paints the Board and status. |
| `index.html` | Markup for nine Cells, status line, New Game. Loads `ui.js` as a module. |
| `package.json` | `"type": "module"`. Scripts below. No `dependencies` or `devDependencies`. |

Scripts:

- `"test": "node --test game.test.js"`
- `"start": "npx --yes serve ."` — prints a URL. Open that URL. Do not use `file://` (ES modules).

Node is the only required toolchain. `serve` is fetched on demand by `npx`, not checked in.

## Components

### Game value

A Game is a plain object:

- `board`: array of 9, each `null` | `"X"` | `"O"`. Index 0 is top-left, then row-major (1 top-middle … 8 bottom-right).
- `turn`: `"X"` | `"O"` — whose Mark is next if `outcome === "playing"`.
- `outcome`: `"playing"` | `"X"` | `"O"` | `"draw"`. `"X"` / `"O"` means that Player has a Win.

### `game.js` (pure)

Functions return Game values. They never read or write the DOM.

**`createGame()`**  
Returns `{ board: [null × 9], turn: "X", outcome: "playing" }`.

**`placeMark(game, index)`**

- Legal: `outcome === "playing"`, `index` is an integer 0–8, `board[index] === null`. Then: return a **new** Game object with a **new** `board` array. Write `game.turn` into that Cell. Set `outcome` from the rules below. If still `"playing"`, flip `turn` to the other Mark. Do not mutate the input `game`.
- Illegal: return the **same object** `game` (no copy, no throw). Illegal means: occupied Cell, index not an integer in 0–8, or `outcome !== "playing"`.

**`newGame()`**  
Same return value as `createGame()`.

**Outcome after a legal placement**

Winning Lines (indexes):

- Rows: `[0,1,2]`, `[3,4,5]`, `[6,7,8]`
- Columns: `[0,3,6]`, `[1,4,7]`, `[2,5,8]`
- Diagonals: `[0,4,8]`, `[2,4,6]`

If any Line is three of the same Mark (not `null`), `outcome` is that Mark. A placement that both fills the Board and completes a Line is a Win, not a Draw. If every Cell is non-null and there is no Line, `outcome` is `"draw"`. Otherwise `"playing"`. After a Win or Draw, `turn` stays as the Player who just placed (it is not used until New Game).

### `ui.js`

On load: `game = createGame()`, then `render()`.

`render()`:

- Each Cell’s text is `""` / `"X"` / `"O"` from `game.board`.
- Status text is exactly:
  - `"X's turn"` / `"O's turn"` when `outcome === "playing"`
  - `"X wins"` / `"O wins"` when `outcome` is `"X"` or `"O"`
  - `"Draw"` when `outcome === "draw"`
- New Game is always enabled.

Cell click: `game = placeMark(game, index)` then `render()`.  
New Game click: `game = newGame()` then `render()`.

No `alert`, no `console` for illegal clicks. If `placeMark` returns the same object, `render()` still runs; the page looks unchanged.

### `index.html`

- Nine `<button>` elements with `data-index="0"` … `"8"`.
- `<script type="module" src="./ui.js"></script>`. `ui.js` imports from `./game.js`.
- One element `#status` for the status line.
- One button `#new-game` labelled `New Game`.
- Minimal CSS: Cells in a 3×3. No animations. No winning-Line highlight.

## Data flow

```
click Cell n
  → placeMark(game, n)
  → new Game (or same object)
  → render Board + status

click New Game
  → newGame()
  → render empty Board, "X's turn"
```

There is no server, no persistence, no second browser.

## Error handling

- Player mistakes (occupied Cell, click after Win/Draw, bad index) are silent no-ops.
- `game.js` does not throw for those cases.
- No error UI.

## Testing

`npm test` in `tic-tac-toe/` must run `node --test game.test.js`. Tests import `createGame`, `placeMark`, `newGame` from `./game.js`.

Required cases (write failing tests first at Build):

1. `createGame` → empty Board, `turn === "X"`, `outcome === "playing"`.
2. `placeMark` on an empty Cell → that Mark in the Cell, `turn` flips.
3. `placeMark` on an occupied Cell → **same object**, Board unchanged.
4. `placeMark` after a Win or Draw → **same object**.
5. Three in a Line → `outcome` is that Player (`"X"` or `"O"`). Include at least one row, one column, and one diagonal.
6. Full Board with no Line → `outcome === "draw"`.
7. A finishing placement that completes a Line on a full Board → Win, not Draw.
8. `newGame` after a finished Game → empty Board, X’s Turn, `"playing"`.

No Playwright. No Xray. No unit tests for `ui.js`.

## Out of scope

- Computer Player, accounts, network, score history, animations, extra modes
- TypeScript, bundlers, CSS frameworks, checked-in `node_modules`
- Changes to `skills/`, `flows/`, or other SDLC tooling except `docs/sdlc/CT-68/` artifacts
