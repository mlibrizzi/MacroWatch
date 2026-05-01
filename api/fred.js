export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VITE_FRED_API_KEY;
  const base = 'https://api.stlouisfed.org/fred/series/observations';
  const params = (id) => `?series_id=${id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`;

  const fetchSeries = async (id) => {
    const r = await fetch(`${base}${params(id)}`);
    const d = await r.json();
    const obs = d.observations?.filter(o => o.value !== '.') || [];
    return {
      latest: parseFloat(obs[0]?.value),
      prior: parseFloat(obs[1]?.value),
      date: obs[0]?.date,
    };
  };

  try {
    const [t2y, t10y, t30y, t5y, tips10y, fedfunds,
           cpi, coreCpi, pce, corePce, unrate, nfp,
           claims, gdp, retail, ism_m] = await Promise.all([
      fetchSeries('DGS2'),        // 2Y Treasury
      fetchSeries('DGS10'),       // 10Y Treasury
      fetchSeries('DGS30'),       // 30Y Treasury
      fetchSeries('DGS5'),        // 5Y Treasury
      fetchSeries('DFII10'),      // 10Y TIPS Real Yield
      fetchSeries('FEDFUNDS'),    // Fed Funds Rate
      fetchSeries('CPIAUCSL'),    // CPI
      fetchSeries('CPILFESL'),    // Core CPI
      fetchSeries('PCEPI'),       // PCE
      fetchSeries('PCEPILFE'),    // Core PCE
      fetchSeries('UNRATE'),      // Unemployment Rate
      fetchSeries('PAYEMS'),      // Nonfarm Payrolls
      fetchSeries('ICSA'),        // Initial Jobless Claims
      fetchSeries('A191RL1Q225SBEA'), // Real GDP Growth
      fetchSeries('RSAFS'),       // Retail Sales
      fetchSeries('MANEMP'),      // Manufacturing Employment proxy
    ]);

    // Calculate term premium and YoY for CPI/PCE
    const termPremium = t10y.latest && t2y.latest ? +(t10y.latest - t2y.latest).toFixed(3) : null;

    const yoy = (series) => series.latest && series.prior
      ? +((series.latest / series.prior - 1) * 100).toFixed(2)
      : null;

    return res.status(200).json({
      yields: {
        t2y:  { ...t2y,  delay: 'Daily (FRED / US Treasury)' },
        t5y:  { ...t5y,  delay: 'Daily (FRED / US Treasury)' },
        t10y: { ...t10y, delay: 'Daily (FRED / US Treasury)' },
        t30y: { ...t30y, delay: 'Daily (FRED / US Treasury)' },
        tips10y: { ...tips10y, delay: 'Daily (FRED)' },
        fedfunds: { ...fedfunds, delay: 'Monthly (FRED)' },
        termPremium: {
          value: termPremium,
          label: '10Y minus 2Y',
          signal: termPremium > 0.5 ? 'steepening' : termPremium < 0 ? 'inverted' : 'flattening',
          delay: 'Daily (derived from FRED)'
        }
      },
      macro: {
        cpi:      { ...cpi,      name: 'CPI',        delay: 'Monthly (FRED / BLS)', unit: 'index' },
        coreCpi:  { ...coreCpi,  name: 'Core CPI',   delay: 'Monthly (FRED / BLS)', unit: 'index' },
        pce:      { ...pce,      name: 'PCE',        delay: 'Monthly (FRED / BEA)', unit: 'index' },
        corePce:  { ...corePce,  name: 'Core PCE',   delay: 'Monthly (FRED / BEA)', unit: 'index' },
        unrate:   { ...unrate,   name: 'Unemployment Rate', delay: 'Monthly (FRED / BLS)', unit: '%' },
        nfp:      { ...nfp,      name: 'Nonfarm Payrolls',  delay: 'Monthly (FRED / BLS)', unit: 'thousands' },
        claims:   { ...claims,   name: 'Initial Jobless Claims', delay: 'Weekly (FRED / DOL)', unit: 'thousands' },
        gdp:      { ...gdp,      name: 'Real GDP QoQ', delay: 'Quarterly (FRED / BEA)', unit: '%' },
        retail:   { ...retail,   name: 'Retail Sales', delay: 'Monthly (FRED / Census)', unit: 'millions' },
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}