import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, placeMark, newGame } from './game.js';

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
  const game = play([0, 1, 2, 3, 4, 5, 7, 6, 8]);
  assert.ok(game.board.every((cell) => cell !== null));
  assert.equal(game.outcome, 'X');
  assert.notEqual(game.outcome, 'draw');
});


test('newGame after a finished game returns an empty playing board with X turn', () => {
  const won = play([0, 3, 1, 4, 2]);
  const fresh = newGame();
  assert.notEqual(fresh, won);
  assert.deepEqual(fresh.board, [null, null, null, null, null, null, null, null, null]);
  assert.equal(fresh.turn, 'X');
  assert.equal(fresh.outcome, 'playing');
});
