import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractBody } from './body.js';

test('prefers text/plain over HTML', () => {
  assert.equal(
    extractBody({ textPlain: '  hello  ', textHtml: '<p>nope</p>' }),
    'hello',
  );
});

test('strips tags from HTML-only', () => {
  assert.equal(extractBody({ textHtml: '<p>Hi <b>there</b></p>' }), 'Hi there');
});

test('truncates to 4000 characters', () => {
  const textPlain = 'x'.repeat(5000);
  const out = extractBody({ textPlain });
  assert.equal(out.length, 4000);
});

test('empty parts return empty string', () => {
  assert.equal(extractBody({}), '');
});
