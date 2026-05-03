import { callClaude } from ‘./api.js’;

var TODAY = new Date().toISOString().split(‘T’)[0];

async function fetchLive(path) {
var res = await fetch(path);
if (!res.ok) throw new Error(’Live data error ’ + res.status + ’ from ’ + path);
return res.json();
}

export async function fetchDaily() {
try {
var results = await Promise.allSettled([
fetchLive(’/api/metals’),
fetchLive(’/api/markets’),
fetchLive(’/api/fred’),
]);
var metals  = results[0].status === ‘fulfilled’ ? results[0].value : {};
var markets = results[1].status === ‘fulfilled’ ? results[1].value : {};
var fred    = results[2].status === ‘fulfilled’ ? results[2].value : {};

```
var t2y  = fred.yields && fred.yields.t2y  ? fred.yields.t2y.latest  : null;
var t10y = fred.yields && fred.yields.t10y ? fred.yields.t10y.latest : null;
var t30y = fred.yields && fred.yields.t30y ? fred.yields.t30y.latest : null;
var dxy  = fred.commodities && fred.commodities.dxy ? fred.commodities.dxy.price : null;
var spx  = markets.indices ? markets.indices.find(function(i) { return i.symbol === 'SPX'; }) : null;
var spxPrice = spx ? spx.price : null;
var gold = metals.gold ? metals.gold.price : null;

var termPremium = fred.yields && fred.yields.termPremium ? fred.yields.termPremium : null;
var liquidityProxy = spxPrice && dxy ? +(spxPrice / dxy).toFixed(2) : null;
var goldYieldRatio = gold && t10y ? +(gold / t10y).toFixed(1) : null;

var lpSignal = !liquidityProxy ? 'neutral'
  : liquidityProxy > 50 ? 'expanding'
  : liquidityProxy > 40 ? 'neutral'
  : 'tightening';

var gySignal = !goldYieldRatio ? 'normal'
  : goldYieldRatio > 800 ? 'distrust'
  : goldYieldRatio > 600 ? 'normal'
  : 'risk-on';

var vixPrice = markets.vix ? markets.vix.price : null;
var vixZone = !vixPrice ? 'Unknown'
  : vixPrice < 15 ? 'Complacent'
  : vixPrice < 20 ? 'Normal'
  : vixPrice < 30 ? 'Elevated'
  : vixPrice < 40 ? 'Fear'
  : 'Extreme Fear';

return {
  metals: {
    gold:   Object.assign({}, metals.gold,   { delay: 'Real-time (gold-api.com)' }),
    silver: Object.assign({}, metals.silver, { delay: 'Real-time (gold-api.com)' }),
  },
  oil: {
    wti:   fred.commodities ? fred.commodities.wti   : null,
    brent: fred.commodities ? fred.commodities.brent : null,
  },
  fx: {
    eurusd: markets.fx ? markets.fx.eurusd : null,
    jpyusd: markets.fx ? markets.fx.jpyusd : null,
    gbpusd: markets.fx ? markets.fx.gbpusd : null,
    dxy:    fred.commodities ? fred.commodities.dxy : null,
  },
  vix: markets.vix ? Object.assign({}, markets.vix, {
    currentZone: vixZone,
    fullName: 'CBOE Volatility Index',
    scale: 'Under 15 Complacent | 15-20 Normal | 20-30 Elevated | 30-40 Fear | Over 40 Extreme',
    delay: 'Real-time (Finnhub / CBOE)'
  }) : null,
  rates: {
    t2y:  { yield: t2y,  change_bp: t2y  && fred.yields.t2y.prior  ? +((t2y  - fred.yields.t2y.prior)  * 100).toFixed(1) : null, date: fred.yields && fred.yields.t2y  ? fred.yields.t2y.date  : null },
    t10y: { yield: t10y, change_bp: t10y && fred.yields.t10y.prior ? +((t10y - fred.yields.t10y.prior) * 100).toFixed(1) : null, date: fred.yields && fred.yields.t10y ? fred.yields.t10y.date : null },
    t30y: { yield: t30y, change_bp: t30y && fred.yields.t30y.prior ? +((t30y - fred.yields.t30y.prior) * 100).toFixed(1) : null, date: fred.yields && fred.yields.t30y ? fred.yields.t30y.date : null },
    fed_funds:     fred.yields && fred.yields.fedfunds ? fred.yields.fedfunds.latest : null,
    fed_range:     fred.yields && fred.yields.fedfunds ? fred.yields.fedfunds.targetRange : null,
    tips_10y_real: fred.yields && fred.yields.tips10y  ? fred.yields.tips10y.latest  : null,
    delay: 'Daily (FRED / US Treasury)',
  },
  indices: markets.indices || [],
  mag7:   markets.mag7 || [],
  derived: {
    term_premium:    Object.assign({}, termPremium, { delay: 'Daily (derived from FRED)' }),
    liquidity_proxy: {
      value: liquidityProxy, label: 'SPX / DXY', signal: lpSignal,
      note: 'S&P ' + (spxPrice ? spxPrice.toFixed(0) : 'N/A') + ' / DXY ' + (dxy ? dxy.toFixed(2) : 'N/A'),
      delay: 'Real-time SPX (Finnhub) / Daily DXY (FRED)'
    },
    gold_vs_yield: {
      gold: gold, t10y: t10y, ratio: goldYieldRatio, signal: gySignal,
      note: 'Gold $' + (gold ? gold.toFixed(0) : 'N/A') + ' / 10Y ' + (t10y ? t10y.toFixed(2) : 'N/A') + '%',
      delay: 'Real-time gold / Daily yield (FRED)'
    }
  },
  timestamp: new Date().toISOString()
};
```

} catch(err) {
console.error(‘fetchDaily error:’, err);
throw err;
}
}

export async function fetchWeekly() {
try {
var fred = await fetchLive(’/api/fred’);
var m = fred.macro || {};

```
var fmtNum = function(n) { return n != null ? n.toLocaleString('en-US') : 'N/A'; };
var fmtPct = function(n, decimals) { return n != null ? (n > 0 ? '+' : '') + n.toFixed(decimals || 1) + '%' : 'N/A'; };

var labor = [
  {
    name: 'Unemployment Rate', fullName: 'US Unemployment Rate (U-3)',
    value: m.unrate && m.unrate.latest != null ? m.unrate.latest.toFixed(1) + '%' : 'N/A',
    prior: m.unrate && m.unrate.prior  != null ? m.unrate.prior.toFixed(1)  + '%' : 'N/A',
    date: m.unrate ? m.unrate.date : null,
    direction: m.unrate && m.unrate.latest > m.unrate.prior ? 'up' : 'down',
    signal: m.unrate && m.unrate.latest > 4.5 ? 'hot' : 'neutral',
    delay: 'Monthly - released first Friday of following month (BLS via FRED)',
    source: 'Bureau of Labor Statistics'
  },
  {
    name: 'NFP', fullName: 'Nonfarm Payrolls Monthly Change',
    value: m.nfp && m.nfp.latest != null ? (m.nfp.latest >= 0 ? '+' : '') + fmtNum(m.nfp.latest) + 'k' : 'N/A',
    prior: m.nfp && m.nfp.prior  != null ? (m.nfp.prior  >= 0 ? '+' : '') + fmtNum(m.nfp.prior)  + 'k' : 'N/A',
    date: m.nfp ? m.nfp.date : null,
    direction: m.nfp && m.nfp.latest > m.nfp.prior ? 'up' : 'down',
    signal: m.nfp && m.nfp.latest < 100 ? 'hot' : 'neutral',
    delay: 'Monthly - released first Friday of following month (BLS via FRED)',
    source: 'Bureau of Labor Statistics',
    note: m.nfp ? m.nfp.note : 'Monthly change in total employed persons'
  },
  {
    name: 'Initial Jobless Claims', fullName: 'Initial Unemployment Insurance Claims weekly',
    value: m.claims && m.claims.latest != null ? fmtNum(Math.round(m.claims.latest)) : 'N/A',
    prior: m.claims && m.claims.prior  != null ? fmtNum(Math.round(m.claims.prior))  : 'N/A',
    date: m.claims ? m.claims.date : null,
    direction: m.claims && m.claims.latest > m.claims.prior ? 'up' : 'down',
    signal: m.claims && m.claims.latest > 260000 ? 'hot' : m.claims && m.claims.latest < 200000 ? 'cool' : 'neutral',
    delay: 'Weekly - released every Thursday 8:30am ET (DOL via FRED)',
    source: 'Department of Labor',
    note: m.claims ? m.claims.note : 'Number of new unemployment insurance filings per week'
  },
  {
    name: 'Continuing Claims', fullName: 'Continuing Unemployment Insurance Claims',
    value: m.contClaims && m.contClaims.latest != null ? fmtNum(Math.round(m.contClaims.latest)) : 'N/A',
    prior: m.contClaims && m.contClaims.prior  != null ? fmtNum(Math.round(m.contClaims.prior))  : 'N/A',
    date: m.contClaims ? m.contClaims.date : null,
    direction: m.contClaims && m.contClaims.latest > m.contClaims.prior ? 'up' : 'down',
    signal: m.contClaims && m.contClaims.latest > 1900000 ? 'hot' : 'neutral',
    delay: 'Weekly - released every Thursday with 1-week lag (DOL via FRED)',
    source: 'Department of Labor'
  },
  {
    name: 'Avg Hourly Earnings', fullName: 'Average Hourly Earnings YoY All Private Employees',
    value: m.ahe && m.ahe.yoyChange != null ? (m.ahe.yoyChange > 0 ? '+' : '') + m.ahe.yoyChange + '% YoY' : 'N/A',
    prior: m.ahe && m.ahe.prior != null ? '$' + m.ahe.prior.toFixed(2) + '/hr' : 'N/A',
    date: m.ahe ? m.ahe.date : null,
    direction: m.ahe && m.ahe.yoyChange > 3.5 ? 'up' : 'down',
    signal: m.ahe && m.ahe.yoyChange > 4.0 ? 'hot' : 'neutral',
    delay: 'Monthly (BLS via FRED)',
    source: 'Bureau of Labor Statistics',
    note: m.ahe ? m.ahe.note : 'Key wage inflation input'
  },
];

var inflation = [
  {
    name: 'CPI', fullName: 'Consumer Price Index',
    value: m.cpi && m.cpi.momChange != null ? (m.cpi.momChange > 0 ? '+' : '') + m.cpi.momChange + '% MoM' : 'N/A',
    yoy:   m.cpi && m.cpi.yoyChange != null ? m.cpi.yoyChange + '% YoY' : null,
    prior: m.cpi && m.cpi.prior != null ? m.cpi.prior.toFixed(1) : 'N/A',
    date: m.cpi ? m.cpi.date : null,
    direction: m.cpi && m.cpi.momChange > 0 ? 'up' : 'down',
    signal: m.cpi && m.cpi.momChange > 0.4 ? 'hot' : 'neutral',
    delay: 'Monthly - released ~2 weeks after month end (BLS via FRED)',
    source: 'Bureau of Labor Statistics'
  },
  {
    name: 'Core CPI', fullName: 'Core Consumer Price Index ex Food and Energy',
    value: m.coreCpi && m.coreCpi.momChange != null ? (m.coreCpi.momChange > 0 ? '+' : '') + m.coreCpi.momChange + '% MoM' : 'N/A',
    yoy:   m.coreCpi && m.coreCpi.yoyChange != null ? m.coreCpi.yoyChange + '% YoY' : null,
    prior: m.coreCpi && m.coreCpi.prior != null ? m.coreCpi.prior.toFixed(1) : 'N/A',
    date: m.coreCpi ? m.coreCpi.date : null,
    direction: m.coreCpi && m.coreCpi.momChange > 0 ? 'up' : 'down',
    signal: m.coreCpi && m.coreCpi.momChange > 0.3 ? 'hot' : 'neutral',
    delay: 'Monthly (BLS via FRED)',
    source: 'Bureau of Labor Statistics'
  },
  {
    name: 'PCE', fullName: 'Personal Consumption Expenditures Price Index',
    value: m.pce && m.pce.momChange != null ? (m.pce.momChange > 0 ? '+' : '') + m.pce.momChange + '% MoM' : 'N/A',
    yoy:   m.pce && m.pce.yoyChange != null ? m.pce.yoyChange + '% YoY' : null,
    prior: m.pce && m.pce.prior != null ? m.pce.prior.toFixed(1) : 'N/A',
    date: m.pce ? m.pce.date : null,
    direction: m.pce && m.pce.momChange > 0 ? 'up' : 'down',
    signal: m.pce && m.pce.momChange > 0.3 ? 'hot' : 'neutral',
    delay: 'Monthly - released ~4 weeks after month end (BEA via FRED)',
    source: "Bureau of Economic Analysis - Fed preferred inflation measure"
  },
  {
    name: 'Core PCE', fullName: 'Core Personal Consumption Expenditures ex Food and Energy',
    value: m.corePce && m.corePce.momChange != null ? (m.corePce.momChange > 0 ? '+' : '') + m.corePce.momChange + '% MoM' : 'N/A',
    yoy:   m.corePce && m.corePce.yoyChange != null ? m.corePce.yoyChange + '% YoY' : null,
    prior: m.corePce && m.corePce.prior != null ? m.corePce.prior.toFixed(1) : 'N/A',
    date: m.corePce ? m.corePce.date : null,
    direction: m.corePce && m.corePce.momChange > 0 ? 'up' : 'down',
    signal: m.corePce && m.corePce.momChange > 0.3 ? 'hot' : 'neutral',
    delay: 'Monthly (BEA via FRED)',
    source: 'Bureau of Economic Analysis'
  },
];

var activity = [
  {
    name: 'GDP', fullName: 'Real Gross Domestic Product QoQ Annualized % Change',
    value: m.gdp && m.gdp.latest != null ? (m.gdp.latest > 0 ? '+' : '') + m.gdp.latest.toFixed(1) + '%' : 'N/A',
    prior: m.gdp && m.gdp.prior  != null ? (m.gdp.prior  > 0 ? '+' : '') + m.gdp.prior.toFixed(1)  + '%' : 'N/A',
    date: m.gdp ? m.gdp.date : null,
    direction: m.gdp && m.gdp.latest > m.gdp.prior ? 'up' : 'down',
    signal: m.gdp && m.gdp.latest < 0 ? 'hot' : 'neutral',
    delay: 'Quarterly - advance estimate ~30 days after quarter end (BEA via FRED)',
    source: 'Bureau of Economic Analysis',
    note: m.gdp ? m.gdp.note : 'Quarterly advance estimate'
  },
  {
    name: 'Retail Sales', fullName: 'Advance Retail Sales',
    value: m.retail && m.retail.latest != null ? '$' + m.retail.latest + 'B' : 'N/A',
    prior: m.retail && m.retail.prior  != null ? '$' + m.retail.prior  + 'B' : 'N/A',
    date: m.retail ? m.retail.date : null,
    direction: m.retail && m.retail.momChange > 0 ? 'up' : 'down',
    signal: m.retail && m.retail.momChange < -1 ? 'hot' : 'neutral',
    delay: 'Monthly - released ~2 weeks after month end (Census via FRED)',
    source: 'US Census Bureau',
    note: m.retail ? m.retail.note : ''
  },
  {
    name: '10Y TIPS Real Yield', fullName: '10-Year Treasury Inflation-Protected Securities Real Yield',
    value: fred.yields && fred.yields.tips10y && fred.yields.tips10y.latest != null ? fred.yields.tips10y.latest.toFixed(2) + '%' : 'N/A',
    prior: fred.yields && fred.yields.tips10y && fred.yields.tips10y.prior  != null ? fred.yields.tips10y.prior.toFixed(2)  + '%' : 'N/A',
    date: fred.yields && fred.yields.tips10y ? fred.yields.tips10y.date : null,
    direction: fred.yields && fred.yields.tips10y && fred.yields.tips10y.latest > fred.yields.tips10y.prior ? 'up' : 'down',
    signal: fred.yields && fred.yields.tips10y && fred.yields.tips10y.latest > 2.0 ? 'hot' : 'neutral',
    delay: 'Daily (FRED / US Treasury)',
    source: 'US Treasury via FRED',
    note: 'Above 2% = restrictive real borrowing conditions'
  },
];

var fedFunds     = fred.yields && fred.yields.fedfunds ? fred.yields.fedfunds.latest : null;
var fedRange     = fred.yields && fred.yields.fedfunds ? fred.yields.fedfunds.targetRange : null;
var fedFundsDate = fred.yields && fred.yields.fedfunds ? fred.yields.fedfunds.date : null;

var fedNarrative = await callClaude(
  'The actual Fed Funds Rate is ' + (fedRange || (fedFunds + '%')) + ' as of ' + fedFundsDate + '. Next FOMC meeting is June 16-17 2026. Fed held rates at April 29 2026 meeting with 4 dissents most since 1992. Return JSON with fields: market_cut_prob_jun_pct number, dots_median_2026 number, powell_status string, qt_status string, fomc_dissents number, fomc_note string.',
  'Return only raw JSON. No markdown. Start with {'
);

return {
  fed_policy: {
    current_rate:  fedRange || (fedFunds + '%'),
    effr:          fedFunds,
    next_meeting:  'June 16-17, 2026',
    fomc_dissents: fedNarrative && fedNarrative.fomc_dissents ? fedNarrative.fomc_dissents : 4,
    fomc_note:     fedNarrative && fedNarrative.fomc_note ? fedNarrative.fomc_note : 'Most dissents since October 1992',
    market_cut_prob_jun_pct: fedNarrative ? fedNarrative.market_cut_prob_jun_pct : null,
    powell_status: fedNarrative ? fedNarrative.powell_status : null,
    qt_status:     fedNarrative ? fedNarrative.qt_status : null,
    delay: 'Real EFFR from FRED | Narrative AI estimate'
  },
  labor: labor,
  inflation: inflation,
  activity: activity,
  timestamp: new Date().toISOString()
};
```

} catch(err) {
console.error(‘fetchWeekly error:’, err);
throw err;
}
}

export async function fetchAuctions() {
try {
var data = await fetchLive(’/api/auctions’);
return data;
} catch(err) {
console.error(‘fetchAuctions error:’, err);
var fallback = await callClaude(
’Return JSON with recent Treasury auction results as of ’ + TODAY + ‘. Fields: recent array with term/date/size_bn/bid_to_cover/btc_6mo_avg/indirect_pct/indirect_avg/direct_pct/dealer_pct/dealer_avg/high_yield/tail_bp/tail_avg_bp/status/note. Upcoming array with term/date/size_bn. macro_note string.’,
‘Return only raw JSON. No markdown. Start with {’
);
return Object.assign({}, fallback, { delay: ‘AI estimate - TreasuryDirect unavailable - verify at treasurydirect.gov’ });
}
}

export async function fetchMonthly() {
var fredBalance = null;
try {
var fred = await fetchLive(’/api/fred’);
if (fred && fred.fedBalance) {
fredBalance = fred.fedBalance;
}
} catch(e) {
console.error(‘fetchMonthly FRED fetch failed’, e.message);
}

var data = await callClaude(
’Return JSON with latest TIC foreign holdings and basis trade data as of ’ + TODAY + ‘. Fields: tic object with report_month/total_foreign_bn/mom_change_bn/yoy_change_bn/foreign_share_pct/china_net_since_2021_bn/top_holders array (country/holdings_bn/mom_bn/trend/note). basis_trade object with estimated_size_tn/stress_level/note/sofr_treasury_spread_bp.’,
‘Return only raw JSON. No markdown. Start with {’
);

return Object.assign({}, data, {
fed_balance: fredBalance ? {
report_date:      new Date().toISOString().split(‘T’)[0],
total_assets_tn:  fredBalance.totalAssets  ? fredBalance.totalAssets.value  : null,
treasuries_tn:    fredBalance.treasuries   ? fredBalance.treasuries.value   : null,
mbs_tn:           fredBalance.mbs          ? fredBalance.mbs.value          : 1.98,
reserves_tn:      fredBalance.reserves     ? fredBalance.reserves.value     : null,
tga_bn:           fredBalance.tga          ? fredBalance.tga.value          : null,
weekly_change_bn: fredBalance.weeklyChange ? fredBalance.weeklyChange.value : null,
reserve_mgmt_note: ‘QT ended Dec 2025. Fed now in reserve management phase - buying T-bills to maintain adequate reserves.’,
data_source: ‘Real FRED data H.4.1 weekly release’,
} : null,
tga: fredBalance && fredBalance.tga ? {
current_bn:    fredBalance.tga.value,
prior_month_bn: fredBalance.tga.prior,
date:          fredBalance.tga.date,
note:          ‘Treasury General Account - key liquidity indicator. High TGA = Treasury has cash buffer.’,
delay:         ‘Weekly (FRED / US Treasury)’,
source:        ‘US Treasury via FRED’
} : null,
delay: ‘Fed Balance Sheet: Real FRED H.4.1 weekly data | TIC: AI estimate - verify at treasury.gov/tic’
});
}

export async function fetchQuarterly() {
var realEarnings = [];
try {
var e = await fetchLive(’/api/earnings’);
realEarnings = e.earnings || [];
} catch(err) {}

var govData = await callClaude(
‘As of ’ + TODAY + ’ Fed Funds Rate is 3.50-3.75% held April 29 2026. GDP Q1 2026 advance estimate was +2.0% annualized released April 30 2026. Return JSON with gov_reports array (report/value/prior/revision/note/source fields) and upcoming_earnings array (company/symbol/date/eps_est fields). Include GDP Q1 2026, Federal Deficit FY2026, Debt-to-GDP, Federal Debt Outstanding, Trade Balance. Upcoming confirmed: AMZN May 6, GOOGL May 8, META May 12, NVDA May 20, WMT May 15.’,
‘Return only raw JSON. No markdown. Start with {’
);

var companyMeta = {
AAPL:  { name: ‘Apple’,      sector: ‘Technology’     },
MSFT:  { name: ‘Microsoft’,  sector: ‘Technology’     },
NVDA:  { name: ‘Nvidia’,     sector: ‘Technology’     },
GOOGL: { name: ‘Alphabet’,   sector: ‘Technology’     },
AMZN:  { name: ‘Amazon’,     sector: ‘Consumer/Cloud’ },
META:  { name: ‘Meta’,       sector: ‘Technology’     },
TSLA:  { name: ‘Tesla’,      sector: ‘Automotive’     },
JPM:   { name: ‘JPMorgan’,   sector: ‘Financials’     },
XOM:   { name: ‘ExxonMobil’, sector: ‘Energy’         },
};

var earnings = realEarnings.map(function(e) {
var meta = companyMeta[e.symbol] || {};
return {
company:    meta.name || e.symbol,
symbol:     e.symbol,
sector:     meta.sector,
quarter:    e.quarter,
report_date: e.reportDate,
eps_actual: e.epsActual,
eps_est:    e.epsEst,
beat_pct:   e.beatPct,
guidance:   null,
key_note:   ’EPS ’ + (e.epsActual != null ? (e.epsActual >= e.epsEst ? ‘beat’ : ‘missed’) + ’ est by ’ + Math.abs(e.beatPct || 0).toFixed(1) + ‘%’ : ‘pending’),
delay:      e.delay,
source:     e.source
};
});

return {
earnings: earnings,
gov_reports:       govData ? govData.gov_reports       : [],
upcoming_earnings: govData ? govData.upcoming_earnings : [],
delay: ‘Earnings: Real Finnhub/SEC data | Gov reports: AI estimate anchored to real GDP/Fed rate’
};
}

export async function fetchIntel(userQuestion) {
var sys = ‘Macro analyst. Return ONLY raw JSON. No markdown. Start with {’;

if (userQuestion) {
return callClaude(
’Answer this macro question with JSON containing fields: answer string, key_points array of strings, data_sources array of strings. Question: ’ + userQuestion,
sys
);
}

return callClaude(
’Today ’ + TODAY + ‘. Fed 3.50-3.75pct. Gold 4615. VIX 17. SP500 7200. 10Y 4.38pct. CPI 3.3pct. GDP Q1 2.0pct. Deficit 2T per yr. Debt/GDP 122pct. 4 FOMC dissents April 29 2026. Return JSON with these fields: thesis string, regime string, regime_confidence string, alerts array of objects with level/title/detail/category fields, key_risks array of objects with risk/probability/horizon fields, key_watches array of objects with indicator/why/threshold/source fields, dalio_lens string, positioning object with usd/gold/long_bonds/equities/rationale fields.’,
sys
);
}
