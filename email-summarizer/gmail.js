import { postGoogleToken, tokenErrorDetail } from './google-oauth-token.js';

function decodeBodyData(data) {
  if (!data) return '';
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function headerValue(headers, name) {
  const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found?.value ?? '';
}

function collectParts(payload, acc = { textPlain: '', textHtml: '' }) {
  if (!payload) return acc;
  const mime = payload.mimeType ?? '';
  const data = payload.body?.data;
  if (mime === 'text/plain' && data) {
    acc.textPlain = decodeBodyData(data);
  } else if (mime === 'text/html' && data) {
    acc.textHtml = decodeBodyData(data);
  }
  for (const part of payload.parts ?? []) {
    collectParts(part, acc);
  }
  return acc;
}

export function parseGmailMessage(resource) {
  const headers = resource.payload?.headers ?? [];
  const parts = collectParts(resource.payload);
  return {
    from: headerValue(headers, 'From'),
    subject: headerValue(headers, 'Subject'),
    textPlain: parts.textPlain,
    textHtml: parts.textHtml,
    receivedAt: Number(resource.internalDate),
  };
}

async function fetchAccessToken({ fetchImpl, env }) {
  const { ok, status, json } = await postGoogleToken({
    fetchImpl,
    params: {
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    },
  });
  if (!ok) {
    throw new Error(`Gmail token error: ${tokenErrorDetail({ status, json })}`);
  }
  if (!json.access_token) {
    throw new Error('Gmail token error: missing access_token');
  }
  return json.access_token;
}

async function gmailFetch({ fetchImpl, token, url }) {
  const res = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail API error: ${res.status}`);
  }
  return res.json();
}

export function createGmail({ fetchImpl, env }) {
  let cachedToken;

  async function getToken() {
    if (!cachedToken) {
      cachedToken = await fetchAccessToken({ fetchImpl, env });
    }
    return cachedToken;
  }

  return {
    async listUnreadInbox({ max }) {
      const token = await getToken();
      const listUrl =
        `https://gmail.googleapis.com/gmail/v1/users/me/messages` +
        `?q=${encodeURIComponent('is:unread in:inbox')}&maxResults=${max}`;
      const list = await gmailFetch({ fetchImpl, token, url: listUrl });
      const ids = (list.messages ?? []).map((m) => m.id);
      const messages = [];
      for (const id of ids) {
        const detailUrl =
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
        const detail = await gmailFetch({ fetchImpl, token, url: detailUrl });
        messages.push(parseGmailMessage(detail));
      }
      return messages;
    },
  };
}
