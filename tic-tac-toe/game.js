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
