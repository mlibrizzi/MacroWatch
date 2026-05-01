import { callClaude } from './api.js';

const TODAY = new Date().toISOString().split('T')[0];

async function fetchLive(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Live data error ${res.status} from ${path}`);
  return res.json();
}

export async function fetchDaily() {
  try {
    const [metals, markets, fred] = await Promise.all([
      fetchLive('/api/metals'),
      fetchLive('/api/markets'),
      fetchLive('/api/fred'),
    ]);

    const t2y  = fred.yields?.t2y?.latest;
    const t10y = fred.yields?.t10y?.latest;
    const t30y = fred.yields?.t30y?.latest;
    const dxy  = markets.fx?.dxy?.price;
    const spx  = markets.indices?.find(i => i.symbol === 'SPX')?.price;
    const gold = metals.gold?.price;

    const termPremium = fred.yields?.termPremium;
    const liquidityProxy = spx && dxy ? +(spx / dxy).toFixed(2) : null;
    const goldYieldRatio = gold && t10y ? +(gold / t10y).toFixed(1) : null;

    const lpSignal = liquidityProxy
      ? (liquidityProxy > 50 ? 'expanding' : liquidityProxy > 40 ? 'neutral' : 'tightening')
      : 'neutral';

    const gySignal = goldYieldRatio
      ? (goldYieldRatio > 800 ? 'distrust' : goldYieldRatio > 600 ? 'normal' : 'risk-on')
      : 'normal';

    return {
      metals: {
        gold:   { ...metals.gold,   delay: 'Real-time (gold-api.com)' },
        silver: { ...metals.silver, delay: 'Real-time (gold-api.com)' },
      },
      oil: {
        wti:   { ...markets.oil?.wti,   delay: '15-min delayed (Yahoo Finance)' },
        brent: { ...markets.oil?.brent, delay: '15-min delayed (Yahoo Finance)' },
      },
      fx: {
        eurusd: { ...markets.fx?.eurusd, delay: '15-min delayed (Yahoo Finance)' },
        jpyusd: { ...markets.fx?.jpyusd, delay: '15-min delayed (Yahoo Finance)' },
        dxy:    { ...markets.fx?.dxy,    delay: '15-min delayed (Yahoo Finance)' },
      },
      vix: { ...markets.vix, delay: '15-min delayed (Yahoo Finance)' },
      rates: {
        t2y:  { yield: t2y,  change_bp: t2y  && fred.yields.t2y.prior  ? +((t2y  - fred.yields.t2y.prior)  * 100).toFixed(1) : null, date: fred.yields.t2y?.date  },
        t10y: { yield: t10y, change_bp: t10y && fred.yields.t10y.prior ? +((t10y - fred.yields.t10y.prior) * 100).toFixed(1) : null, date: fred.yields.t10y?.date },
        t30y: { yield: t30y, change_bp: t30y && fred.yields.t30y.prior ? +((t30y - fred.yields.t30y.prior) * 100).toFixed(1) : null, date: fred.yields.t30y?.date },
        fed_funds: fred.yields?.fedfunds?.latest,
        tips_10y_real: fred.yields?.tips10y?.latest,
        delay: 'Daily (FRED / US Treasury)',
      },
      indices: markets.indices,
      mag7:   markets.mag7,
      derived: {
        term_premium: { ...termPremium, delay: 'Daily (derived from FRED)' },
        liquidity_proxy: {
          value: liquidityProxy,
          label: 'SPX / DXY',
          signal: lpSignal,
          note: `S&P ${spx?.toFixed(0)} / DXY ${dxy?.toFixed(2)}`,
          delay: '15-min delayed (Yahoo Finance)'
        },
        gold_vs_yield: {
          gold, t10y,
          ratio: goldYieldRatio,
          signal: gySignal,
          note: `Gold $${gold?.toFixed(0)} / 10Y ${t10y?.toFixed(2)}%`,
          delay: 'Real-time gold / Daily yield'
        }
      },
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('fetchDaily error:', err);
    throw err;
  }
}

export async function fetchWeekly() {
  try {
    const fred = await fetchLive('/api/fred');
    const m = fred.macro;

    const pctChange = (curr, prior) =>
      curr && prior ? +((curr / prior - 1) * 100).toFixed(2) : null;

    const labor = [
      {
        name: 'Unemployment Rate',
        value: `${m.unrate?.latest?.toFixed(1)}%`,
        prior: `${m.unrate?.prior?.toFixed(1)}%`,
        date: m.unrate?.date,
        direction: m.unrate?.latest > m.unrate?.prior ? 'up' : 'down',
        signal: m.unrate?.latest > 4.5 ? 'hot' : 'neutral',
        delay: 'Monthly (BLS via FRED)',
        note: 'Bureau of Labor Statistics'
      },
      {
        name: 'Nonfarm Payrolls',
        value: `${m.nfp?.latest?.toFixed(0)}k`,
        prior: `${m.nfp?.prior?.toFixed(0)}k`,
        date: m.nfp?.date,
        direction: m.nfp?.latest > m.nfp?.prior ? 'up' : 'down',
        signal: m.nfp?.latest < 100 ? 'hot' : 'neutral',
        delay: 'Monthly (BLS via FRED)',
        note: 'Bureau of Labor Statistics'
      },
      {
        name: 'Initial Jobless Claims',
        value: `${m.claims?.latest?.toFixed(0)}k`,
        prior: `${m.claims?.prior?.toFixed(0)}k`,
        date: m.claims?.date,
        direction: m.claims?.latest > m.claims?.prior ? 'up' : 'down',
        signal: m.claims?.latest > 260 ? 'hot' : 'neutral',
        delay: 'Weekly — updated every Thursday (DOL via FRED)',
        note: 'Dept of Labor. Released Thursdays 8:30am ET'
      },
    ];

    const inflation = [
      {
        name: 'CPI (Index)',
        value: m.cpi?.latest?.toFixed(1),
        prior: m.cpi?.prior?.toFixed(1),
        change: pctChange(m.cpi?.latest, m.cpi?.prior),
        date: m.cpi?.date,
        direction: m.cpi?.latest > m.cpi?.prior ? 'up' : 'down',
        signal: pctChange(m.cpi?.latest, m.cpi?.prior) > 0.4 ? 'hot' : 'neutral',
        delay: 'Monthly (BLS via FRED)',
        note: 'Bureau of Labor Statistics. Released ~2 weeks after month end'
      },
      {
        name: 'Core CPI (ex Food/Energy)',
        value: m.coreCpi?.latest?.toFixed(1),
        prior: m.coreCpi?.prior?.toFixed(1),
        change: pctChange(m.coreCpi?.latest, m.coreCpi?.prior),
        date: m.coreCpi?.date,
        direction: m.coreCpi?.latest > m.coreCpi?.prior ? 'up' : 'down',
        signal: pctChange(m.coreCpi?.latest, m.coreCpi?.prior) > 0.3 ? 'hot' : 'neutral',
        delay: 'Monthly (BLS via FRED)',
        note: 'Bureau of Labor Statistics'
      },
      {
        name: 'PCE Price Index',
        value: m.pce?.latest?.toFixed(1),
        prior: m.pce?.prior?.toFixed(1),
        change: pctChange(m.pce?.latest, m.pce?.prior),
        date: m.pce?.date,
        direction: m.pce?.latest > m.pce?.prior ? 'up' : 'down',
        signal: pctChange(m.pce?.latest, m.pce?.prior) > 0.3 ? 'hot' : 'neutral',
        delay: 'Monthly (BEA via FRED)',
        note: "Fed's preferred inflation measure. Bureau of Economic Analysis"
      },
      {
        name: 'Core PCE',
        value: m.corePce?.latest?.toFixed(1),
        prior: m.corePce?.prior?.toFixed(1),
        change: pctChange(m.corePce?.latest, m.corePce?.prior),
        date: m.corePce?.date,
        direction: m.corePce?.latest > m.corePce?.prior ? 'up' : 'down',
        signal: pctChange(m.corePce?.latest, m.corePce?.prior) > 0.3 ? 'hot' : 'neutral',
        delay: 'Monthly (BEA via FRED)',
        note: 'Bureau of Economic Analysis'
      },
    ];

    const activity = [
      {
        name: 'Real GDP QoQ',
        value: `${m.gdp?.latest?.toFixed(1)}%`,
        prior: `${m.gdp?.prior?.toFixed(1)}%`,
        date: m.gdp?.date,
        direction: m.gdp?.latest > m.gdp?.prior ? 'up' : 'down',
        signal: m.gdp?.latest < 0 ? 'hot' : 'neutral',
        delay: 'Quarterly — advance estimate ~30 days after quarter end (BEA via FRED)',
        note: 'Bureau of Economic Analysis'
      },
      {
        name: 'Retail Sales',
        value: `$${(m.retail?.latest)?.toFixed(0)}M`,
        prior: `$${(m.retail?.prior)?.toFixed(0)}M`,
        date: m.retail?.date,
        direction: m.retail?.latest > m.retail?.prior ? 'up' : 'down',
        signal: 'neutral',
        delay: 'Monthly (Census Bureau via FRED)',
        note: 'US Census Bureau'
      },
      {
        name: '10Y TIPS Real Yield',
        value: `${fred.yields?.tips10y?.latest?.toFixed(2)}%`,
        prior: `${fred.yields?.tips10y?.prior?.toFixed(2)}%`,
        date: fred.yields?.tips10y?.date,
        direction: fred.yields?.tips10y?.latest > fred.yields?.tips10y?.prior ? 'up' : 'down',
        signal: fred.yields?.tips10y?.latest > 2.0 ? 'hot' : 'neutral',
        delay: 'Daily (FRED / US Treasury)',
        note: 'Real borrowing cost. Above 2% = restrictive monetary conditions'
      },
    ];

    const fedPolicy = await callClaude(`Return JSON with current Fed policy status as of ${TODAY}:
{
  "current_rate": "X.XX%-X.XX%",
  "next_meeting": "YYYY-MM-DD",
  "market_cut_prob_jun_pct": number,
  "dots_median_2026": number,
  "powell_status": "1-2 sentence current status",
  "qt_status": "1-2 sentence balance sheet status"
}`, 'Return only valid JSON. No markdown.');

    return {
      fed_policy: { ...fedPolicy, delay: 'AI estimate — verify at federalreserve.gov' },
      labor,
      inflation,
      activity,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('fetchWeekly error:', err);
    throw err;
  }
}

export async function fetchAuctions() {
  const data = await callClaude(`Return JSON with the most recent US Treasury auction results and upcoming auctions for ${TODAY}.
{
  "recent": [
    {
      "term": "2-Year Note",
      "date": "YYYY-MM-DD",
      "size_bn": number,
      "bid_to_cover": number,
      "btc_6mo_avg": number,
      "indirect_pct": number,
      "indirect_avg": number,
      "direct_pct": number,
      "dealer_pct": number,
      "dealer_avg": number,
      "high_yield": number,
      "tail_bp": number,
      "tail_avg_bp": number,
      "status": "weak|mixed|ok",
      "note": "string"
    }
  ],
  "upcoming": [
    { "term": string, "date": "YYYY-MM-DD", "size_bn": number }
  ],
  "macro_note": "string"
}`, 'Return only valid JSON. No markdown.');

  return {
    ...data,
    delay: 'AI estimate — verify same-day results at treasurydirect.gov/auctions'
  };
}

export async function fetchMonthly() {
  const data = await callClaude(`Return JSON with latest TIC and Fed balance sheet data as of ${TODAY}.
{
  "tic": {
    "report_month": "YYYY-MM",
    "total_foreign_bn": number,
    "mom_change_bn": number,
    "yoy_change_bn": number,
    "foreign_share_pct": number,
    "china_net_since_2021_bn": number,
    "top_holders": [
      { "country": string, "holdings_bn": number, "mom_bn": number, "trend": "buying|selling|flat", "note": string }
    ]
  },
  "fed_balance": {
    "report_date": "YYYY-MM-DD",
    "total_assets_tn": number,
    "treasuries_tn": number,
    "mbs_tn": number,
    "reserves_tn": number,
    "tga_bn": number,
    "weekly_change_bn": number,
    "reserve_mgmt_note": string,
    "repo_sofr_pct": number,
    "repo_stress": "low|elevated|high"
  },
  "tga": { "current_bn": number, "prior_month_bn": number, "note": string },
  "basis_trade": { "estimated_size_tn": number, "stress_level": "low|elevated|high", "note": string, "sofr_treasury_spread_bp": number }
}`, 'Return only valid JSON. No markdown.');

  return {
    ...data,
    delay: 'TIC: Monthly 6-week lag (treasury.gov/tic) | Fed H.4.1: Weekly (federalreserve.gov)'
  };
}

export async function fetchQuarterly() {
  const data = await callClaude(`Return JSON with latest quarterly earnings and government reports as of ${TODAY}.
{
  "earnings": [
    {
      "company": string, "symbol": string, "quarter": string, "report_date": "YYYY-MM-DD",
      "eps_actual": number|null, "eps_est": number, "beat_pct": number|null,
      "revenue_bn": number|null, "yoy_rev_pct": number|null,
      "guidance": "raised|lowered|maintained|none",
      "key_note": string
    }
  ],
  "gov_reports": [
    { "report": string, "value": string, "prior": string, "revision": "up|down|none", "note": string }
  ],
  "upcoming_earnings": [
    { "company": string, "symbol": string, "date": "YYYY-MM-DD" }
  ]
}`, 'Return only valid JSON. No markdown.');

  return {
    ...data,
    delay: 'AI estimate — verify at SEC EDGAR, company IR pages, and bea.gov'
  };
}

export async function fetchIntel(userQuestion) {
  const base = `You are a macro intelligence analyst. Today: ${TODAY}. Return ONLY valid JSON. No markdown.`;

  if (userQuestion) {
    return callClaude(`User question: "${userQuestion}"
Return JSON:
{
  "answer": "detailed 3-5 paragraph response",
  "key_points": ["string"],
  "related_indicators": ["string"],
  "data_sources": ["where to verify"]
}`, base);
  }

  return callClaude(`Generate macro intelligence briefing for ${TODAY}.
Return JSON:
{
  "thesis": "3-4 sentence thesis with specific data",
  "regime": "stagflation|reflation|deflation|goldilocks|crisis",
  "regime_confidence": "high|medium|low",
  "alerts": [{ "level": "critical|warning|watch", "title": string, "detail": string, "category": string, "verify_at": string }],
  "key_risks": [{ "risk": string, "probability": "high|medium|low", "horizon": string }],
  "key_watches": [{ "indicator": string, "why": string, "threshold": string, "source": string }],
  "dalio_lens": "2-3 sentence Dalio big cycle read",
  "positioning": { "usd": string, "gold": string, "long_bonds": string, "equities": string, "rationale": string }
}`, base);
}