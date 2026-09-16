export function extractBody({ textPlain, textHtml } = {}) {
  const plain = typeof textPlain === 'string' ? textPlain.trim() : '';
  if (plain) return plain.slice(0, 4000);
  const html = typeof textHtml === 'string' ? textHtml : '';
  if (!html) return '';
  const stripped = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.slice(0, 4000);
}
