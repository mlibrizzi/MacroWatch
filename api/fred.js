export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VITE_FRED_API_KEY;
  const base = 'https://api.stlouisfed.org/fred/series/observations';
  const params = (id, limit = 3) =>
    `?series_id=${id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;

  const fetchSeries = async (id, limit = 3) => {
    const r = await fetch(`${base}${params(id, limit)}`);
    const d = await r.json();
    const obs = d.observations?.filter(o => o.value !== '.') || [];
    return {
      latest:    parseFloat(obs[0]?.value),
      prior:     parseFloat(obs[1]?.value),
      prior2:    parseFloat(obs[2]?.value),
      date:      obs[0]?.date,
      priorDate: obs[1]?.date,
    };
  };

  try {
    const [
      t2y, t10y, t30y, t5y, tips10y, fedfunds,
      cpi, coreCpi, pce, corePce,
      unrate, payems, claims, contClaims,
      gdp, retail,
      wti, brent, dxy,
    ] = await Promise.all([
      fetchSeries('DGS2'),
      fetchSeries('DGS10'),
      fetchSeries('DGS30'),
      fetchSeries('DGS5'),
      fetchSeries('DFII10'),
      fetchSeries('FEDFUNDS'),
      fetchSeries('CPIAUCSL'),
      fetchSeries('CPILFESL'),
      fetchSeries('PCEPI'),
      fetchSeries('PCEPILFE'),
      fetchSeries('UNRATE'),
      fetchSeries('PAYEMS'),
      fetchSeries('ICSA'),
      fetchSeries('CCSA'),
      fetchSeries('A191RL1Q225SBEA'),
      fetchSeries('RSAFS'),
      fetchSeries('DCOILWTICO'),    // WTI crude $/barrel (daily, EIA)
      fetchSeries('DCOILBRENTEU'),  // Brent crude $/barrel (daily, EIA)
      fetchSeries('DTWEXBGS'),      // Broad USD index (daily, Fed)
    ]);

    const termPremium = t10y.latest && t2y.latest
      ? +(t10y.latest - t2y.latest).toFixed(3)
      : null;

    const nfpChange = payems.latest && payems.prior
      ? Math.round(payems.latest - payems.prior)
      : null;
    const nfpChangePrior = payems.prior && payems.prior2
      ? Math.round(payems.prior - payems.prior2)
      : null;

    const momPct = (curr, prior) =>
      curr && prior ? +((curr / prior - 1) * 100).toFixed(2) : null;

    const retailBn      = retail.latest ? +(retail.latest / 1000).toFixed(1) : null;
    const retailPriorBn = retail.prior  ? +(retail.prior  / 1000).toFixed(1) : null;

    return res.status(200).json({
      yields: {
        t2y:      { ...t2y,      delay: 'Daily (FRED / US Treasury)' },
        t5y:      { ...t5y,      delay: 'Daily (FRED / US Treasury)' },
        t10y:     { ...t10y,     delay: 'Daily (FRED / US Treasury)' },
        t30y:     { ...t30y,     delay: 'Daily (FRED / US Treasury)' },
        tips10y:  { ...tips10y,  delay: 'Daily (FRED)'               },
        fedfunds: { ...fedfunds, delay: 'Monthly (FRED)'             },
        termPremium: {
          value:  termPremium,
          label:  '10Y minus 2Y',
          signal: termPremium > 0.5 ? 'steepening'
                : termPremium < 0   ? 'inverted'
                : 'flattening',
          delay: 'Daily (derived from FRED)'
        }
      },
      commodities: {
        wti: {
          price:     wti.latest,
          prior:     wti.prior,
          change:    wti.latest && wti.prior ? +(wti.latest - wti.prior).toFixed(2) : null,
          changePct: momPct(wti.latest, wti.prior),
          date:      wti.date,
          name:      'WTI Crude Oil',
          unit:      'USD/barrel',
          delay:     'Daily (EIA via FRED) — 1 trading day lag',
          source:    'US Energy Information Administration'
        },
        brent: {
          price:     brent.latest,
          prior:     brent.prior,
          change:    brent.latest && brent.prior ? +(brent.latest - brent.prior).toFixed(2) : null,
          changePct: momPct(brent.latest, brent.prior),
          date:      brent.date,
          name:      'Brent Crude Oil',
          unit:      'USD/barrel',
          delay:     'Daily (EIA via FRED) — 1 trading day lag',
          source:    'US Energy Information Administration'
        },
        dxy: {
          price:     dxy.latest,
          prior:     dxy.prior,
          change:    dxy.latest && dxy.prior ? +(dxy.latest - dxy.prior).toFixed(2) : null,
          changePct: momPct(dxy.latest, dxy.prior),
          date:      dxy.date,
          name:      'US Dollar Index (Broad)',
          unit:      'index',
          delay:     'Daily (Federal Reserve via FRED) — 1 trading day lag',
          source:    'Federal Reserve Board H.10'
        }
      },
      macro: {
        cpi: {
          name: 'CPI', fullName: 'Consumer Price Index',
          latest: cpi.latest, prior: cpi.prior,
          date: cpi.date, priorDate: cpi.priorDate,
          momChange: momPct(cpi.latest, cpi.prior),
          unit: 'index', delay: 'Monthly — released ~2 weeks after month end (BLS via FRED)',
          source: 'Bureau of Labor Statistics'
        },
        coreCpi: {
          name: 'Core CPI', fullName: 'Core Consumer Price Index (ex Food & Energy)',
          latest: coreCpi.latest, prior: coreCpi.prior,
          date: coreCpi.date, priorDate: coreCpi.priorDate,
          momChange: momPct(coreCpi.latest, coreCpi.prior),
          unit: 'index', delay: 'Monthly (BLS via FRED)',
          source: 'Bureau of Labor Statistics'
        },
        pce: {
          name: 'PCE', fullName: 'Personal Consumption Expenditures Price Index',
          latest: pce.latest, prior: pce.prior,
          date: pce.date, priorDate: pce.priorDate,
          momChange: momPct(pce.latest, pce.prior),
          unit: 'index', delay: 'Monthly — released ~4 weeks after month end (BEA via FRED)',
          source: "Bureau of Economic Analysis — Fed's preferred inflation measure"
        },
        corePce: {
          name: 'Core PCE', fullName: 'Core Personal Consumption Expenditures (ex Food & Energy)',
          latest: corePce.latest, prior: corePce.prior,
          date: corePce.date, priorDate: corePce.priorDate,
          momChange: momPct(corePce.latest, corePce.prior),
          unit: 'index', delay: 'Monthly (BEA via FRED)',
          source: 'Bureau of Economic Analysis'
        },
        unrate: {
          name: 'Unemployment Rate', fullName: 'US Unemployment Rate (U-3)',
          latest: unrate.latest, prior: unrate.prior,
          date: unrate.date, priorDate: unrate.priorDate,
          unit: '%', delay: 'Monthly — released first Friday of following month (BLS via FRED)',
          source: 'Bureau of Labor Statistics'
        },
        nfp: {
          name: 'NFP', fullName: 'Nonfarm Payrolls — Monthly Change',
          latest: nfpChange, prior: nfpChangePrior,
          date: payems.date, priorDate: payems.priorDate,
          unit: 'thousands', delay: 'Monthly — released first Friday of following month (BLS via FRED)',
          source: 'Bureau of Labor Statistics'
        },
        claims: {
          name: 'Initial Jobless Claims', fullName: 'Initial Unemployment Insurance Claims',
          latest: claims.latest, prior: claims.prior,
          date: claims.date, priorDate: claims.priorDate,
          unit: 'persons', delay: 'Weekly — released every Thursday 8:30am ET (DOL via FRED)',
          source: 'Department of Labor'
        },
        contClaims: {
          name: 'Continuing Claims', fullName: 'Continuing Unemployment Insurance Claims',
          latest: contClaims.latest, prior: contClaims.prior,
          date: contClaims.date,
          unit: 'persons', delay: 'Weekly — released every Thursday with 1-week lag (DOL via FRED)',
          source: 'Department of Labor'
        },
        gdp: {
          name: 'GDP', fullName: 'Real Gross Domestic Product — Quarter over Quarter % Change',
          latest: gdp.latest, prior: gdp.prior,
          date: gdp.date, priorDate: gdp.priorDate,
          unit: '%', delay: 'Quarterly — advance estimate ~30 days after quarter end (BEA via FRED)',
          source: 'Bureau of Economic Analysis'
        },
        retail: {
          name: 'Retail Sales', fullName: 'Advance Retail Sales',
          latest: retailBn, prior: retailPriorBn,
          momChange: momPct(retail.latest, retail.prior),
          date: retail.date, priorDate: retail.priorDate,
          unit: 'billions USD', delay: 'Monthly — released ~2 weeks after month end (Census via FRED)',
          source: 'US Census Bureau'
        },
      },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}