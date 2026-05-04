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
        eurusd: { ...markets.fx?.eurusd, delay: 'Hourly (open.er-api.com)' },
        jpyusd: { ...markets.fx?.jpyusd, delay: 'Hourly (open.er-api.com)' },
        gbpusd: { ...markets.fx?.gbpusd, delay: 'Hourly (open.er-api.com)' },
        dxy:    { ...markets.fx?.dxy,    delay: 'Real-time via UUP ETF (Finnhub)' },
      },
      vix: { ...markets.vix, delay: 'Real-time via UVXY ETF (Finnhub)' },
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
        term_premium:   { ...termPremium, delay: 'Daily (derived from FRED)' },
        liquidity_proxy: {
          value: liquidityProxy, label: 'SPX / DXY', signal: lpSignal,
          note: `S&P ${spx?.toFixed(0)} / DXY ${dxy?.toFixed(2)}`,
          delay: 'Real-time (Finnhub)'
        },
        gold_vs_yield: {
          gold, t10y, ratio: goldYieldRatio, signal: gySignal,
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

    const fmtNum = (n) => n != null ? n.toLocaleString('en-US') : '—';

    const labor = [
      {
        name: m.unrate?.name,
        fullName: m.unrate?.fullName,
        value: `${m.unrate?.latest?.toFixed(1)}%`,
        prior: `${m.unrate?.prior?.toFixed(1)}%`,
        date: m.unrate?.date,
        direction: m.unrate?.latest > m.unrate?.prior ? 'up' : 'down',
        signal: m.unrate?.latest > 4.5 ? 'hot' : m.unrate?.latest < 3.8 ? 'cool' : 'neutral',
        delay: m.unrate?.delay,
        source: m.unrate?.source,
      },
      {
        name: m.nfp?.name,
        fullName: m.nfp?.fullName,
        value: m.nfp?.latest != null
          ? `${m.nfp.latest >= 0 ? '+' : ''}${fmtNum(m.nfp.latest)}k`
          : '—',
        prior: m.nfp?.prior != null
          ? `${m.nfp.prior >= 0 ? '+' : ''}${fmtNum(m.nfp.prior)}k`
          : '—',
        date: m.nfp?.date,
        direction: (m.nfp?.latest || 0) > (m.nfp?.prior || 0) ? 'up' : 'down',
        signal: (m.nfp?.latest || 0) < 100 ? 'hot' : (m.nfp?.latest || 0) > 250 ? 'cool' : 'neutral',
        delay: m.nfp?.delay,
        source: m.nfp?.source,
        note: 'Monthly change in employed persons'
      },
      {
        name: m.claims?.name,
        fullName: m.claims?.fullName,
        value: m.claims?.latest != null ? fmtNum(Math.round(m.claims.latest)) : '—',
        prior: m.claims?.prior != null ? fmtNum(Math.round(m.claims.prior)) : '—',
        date: m.claims?.date,
        direction: m.claims?.latest > m.claims?.prior ? 'up' : 'down',
        signal: m.claims?.latest > 260000 ? 'hot' : m.claims?.latest < 200000 ? 'cool' : 'neutral',
        delay: m.claims?.delay,
        source: m.claims?.source,
        note: 'Number of new unemployment filings per week'
      },
      {
        name: m.contClaims?.name,
        fullName: m.contClaims?.fullName,
        value: m.contClaims?.latest != null ? fmtNum(Math.round(m.contClaims.latest)) : '—',
        prior: m.contClaims?.prior != null ? fmtNum(Math.round(m.contClaims.prior)) : '—',
        date: m.contClaims?.date,
        direction: m.contClaims?.latest > m.contClaims?.prior ? 'up' : 'down',
        signal: m.contClaims?.latest > 1900000 ? 'hot' : 'neutral',
        delay: m.contClaims?.delay,
        source: m.contClaims?.source,
        note: 'Total persons currently collecting unemployment benefits'
      },
    ];

    const inflation = [
      {
        name: m.cpi?.name,
        fullName: m.cpi?.fullName,
        value: m.cpi?.momChange != null ? `${m.cpi.momChange > 0 ? '+' : ''}${m.cpi.momChange}% MoM` : '—',
        prior: m.cpi?.prior?.toFixed(1),
        date: m.cpi?.date,
        direction: (m.cpi?.momChange || 0) > 0 ? 'up' : 'down',
        signal: (m.cpi?.momChange || 0) > 0.4 ? 'hot' : 'neutral',
        delay: m.cpi?.delay,
        source: m.cpi?.source,
      },
      {
        name: m.coreCpi?.name,
        fullName: m.coreCpi?.fullName,
        value: m.coreCpi?.momChange != null ? `${m.coreCpi.momChange > 0 ? '+' : ''}${m.coreCpi.momChange}% MoM` : '—',
        prior: m.coreCpi?.prior?.toFixed(1),
        date: m.coreCpi?.date,
        direction: (m.coreCpi?.momChange || 0) > 0 ? 'up' : 'down',
        signal: (m.coreCpi?.momChange || 0) > 0.3 ? 'hot' : 'neutral',
        delay: m.coreCpi?.delay,
        source: m.coreCpi?.source,
      },
      {
        name: m.pce?.name,
        fullName: m.pce?.fullName,
        value: m.pce?.momChange != null ? `${m.pce.momChange > 0 ? '+' : ''}${m.pce.momChange}% MoM` : '—',
        prior: m.pce?.prior?.toFixed(1),
        date: m.pce?.date,
        direction: (m.pce?.momChange || 0) > 0 ? 'up' : 'down',
        signal: (m.pce?.momChange || 0) > 0.3 ? 'hot' : 'neutral',
        delay: m.pce?.delay,
        source: m.pce?.source,
        note: "Fed's preferred inflation measure"
      },
      {
        name: m.corePce?.name,
        fullName: m.corePce?.fullName,
        value: m.corePce?.momChange != null ? `${m.corePce.momChange > 0 ? '+' : ''}${m.corePce.momChange}% MoM` : '—',
        prior: m.corePce?.prior?.toFixed(1),
        date: m.corePce?.date,
        direction: (m.corePce?.momChange || 0) > 0 ? 'up' : 'down',
        signal: (m.corePce?.momChange || 0) > 0.3 ? 'hot' : 'neutral',
        delay: m.corePce?.delay,
        source: m.corePce?.source,
      },
    ];

    const activity = [
      {
        name: m.gdp?.name,
        fullName: m.gdp?.fullName,
        value: m.gdp?.latest != null ? `${m.gdp.latest > 0 ? '+' : ''}${m.gdp.latest.toFixed(1)}%` : '—',
        prior: m.gdp?.prior != null ? `${m.gdp.prior > 0 ? '+' : ''}${m.gdp.prior.toFixed(1)}%` : '—',
        date: m.gdp?.date,
        direction: (m.gdp?.latest || 0) > (m.gdp?.prior || 0) ? 'up' : 'down',
        signal: (m.gdp?.latest || 0) < 0 ? 'hot' : (m.gdp?.latest || 0) > 2.5 ? 'cool' : 'neutral',
        delay: m.gdp?.delay,
        source: m.gdp?.source,
      },
      {
        name: m.retail?.name,
        fullName: m.retail?.fullName,
        value: m.retail?.latest != null ? `$${m.retail.latest}B` : '—',
        prior: m.retail?.prior != null ? `$${m.retail.prior}B` : '—',
        momChange: m.retail?.momChange,
        date: m.retail?.date,
        direction: (m.retail?.momChange || 0) > 0 ? 'up' : 'down',
        signal: (m.retail?.momChange || 0) < -1 ? 'hot' : 'neutral',
        delay: m.retail?.delay,
        source: m.retail?.source,
        note: m.retail?.momChange != null ? `${m.retail.momChange > 0 ? '+' : ''}${m.retail.momChange}% MoM` : ''
      },
      {
        name: '10Y TIPS Real Yield',
        fullName: '10-Year Treasury Inflation-Protected Securities Real Yield',
        value: fred.yields?.tips10y?.latest != null ? `${fred.yields.tips10y.latest.toFixed(2)}%` : '—',
        prior: fred.yields?.tips10y?.prior != null ? `${fred.yields.tips10y.prior.toFixed(2)}%` : '—',
        date: fred.yields?.tips10y?.date,
        direction: fred.yields?.tips10y?.latest > fred.yields?.tips10y?.prior ? 'up' : 'down',
        signal: fred.yields?.tips10y?.latest > 2.0 ? 'hot' : 'neutral',
        delay: 'Daily (FRED / US Treasury)',
        source: 'US Treasury via FRED',
        note: 'Above 2% = restrictive real borrowing conditions'
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
}`, 'Return only raw JSON. No markdown fences. No backticks. Start with {');

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
  try {
    const data = await fetchLive('/api/auctions');
    return data;
  } catch(err) {
    console.error('fetchAuctions error:', err);
    return { recent: [], upcoming: [], macro_note: 'TreasuryDirect unavailable - verify at treasurydirect.gov', delay: 'Error loading auction data' };
  }
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
}`, 'Return only raw JSON. No markdown fences. No backticks. Start with {');

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
}`, 'Return only raw JSON. No markdown fences. No backticks. Start with {');

  return {
    ...data,
    delay: 'AI estimate — verify at SEC EDGAR, company IR pages, bea.gov'
  };
}

export async function fetchIntel(userQuestion) {
  const base = `You are a macro intelligence analyst. Today: ${TODAY}. Return ONLY raw JSON. No markdown fences. No backticks. Start response with {`;

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