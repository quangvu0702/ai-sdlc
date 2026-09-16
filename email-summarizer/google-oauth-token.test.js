import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GOOGLE_TOKEN_URL,
  postGoogleToken,
  tokenErrorDetail,
} from './google-oauth-token.js';

test('postGoogleToken posts URL-encoded params to Google token endpoint', async () => {
  let captured;
  const fetchImpl = async (url, opts) => {
    captured = { url, ...opts };
    return {
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'tok' }),
    };
  };
  const result = await postGoogleToken({
    fetchImpl,
    params: {
      client_id: 'id',
      grant_type: 'refresh_token',
    },
  });
  assert.equal(captured.url, GOOGLE_TOKEN_URL);
  assert.equal(captured.method, 'POST');
  assert.equal(String(captured.body), 'client_id=id&grant_type=refresh_token');
  assert.equal(result.ok, true);
  assert.equal(result.json.access_token, 'tok');
});

test('tokenErrorDetail prefers error_description', () => {
  assert.equal(
    tokenErrorDetail({
      status: 400,
      json: { error: 'invalid_grant', error_description: 'Token expired' },
    }),
    'Token expired',
  );
});
