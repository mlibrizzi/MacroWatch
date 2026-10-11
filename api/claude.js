// Server-side proxy to the Anthropic API.
// The model, token cap and request shape are fixed here so the endpoint
// cannot be used as an open relay on this project's API key.

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 4000;
const MAX_PROMPT_CHARS = 8000;
const MAX_SYSTEM_CHARS = 4000;

const JSON_ONLY =
  '\n\nCRITICAL: Return ONLY raw JSON. No markdown. No backticks. No ```json fences. No preamble. No explanation. The very first character of your response must be { and the very last must be }.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Only accept calls from this site's own pages.
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  if (origin && !origin.endsWith(host)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY' });
  }

  const { prompt, system } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }
  if (prompt.length > MAX_PROMPT_CHARS || (system && String(system).length > MAX_SYSTEM_CHARS)) {
    return res.status(413).json({ error: 'Request too large' });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: String(system || '') + JSON_ONLY,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();

  // Strip markdown fences from response before sending to client
  if (data.content && Array.isArray(data.content)) {
    data.content = data.content.map(block => {
      if (block.type === 'text') {
        block.text = block.text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
      }
      return block;
    });
  }

  return res.status(response.status).json(data);
}
