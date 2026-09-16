import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runDigest } from './run-digest.js';

function fakeGmail(messages) {
  return {
    listUnreadInbox: async () => messages,
    calls: [],
  };
}

test('zero unread does not call summarize', async () => {
  let called = 0;
  const result = await runDigest({
    gmail: fakeGmail([]),
    summarize: async () => {
      called += 1;
      return 'nope';
    },
  });
  assert.equal(called, 0);
  assert.equal(result.ok, true);
  assert.equal(result.empty, true);
  assert.equal(result.stdout, 'No unread messages in Inbox.\n');
});

test('three messages: one summarize call and digest stdout', async () => {
  const msgs = [
    { from: 'a@x', subject: 'S1', body: 'B1', receivedAt: 1 },
    { from: 'b@x', subject: 'S2', body: 'B2', receivedAt: 2 },
    { from: 'c@x', subject: 'S3', body: 'B3', receivedAt: 3 },
  ];
  let received;
  const result = await runDigest({
    gmail: fakeGmail(msgs),
    summarize: async (m) => {
      received = m;
      return 'SUMMARY';
    },
  });
  assert.equal(received.length, 3);
  assert.equal(received[0].body, 'B3');
  assert.equal(result.ok, true);
  assert.equal(
    result.stdout,
    'SUMMARY\n\nFrom: c@x | Subject: S3\nFrom: b@x | Subject: S2\nFrom: a@x | Subject: S1\n',
  );
});

test('twelve messages: only 10 newest go to summarize', async () => {
  const msgs = Array.from({ length: 12 }, (_, i) => ({
    from: `${i}@x`,
    subject: `S${i}`,
    body: `B${i}`,
    receivedAt: i,
  }));
  let received;
  await runDigest({
    gmail: fakeGmail(msgs),
    summarize: async (m) => {
      received = m;
      return 'S';
    },
  });
  assert.equal(received.length, 10);
  assert.equal(received[0].from, '11@x');
  assert.equal(received[9].from, '2@x');
});

test('gmail throw: stage gmail, summarize not called', async () => {
  let called = 0;
  const err = new Error('boom');
  const result = await runDigest({
    gmail: {
      listUnreadInbox: async () => {
        throw err;
      },
    },
    summarize: async () => {
      called += 1;
      return 'x';
    },
  });
  assert.equal(called, 0);
  assert.equal(result.ok, false);
  assert.equal(result.stage, 'gmail');
  assert.equal(result.error, err);
  assert.equal(result.stdout, undefined);
});

test('ai throw: stage ai and from/subject lines', async () => {
  const result = await runDigest({
    gmail: {
      listUnreadInbox: async () => [
        { from: 'a@x', subject: 'S1', body: 'B1', receivedAt: 1 },
      ],
    },
    summarize: async () => {
      throw new Error('down');
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.stage, 'ai');
  assert.equal(result.stdout, 'From: a@x | Subject: S1\n');
});

test('does not call mark-read or modify on gmail', async () => {
  const calls = [];
  const gmail = new Proxy(
    {
      listUnreadInbox: async () => [
        { from: 'a@x', subject: 'S', body: 'B', receivedAt: 1 },
      ],
    },
    {
      get(target, prop) {
        calls.push(String(prop));
        return target[prop];
      },
    },
  );
  await runDigest({
    gmail,
    summarize: async () => 'ok',
  });
  assert.deepEqual(calls, ['listUnreadInbox']);
});
