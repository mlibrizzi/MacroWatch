export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Correct base URL is api.gold-api.com not gold-api.com
    const [goldRes, silverRes] = await Promise.all([
      fetch('https://api.gold-api.com/price/XAU'),
      fetch('https://api.gold-api.com/price/XAG')
    ]);

    const goldText   = await goldRes.text();
    const silverText = await silverRes.text();

    let gold, silver;
    try { gold   = JSON.parse(goldText);   } catch(e) { throw new Error('Gold parse error: ' + goldText.slice(0,120)); }
    try { silver = JSON.parse(silverText); } catch(e) { throw new Error('Silver parse error: ' + silverText.slice(0,120)); }

    return res.status(200).json({
      gold: {
        price:     gold.price || gold.ask || gold.rate || gold.c,
        change:    gold.ch    || gold.d   || null,
        changePct: gold.chp   || gold.dp  || null,
        high:      gold.high  || gold.h   || null,
        low:       gold.low   || gold.l   || null,
        currency:  'USD',
        unit:      'troy oz',
        delay:     'Real-time (gold-api.com)',
        timestamp: new Date().toISOString(),
        raw:       gold
      },
      silver: {
        price:     silver.price || silver.ask || silver.rate || silver.c,
        change:    silver.ch    || silver.d   || null,
        changePct: silver.chp   || silver.dp  || null,
        high:      silver.high  || silver.h   || null,
        low:       silver.low   || silver.l   || null,
        currency:  'USD',
        unit:      'troy oz',
        delay:     'Real-time (gold-api.com)',
        timestamp: new Date().toISOString(),
        raw:       silver
      }
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}