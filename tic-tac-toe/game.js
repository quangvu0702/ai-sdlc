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

export function newGame() {
  return createGame();
}
