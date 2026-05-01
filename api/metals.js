export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VITE_GOLD_API_KEY;

  try {
    const [goldRes, silverRes] = await Promise.all([
      fetch('https://www.goldapi.io/api/XAU/USD', {
        headers: { 'x-access-token': apiKey, 'Content-Type': 'application/json' }
      }),
      fetch('https://www.goldapi.io/api/XAG/USD', {
        headers: { 'x-access-token': apiKey, 'Content-Type': 'application/json' }
      })
    ]);

    const gold = await goldRes.json();
    const silver = await silverRes.json();

    return res.status(200).json({
      gold: {
        price: gold.price,
        change: gold.ch,
        changePct: gold.chp,
        high: gold.high_price,
        low: gold.low_price,
        timestamp: gold.timestamp,
        delay: 'Real-time (FOREX)'
      },
      silver: {
        price: silver.price,
        change: silver.ch,
        changePct: silver.chp,
        high: silver.high_price,
        low: silver.low_price,
        timestamp: silver.timestamp,
        delay: 'Real-time (FOREX)'
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}