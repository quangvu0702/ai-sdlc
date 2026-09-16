export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function postGoogleToken({ fetchImpl = fetch, params }) {
  const res = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

export function tokenErrorDetail({ status, json }) {
  return json.error_description ?? json.error ?? status;
}
