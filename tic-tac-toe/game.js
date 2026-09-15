export function createGame() {
  return {
    board: [null, null, null, null, null, null, null, null, null],
    turn: 'X',
    outcome: 'playing',
  };
}
