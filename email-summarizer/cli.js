import { pathToFileURL } from 'node:url';

const REQUIRED_ENV = [
  'GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  'GMAIL_REFRESH_TOKEN',
  'OPENAI_API_KEY',
];

export async function runCli({ env, stdout, stderr, runDigestFn }) {
  for (const name of REQUIRED_ENV) {
    if (!env[name]) {
      stderr.write(`Missing env: ${name}\n`);
      return 1;
    }
  }
  const result = await runDigestFn();
  if (result.ok) {
    stdout.write(result.stdout);
    return 0;
  }
  if (result.stage === 'gmail') {
    stderr.write(`Gmail error: ${result.error.message}\n`);
    return 1;
  }
  if (result.stage === 'ai') {
    stdout.write(result.stdout);
    stderr.write(`AI error: ${result.error.message}\n`);
    return 1;
  }
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { createGmail } = await import('./gmail.js');
  const { createSummarizer } = await import('./summarize.js');
  const { runDigest } = await import('./run-digest.js');
  const gmail = createGmail({ fetchImpl: globalThis.fetch, env: process.env });
  const summarizer = createSummarizer({ fetchImpl: globalThis.fetch, env: process.env });
  const code = await runCli({
    env: process.env,
    stdout: process.stdout,
    stderr: process.stderr,
    runDigestFn: () =>
      runDigest({
        gmail,
        summarize: (messages) => summarizer.summarize(messages),
      }),
  });
  process.exit(code);
}
