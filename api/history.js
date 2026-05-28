const apiKey = process.env.VITE_FRED_API_KEY;
const base = (id, limit) =>
  `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;

const fetchSeries = async (id, limit = 104) => {
  try {
    const r = await fetch(base(id, limit));
    const d = await r.json();
    const obs = d.observations?.filter(o => o.value !== '.') || [];
    return obs.map(o => ({
      date: o.date,
      value: parseFloat(o.value)
    })).reverse(); // oldest first for charting
  } catch(e) {
    return [];
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [t2y, t10y, t30y, tips10y, cpi, pce, walcl, vix] = await Promise.all([
      fetchSeries('DGS2',      104), // 2Y yield — 2 years weekly
      fetchSeries('DGS10',     104), // 10Y yield
      fetchSeries('DGS30',     104), // 30Y yield
      fetchSeries('DFII10',    104), // 10Y TIPS real yield
      fetchSeries('CPIAUCSL',   24), // CPI — 24 months
      fetchSeries('PCEPILFE',   24), // Core PCE
      fetchSeries('WALCL',     104), // Fed balance sheet
      fetchSeries('VIXCLS',    104), // VIX history
    ]);

    // Build yield curve spread (10Y - 2Y) history
    const spreadHistory = t10y.map((item, i) => {
      const t2yMatch = t2y.find(t => t.date === item.date);
      return t2yMatch ? {
        date: item.date,
        t2y: t2yMatch.value,
        t10y: item.value,
        t30y: t30y.find(t => t.date === item.date)?.value || null,
        spread: +(item.value - t2yMatch.value).toFixed(2)
      } : null;
    }).filter(Boolean);

    // Build inflation trend (MoM % change)
    const cpiTrend = cpi.map((item, i) => {
      if (i === 0) return null;
      const mom = +((item.value / cpi[i-1].value - 1) * 100).toFixed(2);
      return { date: item.date, value: item.value, mom };
    }).filter(Boolean);

    const pceTrend = pce.map((item, i) => {
      if (i === 0) return null;
      const mom = +((item.value / pce[i-1].value - 1) * 100).toFixed(2);
      return { date: item.date, value: item.value, mom };
    }).filter(Boolean);

    return res.status(200).json({
      yieldCurve: spreadHistory,
      tips10y: tips10y,
      cpi: cpiTrend,
      corePce: pceTrend,
      fedBalance: walcl,
      vix: vix,
      timestamp: new Date().toISOString()
    });

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
