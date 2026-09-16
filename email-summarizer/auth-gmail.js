import http from 'node:http';
import { URL } from 'node:url';
import { postGoogleToken, tokenErrorDetail } from './google-oauth-token.js';

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return value;
}

const clientId = requiredEnv('GMAIL_CLIENT_ID');
const clientSecret = requiredEnv('GMAIL_CLIENT_SECRET');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400);
    res.end('Missing code');
    return;
  }
  const redirectUri = `http://127.0.0.1:${server.address().port}`;
  const { ok, status, json } = await postGoogleToken({
    params: {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    },
  });
  if (!ok) {
    const detail = tokenErrorDetail({ status, json });
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Authorization failed: ${detail}\n`);
    console.error(`Gmail token error: ${detail}`);
    server.close();
    process.exitCode = 1;
    return;
  }
  if (!json.refresh_token) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Authorization failed: no refresh_token. Try again with prompt=consent.\n');
    console.error('No refresh_token in response. Try again with prompt=consent.');
    server.close();
    process.exitCode = 1;
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Authorization complete. You can close this tab.\n');
  console.log(json.refresh_token);
  server.close();
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const redirectUri = `http://127.0.0.1:${port}`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPE);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  console.log('Open this URL in your browser:\n');
  console.log(authUrl.toString());
});
