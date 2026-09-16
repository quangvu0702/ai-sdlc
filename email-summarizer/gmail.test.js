import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGmail, parseGmailMessage } from './gmail.js';

test('parseGmailMessage reads headers, date, and text/plain', () => {
  const parsed = parseGmailMessage({
    internalDate: '1700000000000',
    payload: {
      headers: [
        { name: 'From', value: 'Ada <ada@x>' },
        { name: 'Subject', value: 'Hello' },
      ],
      mimeType: 'text/plain',
      body: { data: Buffer.from('Hi there').toString('base64url') },
    },
  });
  assert.equal(parsed.from, 'Ada <ada@x>');
  assert.equal(parsed.subject, 'Hello');
  assert.equal(parsed.textPlain, 'Hi there');
  assert.equal(parsed.receivedAt, 1700000000000);
});

test('listUnreadInbox uses readonly list+get and not modify', async () => {
  const urls = [];
  const fetchImpl = async (url, opts = {}) => {
    urls.push({ url: String(url), method: opts.method || 'GET', body: opts.body });
    if (String(url).includes('oauth2.googleapis.com/token')) {
      return { ok: true, json: async () => ({ access_token: 'tok' }) };
    }
    if (String(url).includes('/messages?') || String(url).endsWith('/messages')) {
      return { ok: true, json: async () => ({ messages: [{ id: 'm1' }] }) };
    }
    return {
      ok: true,
      json: async () => ({
        id: 'm1',
        internalDate: '2',
        payload: {
          headers: [
            { name: 'From', value: 'a@x' },
            { name: 'Subject', value: 'S' },
          ],
          mimeType: 'text/plain',
          body: { data: Buffer.from('B').toString('base64url') },
        },
      }),
    };
  };
  const gmail = createGmail({
    fetchImpl,
    env: {
      GMAIL_CLIENT_ID: 'id',
      GMAIL_CLIENT_SECRET: 'sec',
      GMAIL_REFRESH_TOKEN: 'ref',
    },
  });
  const msgs = await gmail.listUnreadInbox({ max: 10 });
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].from, 'a@x');
  assert.equal(msgs[0].subject, 'S');
  assert.ok(
    urls.some(
      (u) =>
        u.url.includes('q=is:unread+in:inbox') ||
        u.url.includes('q=is%3Aunread%20in%3Ainbox'),
    ),
  );
  assert.ok(!urls.some((u) => /modify|send|trash/i.test(u.url)));
});

test('non-2xx Gmail response throws', async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes('token')) {
      return { ok: true, json: async () => ({ access_token: 'tok' }) };
    }
    return { ok: false, status: 401, json: async () => ({}) };
  };
  const gmail = createGmail({
    fetchImpl,
    env: {
      GMAIL_CLIENT_ID: 'id',
      GMAIL_CLIENT_SECRET: 'sec',
      GMAIL_REFRESH_TOKEN: 'ref',
    },
  });
  await assert.rejects(() => gmail.listUnreadInbox({ max: 10 }));
});
