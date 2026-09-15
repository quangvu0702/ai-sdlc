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
