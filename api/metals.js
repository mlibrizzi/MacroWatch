export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // gold-api.com requires NO API key - completely free
    const [goldRes, silverRes] = await Promise.all([
      fetch('https://gold-api.com/price/XAU'),
      fetch('https://gold-api.com/price/XAG')
    ]);

    const gold   = await goldRes.json();
    const silver = await silverRes.json();

    return res.status(200).json({
      gold: {
        price:     gold.price,
        change:    gold.price_gram_24k ? null : null,
        changePct: null,
        currency:  'USD',
        unit:      'troy oz',
        delay:     'Real-time (gold-api.com)',
        timestamp: new Date().toISOString()
      },
      silver: {
        price:     silver.price,
        change:    null,
        changePct: null,
        currency:  'USD',
        unit:      'troy oz',
        delay:     'Real-time (gold-api.com)',
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}