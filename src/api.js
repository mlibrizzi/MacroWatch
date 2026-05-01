const TODAY = new Date().toISOString().split('T')[0];

const JSON_SYSTEM = `You are a financial data assistant for a macro intelligence dashboard used by a professional investor. 
Always respond with ONLY valid JSON — no markdown fences, no preamble, no explanation.
Today's date: ${TODAY}.
Provide realistic current estimates based on your training knowledge. Be precise with numbers.
If a value is genuinely unknown, use null.`;

export async function callClaude(prompt, systemOverride) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_ANTHROPIC_API_KEY not set');
  }

  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemOverride || JSON_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.content?.map(b => b.text || '').join('') || '';

  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return { raw: text };
  }
}

export { TODAY };