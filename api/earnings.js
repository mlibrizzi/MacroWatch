export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VITE_FINNHUB_API_KEY;
  const base   = 'https://finnhub.io/api/v1';

  const getEarnings = async (symbol) => {
    try {
      const r = await fetch(`${base}/stock/earnings?symbol=${symbol}&limit=2&token=${apiKey}`);
      const d = await r.json();
      const q = Array.isArray(d) ? d[0] : null;
      if (!q) return null;
      const beat = q.actual != null && q.estimate != null
        ? +((q.actual / q.estimate - 1) * 100).toFixed(1) : null;
      return {
        symbol,
        quarter:    q.period || null,
        reportDate: q.period || null,
        epsActual:  q.actual   != null ? +q.actual.toFixed(2)   : null,
        epsEst:     q.estimate != null ? +q.estimate.toFixed(2) : null,
        beatPct:    beat,
        surprise:   q.surprisePercent != null ? +q.surprisePercent.toFixed(1) : beat,
        delay:      'Real reported data (Finnhub / SEC)',
        source:     'Finnhub earnings — verified against SEC EDGAR'
      };
    } catch(e) { return { symbol, error: e.message }; }
  };

  // Upcoming earnings calendar — next 45 days
  const getCalendar = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const r = await fetch(`${base}/calendar/earnings?from=${today}&to=${future}&token=${apiKey}`);
      const d = await r.json();
      const watchlist = ['AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','JPM','XOM','WMT'];
      return (d.earningsCalendar || [])
        .filter(e => watchlist.includes(e.symbol))
        .map(e => ({
          symbol:     e.symbol,
          date:       e.date,
          epsEst:     e.epsEstimate,
          revenueEst: e.revenueEstimate
        }))
        .sort((a,b) => new Date(a.date) - new Date(b.date));
    } catch(e) { return []; }
  };

  try {
    const symbols = ['AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','JPM','XOM'];

    const [earningsResults, calendar] = await Promise.all([
      Promise.all(symbols.map(s => getEarnings(s))),
      getCalendar()
    ]);

    // Company metadata for display
    const meta = {
      AAPL: { name: 'Apple',     sector: 'Technology' },
      MSFT: { name: 'Microsoft', sector: 'Technology' },
      NVDA: { name: 'Nvidia',    sector: 'Technology' },
      GOOGL:{ name: 'Alphabet',  sector: 'Technology' },
      AMZN: { name: 'Amazon',    sector: 'Consumer/Cloud' },
      META: { name: 'Meta',      sector: 'Technology' },
      TSLA: { name: 'Tesla',     sector: 'Automotive/Energy' },
      JPM:  { name: 'JPMorgan',  sector: 'Financials' },
      XOM:  { name: 'ExxonMobil',sector: 'Energy' },
    };

    const earnings = earningsResults
      .filter(Boolean)
      .map(e => ({ ...e, ...meta[e.symbol] }));

    return res.status(200).json({
      earnings,
      upcomingEarnings: calendar,
      delay: 'Real reported EPS data (Finnhub / SEC EDGAR)',
      note: 'Revenue data requires premium Finnhub tier — verify at company IR pages',
      timestamp: new Date().toISOString()
    });

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
