export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // gold-api.com - no API key required
    const [goldRes, silverRes] = await Promise.all([
      fetch('https://gold-api.com/price/XAU', {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
      }),
      fetch('https://gold-api.com/price/XAG', {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
      })
    ]);

    const goldText   = await goldRes.text();
    const silverText = await silverRes.text();

    let gold, silver;
    try { gold   = JSON.parse(goldText);   } catch(e) { throw new Error('Gold parse error: ' + goldText.slice(0,100)); }
    try { silver = JSON.parse(silverText); } catch(e) { throw new Error('Silver parse error: ' + silverText.slice(0,100)); }

    // gold-api.com returns { price, symbol, currency, ... }
    return res.status(200).json({
      gold: {
        price:     gold.price     || gold.ask || gold.rate,
        change:    gold.ch        || null,
        changePct: gold.chp       || null,
        high:      gold.high      || null,
        low:       gold.low       || null,
        currency:  'USD',
        unit:      'troy oz',
        delay:     'Real-time (gold-api.com)',
        timestamp: new Date().toISOString()
      },
      silver: {
        price:     silver.price     || silver.ask || silver.rate,
        change:    silver.ch        || null,
        changePct: silver.chp       || null,
        high:      silver.high      || null,
        low:       silver.low       || null,
        currency:  'USD',
        unit:      'troy oz',
        delay:     'Real-time (gold-api.com)',
        timestamp: new Date().toISOString()
      },
      raw: { gold, silver }
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}