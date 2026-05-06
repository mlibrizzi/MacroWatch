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
        wti:   fred.commodities && fred.commodities.wti ? { ...fred.commodities.wti, delay: 'Daily (EIA via FRED) — 1 week lag' } : null,
        brent: fred.commodities && fred.commodities.brent ? { ...fred.commodities.brent, delay: 'Daily (EIA via FRED) — 1 week lag' } : null,
      },

      fx: {
        eurusd: { ...markets.fx?.eurusd, delay: 'Hourly (open.er-api.com)' },
        jpyusd: { ...markets.fx?.jpyusd, delay: 'Hourly (open.er-api.com)' },
        gbpusd: { ...markets.fx?.gbpusd, delay: 'Hourly (open.er-api.com)' },
        dxy:    { ...markets.fx?.dxy,    delay: 'Real-time via UUP ETF (Finnhub)' },
      },
      vix: fred.commodities && fred.commodities.vix ? { ...fred.commodities.vix, delay: 'Daily (CBOE via FRED)' } : null,
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

    const fedNarrative = await callClaude('Fed held rates at 3.50-3.75% on April 29 2026 with 4 dissents most since 1992. Next FOMC June 16-17 2026. CME FedWatch shows ~6% probability of June cut. QT ended Dec 2025 now in reserve management. Return JSON: powell_status string, qt_status string, dots_median_2026 number.', 'Return only raw JSON. Start with {');
    const fedPolicy = {
      current_rate: '3.50%-3.75%',
      next_meeting: '2026-06-16',
      market_cut_prob_jun_pct: 6,
      fomc_dissents: 4,
      fomc_note: 'Most dissents since October 1992',
      powell_status: fedNarrative ? fedNarrative.powell_status : null,
      qt_status: fedNarrative ? fedNarrative.qt_status : null,
      dots_median_2026: fedNarrative ? fedNarrative.dots_median_2026 : null
    };

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
  // Get real TIC data from Treasury
  const ticData = await fetchLive('/api/tic').catch(() => null);

  // Get Fed balance sheet from FRED
  const fred = await fetchLive('/api/fred').catch(() => null);
  const fb = fred && fred.fedBalance ? fred.fedBalance : null;

  // Get basis trade estimate from Claude - small prompt
  const basisData = await callClaude(
    'As of ' + TODAY + ' SOFR-Treasury spread is approximately 8bp. Basis trade estimated size $0.8T. Stress level low. Return JSON with basis_trade object containing estimated_size_tn, stress_level, note, sofr_treasury_spread_bp.',
    'Return only raw JSON. No markdown. Start with {'
  ).catch(() => null);

  return {
    tic: ticData ? {
      report_month: ticData.report_month,
      total_foreign_bn: ticData.total_foreign_bn,
      mom_change_bn: ticData.mom_change_bn,
      foreign_share_pct: ticData.foreign_share_pct,
      china_net_since_2021_bn: ticData.china_net_since_2021_bn,
      top_holders: ticData.top_holders,
      source: ticData.source,
      delay: ticData.delay
    } : null,
    fed_balance: fb ? {
      report_date: fb.totalAssets && fb.totalAssets.date ? fb.totalAssets.date : new Date().toISOString().split('T')[0],
      total_assets_tn: fb.totalAssets ? fb.totalAssets.value : null,
      treasuries_tn: fb.treasuries ? fb.treasuries.value : null,
      mbs_tn: fb.mbs ? fb.mbs.value : null,
      reserves_tn: fb.reserves ? fb.reserves.value : null,
      tga_bn: fb.tga ? fb.tga.value : null,
      weekly_change_bn: fb.weeklyChange ? fb.weeklyChange.value : null,
      reserve_mgmt_note: 'QT ended Dec 2025. Fed in reserve management phase.',
      data_source: 'Real FRED H.4.1 weekly'
    } : null,
    tga: fb && fb.tga ? {
      current_bn: fb.tga.value,
      prior_month_bn: fb.tga.prior,
      date: fb.tga.date,
      note: 'Treasury General Account - key liquidity indicator.',
      delay: 'Weekly FRED'
    } : null,
    basis_trade: basisData ? basisData.basis_trade : null,
    delay: 'TIC: Real Treasury data (slt_table5.txt) | Fed Balance Sheet: Real FRED H.4.1'
  };
}

export async function fetchQuarterly() {
  // Get real earnings from Finnhub
  const realEarnings = await fetchLive('/api/earnings').catch(() => ({ earnings: [] }));
  const earnings = (realEarnings.earnings || []).map(e => ({
    company: e.symbol, symbol: e.symbol, quarter: e.quarter,
    report_date: e.reportDate, eps_actual: e.epsActual, eps_est: e.epsEst,
    beat_pct: e.beatPct, revenue_bn: e.revenueBn || null,
    guidance: e.guidance || 'none',
    key_note: e.epsActual != null ? (e.epsActual >= e.epsEst ? 'Beat' : 'Missed') + ' est by ' + Math.abs(e.beatPct || 0).toFixed(1) + '%' : 'Pending',
    delay: e.source || 'Finnhub/SEC'
  }));

  // Get government reports from Claude - only known released data
  const govData = await callClaude(
    'As of ' + TODAY + ' Fed rate is 3.50-3.75%. GDP Q1 2026 GDP was +2.0% annualized released April 30. Federal Deficit FY2026 YTD through March is $1.307T per Treasury Monthly Statement. Federal Debt Outstanding is $36.2T per Treasury. Debt-to-GDP is approximately 122%. Trade Balance March 2026 was -$162B per BEA released May 1. Fed rate 3.50-3.75%. Return JSON with gov_reports array (report/value/prior/revision/note/source fields) and upcoming_earnings array (company/symbol/date fields). Upcoming: AMZN May 7, GOOGL May 8, META May 9.',
    'Return only raw JSON. No markdown. Start with {'
  );

  return {
    earnings,
    gov_reports: govData ? govData.gov_reports : [],
    upcoming_earnings: govData ? govData.upcoming_earnings : [],
    delay: 'Earnings: Real Finnhub/SEC data | Gov reports: AI estimate anchored to known data'
  };
}

export async function fetchIntel(userQuestion) {
  const sys = 'Macro analyst using Dalio big cycle framework. Return ONLY raw JSON. No markdown. Start with {';

  if (userQuestion) {
    return callClaude('Answer this macro question. Return JSON: answer string, key_points array, related_indicators array, data_sources array. Question: ' + userQuestion, sys);
  }

  return callClaude('Today ' + TODAY + '. Gold ~$4558, 10Y 4.39%, 2Y 3.88%, VIX 18, SPX 7238, WTI $100, Fed 3.50-3.75%, CPI +0.87% MoM, Core PCE +0.29% MoM, GDP Q1 +2.0%, Unemployment 4.3%, Debt/GDP 122%, Deficit ~$2T/yr, 4 FOMC dissents April 29, TIC $9.49T Japan $1.24T China $0.69T selling. Generate briefing. Return JSON: thesis string, regime string, regime_confidence string, alerts array with level/title/detail/category, key_risks array with risk/probability/horizon, key_watches array with indicator/why/threshold/source, dalio_lens string, positioning object with usd/gold/long_bonds/equities/rationale.', sys);
}
