function buildPrompt(messages) {
  const blocks = messages.map(
    (m) => `From: ${m.from}\nSubject: ${m.subject}\nBody: ${m.body}`,
  );
  return `Summarize these unread emails in one short paragraph.\n\n${blocks.join('\n\n')}`;
}

export function createSummarizer({ fetchImpl, env }) {
  const base = (env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = env.OPENAI_MODEL ?? 'gpt-4o-mini';

  return {
    async summarize(messages) {
      const res = await fetchImpl(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: buildPrompt(messages) }],
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI error: ${res.status}`);
      }
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('OpenAI error: missing content');
      }
      return content.trim();
    },
  };
}
