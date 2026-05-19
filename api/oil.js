// In-memory cache — 4 hour TTL
let cachedData = null;
let cacheTime = 0;
const CACHE_TTL = 4 * 60 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VITE_OILPRICE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OILPRICE_API_KEY not set' });

  if (cachedData && (Date.now() - cacheTime) < CACHE_TTL) {
    return res.status(200).json({ ...cachedData, cached: true });
  }

  try {
    const headers = {
      'Authorization': 'Token ' + apiKey,
      'Content-Type': 'application/json'
    };

    const [wtiRes, brentRes] = await Promise.all([
      fetch('https://api.oilpriceapi.com/v1/prices/latest?by_code=WTI_USD', { headers }),
      fetch('https://api.oilpriceapi.com/v1/prices/latest?by_code=BRENT_CRUDE_USD', { headers })
    ]);

    const wtiData = await wtiRes.json();
    const brentData = await brentRes.json();

    const wti = wtiData.data;
    const brent = brentData.data;

    const result = {
      wti: wti ? {
        price: wti.price,
        change: wti.changes && wti.changes['24h'] ? wti.changes['24h'].amount : null,
        changePct: wti.changes && wti.changes['24h'] ? wti.changes['24h'].percent : null,
        date: wti.updated_at ? wti.updated_at.split('T')[0] : null,
        freshness: wti.freshness ? wti.freshness.age_seconds : null,
        name: 'WTI Crude Oil',
        unit: 'USD/bbl',
        delay: 'Near real-time (OilPriceAPI.com)',
        source: 'oilprice.com / Investing.com'
      } : null,
      brent: brent ? {
        price: brent.price,
        change: brent.changes && brent.changes['24h'] ? brent.changes['24h'].amount : null,
        changePct: brent.changes && brent.changes['24h'] ? brent.changes['24h'].percent : null,
        date: brent.updated_at ? brent.updated_at.split('T')[0] : null,
        freshness: brent.freshness ? brent.freshness.age_seconds : null,
        name: 'Brent Crude Oil',
        unit: 'USD/bbl',
        delay: 'Near real-time (OilPriceAPI.com)',
        source: 'oilprice.com / Business Insider'
      } : null,
      timestamp: new Date().toISOString()
    };

    // Only cache if we got valid prices
    if (result.wti || result.brent) {
      cachedData = result;
      cacheTime = Date.now();
    }
    return res.status(200).json(result);

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
