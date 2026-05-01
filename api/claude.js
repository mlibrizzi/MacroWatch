export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      ...req.body,
      // Force system prompt to always strip markdown
      system: (req.body.system || '') + '\n\nCRITICAL: Return ONLY raw JSON. No markdown. No backticks. No ```json fences. No preamble. No explanation. The very first character of your response must be { and the very last must be }.',
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