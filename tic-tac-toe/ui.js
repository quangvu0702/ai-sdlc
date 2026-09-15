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
