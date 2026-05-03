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
const dxy  = fred.commodities?.dxy?.price;
const spx  = markets.indices?.find(i => i.symbol === 'SPX')?.price;
const gold = metals.gold?.price;

const termPremium    = fred.yields?.termPremium;
const liquidityProxy = spx && dxy ? +(spx / dxy).toFixed(2) : null;
const goldYieldRatio = gold && t10y ? +(gold / t10y).toFixed(1) : null;

const lpSignal = liquidityProxy
  ? (liquidityProxy > 50 ? 'expanding' : liquidityProxy > 40 ? 'neutral' : 'tightening')
  : 'neutral';

const gySignal = goldYieldRatio
  ? (goldYieldRatio > 800 ? 'distrust' : goldYieldRatio > 600 ? 'normal' : 'risk-on')
  : 'normal';

// VIX zone
const vixPrice = markets.vix?.price;
const vixZone = !vixPrice ? 'Unknown'
  : vixPrice < 15 ? 'Complacent'
  : vixPrice < 20 ? 'Normal'
  : vixPrice < 30 ? 'Elevated'
  : vixPrice < 40 ? 'Fear'
  : 'Extreme Fear';

return {
  metals: {
    gold:   { ...metals.gold,   delay: 'Real-time (gold-api.com)' },
    silver: { ...metals.silver, delay: 'Real-time (gold-api.com)' },
  },
  oil: {
    wti:   { ...fred.commodities?.wti   },
    brent: { ...fred.commodities?.brent },
  },
  fx: {
    eurusd: { ...markets.fx?.eurusd },
    jpyusd: { ...markets.fx?.jpyusd },
    gbpusd: { ...markets.fx?.gbpusd },
    dxy:    { ...fred.commodities?.dxy },
  },
  vix: markets.vix ? {
    ...markets.vix,
    currentZone: vixZone,
    fullName: 'CBOE Volatility Index -- measures expected 30-day S&P 500 volatility',
    scale: '<15 Complacent · 15-20 Normal · 20-30 Elevated · 30-40 Fear · >40 Extreme Fear',
  } : null,
  rates: {
    t2y:  { yield: t2y,  change_bp: t2y  && fred.yields.t2y.prior  ? +((t2y  - fred.yields.t2y.prior)  * 100).toFixed(1) : null, date: fred.yields.t2y?.date  },
    t10y: { yield: t10y, change_bp: t10y && fred.yields.t10y.prior ? +((t10y - fred.yields.t10y.prior) * 100).toFixed(1) : null, date: fred.yields.t10y?.date },
    t30y: { yield: t30y, change_bp: t30y && fred.yields.t30y.prior ? +((t30y - fred.yields.t30y.prior) * 100).toFixed(1) : null, date: fred.yields.t30y?.date },
    fed_funds:     fred.yields?.fedfunds?.latest,
    fed_range:     fred.yields?.fedfunds?.targetRange,
    tips_10y_real: fred.yields?.tips10y?.latest,
    delay: 'Daily (FRED / US Treasury)',
  },
  indices: markets.indices,
  mag7:   markets.mag7,
  derived: {
    term_premium:    { ...termPremium, delay: 'Daily (derived from FRED)' },
    liquidity_proxy: {
      value: liquidityProxy, label: 'SPX / DXY', signal: lpSignal,
      note: `S&P ${spx?.toFixed(0)} / DXY ${dxy?.toFixed(2)}`,
      delay: 'Real-time SPX (Finnhub) / Daily DXY (FRED)'
    },
    gold_vs_yield: {
      gold, t10y, ratio: goldYieldRatio, signal: gySignal,
      note: `Gold $${gold?.toFixed(0)} / 10Y ${t10y?.toFixed(2)}%`,
      delay: 'Real-time gold / Daily yield (FRED)'
    }
  },
  timestamp: new Date().toISOString()
};

} catch(err) {
console.error('fetchDaily error:', err);
throw err;
}
}

export async function fetchWeekly() {
try {
const fred = await fetchLive('/api/fred');
const m = fred.macro;

const fmtNum = n => n != null ? n.toLocaleString('en-US') : '--';

const labor = [
  {
    name: 'Unemployment Rate',
    fullName: 'US Unemployment Rate (U-3)',
    value: m.unrate?.latest != null ? `${m.unrate.latest.toFixed(1)}%` : '--',
    prior: m.unrate?.prior  != null ? `${m.unrate.prior.toFixed(1)}%`  : '--',
    date: m.unrate?.date,
    direction: (m.unrate?.latest||0) > (m.unrate?.prior||0) ? 'up' : 'down',
    signal: (m.unrate?.latest||0) > 4.5 ? 'hot' : 'neutral',
    delay: m.unrate?.delay, source: m.unrate?.source,
  },
  {
    name: 'NFP',
    fullName: 'Nonfarm Payrolls -- Monthly Change',
    value: m.nfp?.latest != null ? `${m.nfp.latest>=0?'+':''}${fmtNum(m.nfp.latest)}k` : '--',
    prior: m.nfp?.prior  != null ? `${m.nfp.prior>=0?'+':''}${fmtNum(m.nfp.prior)}k`   : '--',
    date: m.nfp?.date,
    direction: (m.nfp?.latest||0) > (m.nfp?.prior||0) ? 'up' : 'down',
    signal: (m.nfp?.latest||0) < 100 ? 'hot' : 'neutral',
    delay: m.nfp?.delay, source: m.nfp?.source,
    note: m.nfp?.note || 'Monthly change in total employed persons'
  },
  {
    name: 'Initial Jobless Claims',
    fullName: 'Initial Unemployment Insurance Claims (weekly)',
    value: m.claims?.latest != null ? fmtNum(Math.round(m.claims.latest)) : '--',
    prior: m.claims?.prior  != null ? fmtNum(Math.round(m.claims.prior))  : '--',
    date: m.claims?.date,
    direction: (m.claims?.latest||0) > (m.claims?.prior||0) ? 'up' : 'down',
    signal: (m.claims?.latest||0) > 260000 ? 'hot' : (m.claims?.latest||0) < 200000 ? 'cool' : 'neutral',
    delay: m.claims?.delay, source: m.claims?.source,
    note: m.claims?.note || 'Number of new unemployment insurance filings per week'
  },
  {
    name: 'Continuing Claims',
    fullName: 'Continuing Unemployment Insurance Claims',
    value: m.contClaims?.latest != null ? fmtNum(Math.round(m.contClaims.latest)) : '--',
    prior: m.contClaims?.prior  != null ? fmtNum(Math.round(m.contClaims.prior))  : '--',
    date: m.contClaims?.date,
    direction: (m.contClaims?.latest||0) > (m.contClaims?.prior||0) ? 'up' : 'down',
    signal: (m.contClaims?.latest||0) > 1900000 ? 'hot' : 'neutral',
    delay: m.contClaims?.delay, source: m.contClaims?.source,
    note: 'Total persons currently collecting unemployment benefits'
  },
  {
    name: 'Avg Hourly Earnings',
    fullName: 'Average Hourly Earnings -- All Private Employees (YoY %)',
    value: m.ahe?.yoyChange != null ? `${m.ahe.yoyChange>0?'+':''}${m.ahe.yoyChange}% YoY` : '--',
    prior: m.ahe?.prior != null ? `$${m.ahe.prior.toFixed(2)}/hr` : '--',
    date: m.ahe?.date,
    direction: (m.ahe?.yoyChange||0) > 3.5 ? 'up' : 'down',
    signal: (m.ahe?.yoyChange||0) > 4.0 ? 'hot' : (m.ahe?.yoyChange||0) < 3.0 ? 'cool' : 'neutral',
    delay: m.ahe?.delay, source: m.ahe?.source,
    note: m.ahe?.note || 'Key wage inflation input -- Fed watches closely'
  },
];

const inflation = [
  {
    name: 'CPI', fullName: 'Consumer Price Index',
    value: m.cpi?.momChange != null ? `${m.cpi.momChange>0?'+':''}${m.cpi.momChange}% MoM` : '--',
    yoy:   m.cpi?.yoyChange != null ? `${m.cpi.yoyChange}% YoY` : null,
    prior: m.cpi?.prior?.toFixed(1), date: m.cpi?.date,
    direction: (m.cpi?.momChange||0) > 0 ? 'up' : 'down',
    signal: (m.cpi?.momChange||0) > 0.4 ? 'hot' : 'neutral',
    delay: m.cpi?.delay, source: m.cpi?.source,
  },
  {
    name: 'Core CPI', fullName: 'Core Consumer Price Index (ex Food & Energy)',
    value: m.coreCpi?.momChange != null ? `${m.coreCpi.momChange>0?'+':''}${m.coreCpi.momChange}% MoM` : '--',
    yoy:   m.coreCpi?.yoyChange != null ? `${m.coreCpi.yoyChange}% YoY` : null,
    prior: m.coreCpi?.prior?.toFixed(1), date: m.coreCpi?.date,
    direction: (m.coreCpi?.momChange||0) > 0 ? 'up' : 'down',
    signal: (m.coreCpi?.momChange||0) > 0.3 ? 'hot' : 'neutral',
    delay: m.coreCpi?.delay, source: m.coreCpi?.source,
  },
  {
    name: 'PCE', fullName: 'Personal Consumption Expenditures Price Index',
    value: m.pce?.momChange != null ? `${m.pce.momChange>0?'+':''}${m.pce.momChange}% MoM` : '--',
    yoy:   m.pce?.yoyChange != null ? `${m.pce.yoyChange}% YoY` : null,
    prior: m.pce?.prior?.toFixed(1), date: m.pce?.date,
    direction: (m.pce?.momChange||0) > 0 ? 'up' : 'down',
    signal: (m.pce?.momChange||0) > 0.3 ? 'hot' : 'neutral',
    delay: m.pce?.delay, source: m.pce?.source,
    note: "Fed's preferred inflation measure"
  },
  {
    name: 'Core PCE', fullName: 'Core Personal Consumption Expenditures (ex Food & Energy)',
    value: m.corePce?.momChange != null ? `${m.corePce.momChange>0?'+':''}${m.corePce.momChange}% MoM` : '--',
    yoy:   m.corePce?.yoyChange != null ? `${m.corePce.yoyChange}% YoY` : null,
    prior: m.corePce?.prior?.toFixed(1), date: m.corePce?.date,
    direction: (m.corePce?.momChange||0) > 0 ? 'up' : 'down',
    signal: (m.corePce?.momChange||0) > 0.3 ? 'hot' : 'neutral',
    delay: m.corePce?.delay, source: m.corePce?.source,
  },
];

const activity = [
  {
    name: 'GDP', fullName: 'Real Gross Domestic Product -- QoQ Annualized % Change',
    value: m.gdp?.latest != null ? `${m.gdp.latest>0?'+':''}${m.gdp.latest.toFixed(1)}%` : '--',
    prior: m.gdp?.prior  != null ? `${m.gdp.prior>0?'+':''}${m.gdp.prior.toFixed(1)}%`   : '--',
    date: m.gdp?.date,
    direction: (m.gdp?.latest||0) > (m.gdp?.prior||0) ? 'up' : 'down',
    signal: (m.gdp?.latest||0) < 0 ? 'hot' : 'neutral',
    delay: m.gdp?.delay, source: m.gdp?.source,
    note: m.gdp?.note || 'Quarterly advance estimate'
  },
  {
    name: 'Retail Sales', fullName: 'Advance Retail Sales',
    value: m.retail?.latest != null ? `$${m.retail.latest}B` : '--',
    prior: m.retail?.prior  != null ? `$${m.retail.prior}B`  : '--',
    date: m.retail?.date,
    direction: (m.retail?.momChange||0) > 0 ? 'up' : 'down',
    signal: (m.retail?.momChange||0) < -1 ? 'hot' : 'neutral',
    delay: m.retail?.delay, source: m.retail?.source,
    note: m.retail?.note || ''
  },
  {
    name: '10Y TIPS Real Yield',
    fullName: '10-Year Treasury Inflation-Protected Securities Real Yield',
    value: fred.yields?.tips10y?.latest != null ? `${fred.yields.tips10y.latest.toFixed(2)}%` : '--',
    prior: fred.yields?.tips10y?.prior  != null ? `${fred.yields.tips10y.prior.toFixed(2)}%`  : '--',
    date: fred.yields?.tips10y?.date,
    direction: (fred.yields?.tips10y?.latest||0) > (fred.yields?.tips10y?.prior||0) ? 'up' : 'down',
    signal: (fred.yields?.tips10y?.latest||0) > 2.0 ? 'hot' : 'neutral',
    delay: 'Daily (FRED / US Treasury)',
    source: 'US Treasury via FRED',
    note: 'Above 2% = restrictive real borrowing conditions'
  },
];

// Fed policy -- use real FRED rate + Claude for narrative
const fedFunds     = fred.yields?.fedfunds?.latest;
const fedRange     = fred.yields?.fedfunds?.targetRange;
const fedFundsDate = fred.yields?.fedfunds?.date;

const fedNarrative = await callClaude(
  `The actual Fed Funds Rate is ${fedRange || fedFunds+'%'} as of ${fedFundsDate}. 

The next FOMC meeting is June 16-17, 2026.
The Fed held rates at its April 29 2026 meeting with 4 dissents - most since 1992.
Return JSON:
{
"market_cut_prob_jun_pct": number,
"dots_median_2026": number,
"powell_status": "1-2 sentence current status referencing the April 29 hold and 4 dissents",
"qt_status": "1-2 sentence balance sheet status - QT ended Dec 2025, reserve management purchases underway",
"fomc_dissents": 4,
"fomc_note": "Most dissents since October 1992 - signals significant internal disagreement"
}`,
'Return only raw JSON. No markdown. Start with {'
);

return {
  fed_policy: {
    current_rate:  fedRange || `${fedFunds}%`,
    effr:          fedFunds,
    next_meeting:  'June 16-17, 2026',
    fomc_dissents: fedNarrative?.fomc_dissents || 4,
    fomc_note:     fedNarrative?.fomc_note || 'Most dissents since October 1992',
    market_cut_prob_jun_pct: fedNarrative?.market_cut_prob_jun_pct,
    powell_status: fedNarrative?.powell_status,
    qt_status:     fedNarrative?.qt_status,
    delay: `Real EFFR: FRED (${fedFundsDate}) · Narrative: AI estimate`
  },
  labor,
  inflation,
  activity,
  timestamp: new Date().toISOString()
};

} catch(err) {
console.error('fetchWeekly error:', err);
throw err;
}
}

export async function fetchAuctions() {
try {
// Use real TreasuryDirect data
const data = await fetchLive('/api/auctions');
return data;
} catch(err) {
console.error('fetchAuctions error:', err);
// Fallback to Claude estimate with real yield context
let yieldContext = '';
try {
const fred = await fetchLive('/api/fred');
const t2y  = fred.yields?.t2y?.latest;
const t10y = fred.yields?.t10y?.latest;
const t30y = fred.yields?.t30y?.latest;
const rate = fred.yields?.fedfunds?.targetRange || fred.yields?.fedfunds?.latest + '%';
yieldContext = `Current market context: Fed Funds Rate ${rate}. 2Y yield ${t2y}%. 10Y yield ${t10y}%. 30Y yield ${t30y}%.`;
} catch(e) {}

const fallback = await callClaude(
  yieldContext + ' Return JSON with recent Treasury auction results as of ' + TODAY + '. Fields: recent array with term/date/size_bn/bid_to_cover/btc_6mo_avg/indirect_pct/indirect_avg/direct_pct/dealer_pct/dealer_avg/high_yield/tail_bp/tail_avg_bp/status/note. Upcoming array with term/date/size_bn. macro_note string.',
'Return only raw JSON. No markdown. Start with {'
);
return { …fallback, delay: '⚠ AI estimate (TreasuryDirect unavailable) - verify at treasurydirect.gov' };
}
}

export async function fetchMonthly() {
// Get real Fed balance sheet from FRED
let fredBalance = null;
try {
const fred = await fetchLive('/api/fred');
if (fred && fred.fedBalance) {
fredBalance = fred.fedBalance;
} else {
console.error('fetchMonthly: fedBalance missing from FRED response', Object.keys(fred || {}));
}
} catch(e) {
console.error('fetchMonthly: FRED fetch failed', e.message);
}

const data = await callClaude(
'Return JSON with latest TIC foreign holdings and basis trade data as of ' + TODAY + '. Fields: tic object with report_month/total_foreign_bn/mom_change_bn/yoy_change_bn/foreign_share_pct/china_net_since_2021_bn/top_holders array. basis_trade object with estimated_size_tn/stress_level/note/sofr_treasury_spread_bp.'
'Return only raw JSON. No markdown. Start with {'
);

// Merge real FRED balance sheet data with AI TIC data
return {
…data,
// Override fed_balance with real FRED data
fed_balance: fredBalance ? {
report_date:    new Date().toISOString().split('T')[0],
total_assets_tn: fredBalance.totalAssets?.value,
treasuries_tn:   fredBalance.treasuries?.value,
mbs_tn:          fredBalance.mbs?.value,
reserves_tn:     fredBalance.reserves?.value,
tga_bn:          fredBalance.tga?.value,
weekly_change_bn: fredBalance.weeklyChange?.value,
reserve_mgmt_note: 'QT ended Dec 2025. Fed now in reserve management phase - buying T-bills to maintain adequate reserves. Balance sheet stabilizing.',
data_source: 'Real FRED data (H.4.1 weekly release)',
} : null,
tga: fredBalance?.tga ? {
current_bn:      fredBalance.tga.value,
prior_month_bn:  fredBalance.tga.prior,
date:            fredBalance.tga.date,
note:            'Treasury General Account - key liquidity indicator. High TGA = Treasury has cash buffer. Low TGA = X-date risk.',
delay:           fredBalance.tga.delay,
source:          'US Treasury via FRED (WDTGAL)'
} : null,
delay: 'Fed Balance Sheet: Real FRED H.4.1 weekly data | TIC: AI estimate - verify at treasury.gov/tic (6-week lag)'
};
}

export async function fetchQuarterly() {
// Get real earnings from Finnhub
let realEarnings = [];
try {
const e = await fetchLive('/api/earnings');
realEarnings = e.earnings || [];
} catch(err) {}

// Get gov reports via Claude with correct Fed rate context
const govData = await callClaude(
'As of ' + TODAY + ', Fed Funds Rate is 3.50-3.75% held April 29 2026. GDP Q1 2026 advance estimate was +2.0% annualized released April 30 2026. Return JSON with gov_reports array (report/value/prior/revision/note/source fields) and upcoming_earnings array (company/symbol/date/eps_est fields). Include GDP Q1 2026, Federal Deficit FY2026, Debt-to-GDP, Federal Debt Outstanding, Trade Balance. Upcoming: AMZN May 6, GOOGL May 8, META May 12, NVDA May 20, WMT May 15.'
'Return only raw JSON. No markdown. Start with {'
);

// Merge real earnings with gov report data
const companyMeta = {
AAPL:  { name: 'Apple',      sector: 'Technology'      },
MSFT:  { name: 'Microsoft',  sector: 'Technology'      },
NVDA:  { name: 'Nvidia',     sector: 'Technology'      },
GOOGL: { name: 'Alphabet',   sector: 'Technology'      },
AMZN:  { name: 'Amazon',     sector: 'Consumer/Cloud'  },
META:  { name: 'Meta',       sector: 'Technology'      },
TSLA:  { name: 'Tesla',      sector: 'Automotive'      },
JPM:   { name: 'JPMorgan',   sector: 'Financials'      },
XOM:   { name: 'ExxonMobil', sector: 'Energy'          },
};

const earnings = realEarnings.map(e => ({
company:    companyMeta[e.symbol]?.name || e.symbol,
symbol:     e.symbol,
sector:     companyMeta[e.symbol]?.sector,
quarter:    e.quarter,
report_date: e.reportDate,
eps_actual: e.epsActual,
eps_est:    e.epsEst,
beat_pct:   e.beatPct,
guidance:   null,
key_note:   `EPS ${e.epsActual != null ? (e.epsActual >= e.epsEst ? 'beat' : 'missed') + ` est by ${Math.abs(e.beatPct||0).toFixed(1)}%` : 'pending'}`,
delay:      e.delay,
source:     e.source
}));

return {
earnings,
gov_reports:       govData?.gov_reports || [],
upcoming_earnings: govData?.upcoming_earnings || [],
delay: 'Earnings: Real Finnhub/SEC data | Gov reports: AI estimate anchored to real GDP/Fed rate | Verify at bea.gov, treasury.gov'
};
}

export async function fetchIntel(userQuestion) {
const base = `You are a macro intelligence analyst specializing in US debt cycle analysis, Treasury markets, and global capital flows. Today is ${TODAY}. Key current data: Fed Funds Rate 3.50-3.75% (held April 29 2026, 4 dissents). Gold ~$4615. VIX ~17 (NORMAL). S&P ~7200. 10Y yield ~4.38%. CPI YoY ~3.3%. GDP Q1 2026 +2.0%. Deficit ~$2T/yr. Debt/GDP ~122%. Return ONLY raw JSON. No markdown. No backticks. First character must be {`;

if (userQuestion) {
    return callClaude('Answer this question with JSON fields: answer, key_points, data_sources. Question: ' + userQuestion, sys);
}

    return callClaude('Today ' + TODAY + '. Fed 3.50-3.75pct. Gold 4615. VIX 17. SP500 7200. 10Y 4.38pct. CPI 3.3pct. GDP Q1 2.0pct. Deficit 2T. Debt/GDP 122pct. 4 FOMC dissents April 29 2026. Return JSON with fields: thesis, regime, regime_confidence, alerts array with level/title/detail/category fields, key_risks array with risk/probability/horizon fields, key_watches array with indicator/why/threshold/source fields, dalio_lens string, positioning object with usd/gold/long_bonds/equities/rationale.', sys);
    return callClaude(chr(39)Answer question with JSON: answer, key_points, data_sources. Question: chr(39)+userQuestion, sys);