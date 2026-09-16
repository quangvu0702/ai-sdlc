import { extractBody } from './body.js';

function receivedMs(value) {
  if (typeof value === 'number') return value;
  const n = Number(value);
  if (!Number.isNaN(n) && String(value).trim() !== '' && !String(value).includes('-')) {
    return n;
  }
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

function prepare(message) {
  const hasParts = message.textPlain != null || message.textHtml != null;
  const body = hasParts
    ? extractBody({ textPlain: message.textPlain, textHtml: message.textHtml })
    : (message.body ?? '');
  return {
    from: message.from,
    subject: message.subject,
    body,
    receivedAt: message.receivedAt,
  };
}

export async function runDigest({ gmail, summarize }) {
  let listed;
  try {
    listed = await gmail.listUnreadInbox({ max: 10 });
  } catch (error) {
    return { ok: false, stage: 'gmail', error };
  }
  const sorted = [...listed].sort((a, b) => receivedMs(b.receivedAt) - receivedMs(a.receivedAt));
  const selected = sorted.slice(0, 10).map(prepare);
  if (selected.length === 0) {
    return { ok: true, empty: true, stdout: 'No unread messages in Inbox.\n' };
  }
  const lines = selected.map((m) => `From: ${m.from} | Subject: ${m.subject}`);
  try {
    const summary = await summarize(selected);
    return {
      ok: true,
      empty: false,
      stdout: `${summary}\n\n${lines.join('\n')}\n`,
    };
  } catch (error) {
    return { ok: false, stage: 'ai', error, stdout: `${lines.join('\n')}\n` };
  }
}
