import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './game.js';

test('createGame returns empty board, X turn, playing', () => {
  const game = createGame();
  assert.deepEqual(game.board, [null, null, null, null, null, null, null, null, null]);
  assert.equal(game.turn, 'X');
  assert.equal(game.outcome, 'playing');
});
