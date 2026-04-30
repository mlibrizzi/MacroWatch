import { callClaude } from './api.js';

export async function fetchDaily() {
  return callClaude(`Return JSON with current approximate market values. Format exactly:
{
  "metals": {
    "gold":   { "price": 3300.00, "change": 12.50, "changePct": 0.38 },
    "silver": { "price": 33.20,  "change": 0.45,  "changePct": 1.37 }
  },
  "oil": {
    "wti":   { "price": 62.50, "change": -0.80, "changePct": -1.26 },
    "brent": { "price": 66.20, "change": -0.70, "changePct": -1.05 }
  },
  "fx": {
    "eurusd": { "price": 1.1320, "change": 0.0040, "changePct": 0.35 },
    "jpyusd": { "price": 143.20, "change": -0.80, "changePct": -0.56 },
    "dxy":    { "price": 99.80,  "change": -0.40, "changePct": -0.40 }
  },
  "vix": { "price": 24.50, "change": -1.20, "changePct": -4.67 },
  "rates": {
    "t2y":  { "yield": 3.82, "change_bp": -3 },
    "t10y": { "yield": 4.38, "change_bp": 2  },
    "t30y": { "yield": 4.78, "change_bp": 3  },
    "fed_funds": 4.375,
    "term_premium": null,
    "tips_10y_real": 2.12
  },
  "indices": [
    { "symbol": "SPX",  "name": "S&P 500",  "price": 5560,  "change": 28,  "changePct": 0.51 },
    { "symbol": "NDX",  "name": "Nasdaq 100","price": 19420, "change": 85,  "changePct": 0.44 },
    { "symbol": "DJI",  "name": "Dow Jones", "price": 40800, "change": 120, "changePct": 0.29 }
  ],
  "mag7": [
    { "symbol": "AAPL", "price": 212.50, "change": 1.20,  "changePct": 0.57 },
    { "symbol": "MSFT", "price": 418.30, "change": 3.40,  "changePct": 0.82 },
    { "symbol": "NVDA", "price": 882.10, "change": -8.50, "changePct": -0.95 },
    { "symbol": "GOOGL","price": 164.20, "change": 1.10,  "changePct": 0.67 },
    { "symbol": "AMZN", "price": 196.40, "change": 2.30,  "changePct": 1.18 },
    { "symbol": "META", "price": 536.80, "change": 4.20,  "changePct": 0.79 },
    { "symbol": "TSLA", "price": 248.60, "change": -5.30, "changePct": -2.09 }
  ],
  "derived": {
    "term_premium": { "value": 0.56, "label": "10Y minus 2Y", "signal": "steepening|flattening|inverted", "note": "string" },
    "liquidity_proxy": { "value": 55.71, "label": "SPX / DXY", "signal": "expanding|tightening|neutral", "note": "string" },
    "gold_vs_yield": { "gold": 3300, "t10y": 4.38, "ratio": 753.4, "signal": "distrust|normal|risk-on", "note": "string" }
  }
}`);
}

export async function fetchAuctions() {
  return callClaude(`Return JSON for US Treasury auction data. Use realistic recent values for April/May 2026.
{
  "recent": [
    {
      "term": "2-Year Note",
      "cusip": "string",
      "date": "2026-04-22",
      "size_bn": 69,
      "bid_to_cover": 2.51,
      "btc_6mo_avg": 2.58,
      "indirect_pct": 62.4,
      "indirect_avg": 64.2,
      "direct_pct": 18.2,
      "dealer_pct": 19.4,
      "dealer_avg": 15.8,
      "high_yield": 3.884,
      "tail_bp": 1.4,
      "tail_avg_bp": 0.3,
      "status": "weak",
      "note": "Primary dealers forced to absorb 19.4% vs 15.8% avg. Tail widest in 6 months."
    },
    { "term": "5-Year Note",  "date": "2026-04-23", "size_bn": 70, "bid_to_cover": 2.29, "btc_6mo_avg": 2.36, "indirect_pct": 68.1, "indirect_avg": 69.4, "direct_pct": 15.8, "dealer_pct": 16.1, "dealer_avg": 14.2, "high_yield": 4.012, "tail_bp": 1.4, "tail_avg_bp": 0.3, "status": "weak",  "note": "Soft demand across the curve." },
    { "term": "7-Year Note",  "date": "2026-04-24", "size_bn": 44, "bid_to_cover": 2.62, "btc_6mo_avg": 2.60, "indirect_pct": 70.2, "indirect_avg": 70.5, "direct_pct": 16.4, "dealer_pct": 13.4, "dealer_avg": 14.8, "high_yield": 4.198, "tail_bp": 0.4, "tail_avg_bp": 0.4, "status": "mixed", "note": "Better than 2Y/5Y but still below average indirect." },
    { "term": "10-Year Note", "date": "2026-04-09", "size_bn": 39, "bid_to_cover": 2.46, "btc_6mo_avg": 2.53, "indirect_pct": 65.8, "indirect_avg": 67.1, "direct_pct": 17.2, "dealer_pct": 17.0, "dealer_avg": 14.6, "high_yield": 4.432, "tail_bp": 1.7, "tail_avg_bp": 0.5, "status": "weak",  "note": "Worst 10Y result since Oct 2023. Occurred during tariff shock week." },
    { "term": "30-Year Bond", "date": "2026-04-10", "size_bn": 22, "bid_to_cover": 2.18, "btc_6mo_avg": 2.38, "indirect_pct": 60.1, "indirect_avg": 65.4, "direct_pct": 14.8, "dealer_pct": 25.1, "dealer_avg": 17.2, "high_yield": 4.812, "tail_bp": 2.4, "tail_avg_bp": 0.8, "status": "weak",  "note": "Dealers absorbed 25.1% — highest since 2020. Major term premium signal." }
  ],
  "upcoming": [
    { "term": "3-Year Note",  "date": "2026-05-06", "size_bn": 58 },
    { "term": "10-Year Note", "date": "2026-05-07", "size_bn": 39 },
    { "term": "30-Year Bond", "date": "2026-05-08", "size_bn": 22 }
  ],
  "thresholds": {
    "btc": { "green": 2.5, "yellow": 2.3, "red": 2.1 },
    "indirect": { "green": 68, "yellow": 62, "red": 56 },
    "dealer": { "green": 14, "yellow": 18, "red": 22 },
    "tail_bp": { "green": 0.5, "yellow": 1.0, "red": 1.8 }
  },
  "macro_note": "April 2026 auction complex showed broad demand deterioration coinciding with tariff shock. 30Y dealer absorption hit post-COVID highs, consistent with foreign exit or basis trade unwind."
}`);
}

export async function fetchWeekly() {
  return callClaude(`Return JSON with latest published US macro indicators as of April/May 2026.
{
  "fed_policy": {
    "current_rate": "4.25%-4.50%",
    "next_meeting": "2026-05-07",
    "market_cut_prob_jun_pct": 18,
    "dots_median_2026": 4.125,
    "dots_median_2027": 3.375,
    "powell_status": "Fed held at Apr 30 meeting 8-4. Powell resisting White House cut pressure. Warsh expected as replacement mid-2026.",
    "qt_status": "QT ended Dec 2025. Reserve management T-bill purchases underway. Balance sheet now expanding ~$15B/mo."
  },
  "labor": [
    { "name": "Nonfarm Payrolls",          "value": "+177k", "prior": "+228k", "date": "2026-04", "direction": "down",  "signal": "cooling",  "note": "Below consensus of +190k. Prior revised down." },
    { "name": "Unemployment Rate",         "value": "4.2%",  "prior": "4.2%",  "date": "2026-04", "direction": "flat",  "signal": "neutral",  "note": "" },
    { "name": "JOLTS Job Openings",        "value": "7.19M", "prior": "7.57M", "date": "2026-03", "direction": "down",  "signal": "cooling",  "note": "Openings fell 380k. Quits rate declining — workers less confident." },
    { "name": "Initial Jobless Claims",    "value": "241k",  "prior": "223k",  "date": "2026-04-26","direction": "up",  "signal": "hot",      "note": "4-week avg rising. Watch for trend break above 260k." },
    { "name": "Continuing Claims",         "value": "1.89M", "prior": "1.84M", "date": "2026-04-19","direction": "up",  "signal": "hot",      "note": "" },
    { "name": "Labor Force Participation", "value": "62.5%", "prior": "62.6%", "date": "2026-04", "direction": "down",  "signal": "neutral",  "note": "" },
    { "name": "ADP Private Payrolls",      "value": "+155k", "prior": "+183k", "date": "2026-04", "direction": "down",  "signal": "cooling",  "note": "Weakest since Jan 2025." }
  ],
  "inflation": [
    { "name": "CPI YoY",          "value": "3.5%",  "prior": "3.2%",  "date": "2026-03", "direction": "up",   "signal": "hot",     "note": "Above 3.5% for 2nd consecutive month. Tariff pass-through beginning." },
    { "name": "Core CPI YoY",     "value": "3.2%",  "prior": "3.1%",  "date": "2026-03", "direction": "up",   "signal": "hot",     "note": "" },
    { "name": "CPI MoM",          "value": "+0.4%", "prior": "+0.2%", "date": "2026-03", "direction": "up",   "signal": "hot",     "note": "Services and goods both accelerating." },
    { "name": "PCE YoY",          "value": "3.1%",  "prior": "2.8%",  "date": "2026-03", "direction": "up",   "signal": "hot",     "note": "Fed's preferred measure now well above 2% target." },
    { "name": "Core PCE YoY",     "value": "3.0%",  "prior": "2.8%",  "date": "2026-03", "direction": "up",   "signal": "hot",     "note": "" },
    { "name": "PPI Final Demand",  "value": "3.8%",  "prior": "3.4%",  "date": "2026-03", "direction": "up",   "signal": "hot",     "note": "Pipeline inflation rising. Goods PPI +5.1% YoY." },
    { "name": "5Y Breakeven",      "value": "2.68%", "prior": "2.51%", "date": "2026-04", "direction": "up",   "signal": "hot",     "note": "Market pricing inflation above Fed target through 2031." },
    { "name": "10Y Breakeven",     "value": "2.44%", "prior": "2.31%", "date": "2026-04", "direction": "up",   "signal": "hot",     "note": "" }
  ],
  "activity": [
    { "name": "GDP QoQ Advance",   "value": "-0.3%", "prior": "+2.4%", "date": "2026-Q1", "direction": "down", "signal": "hot",     "note": "Advance estimate. Negative growth + elevated inflation = stagflation signal." },
    { "name": "ISM Manufacturing", "value": "48.7",  "prior": "49.0",  "date": "2026-04", "direction": "down", "signal": "cooling", "note": "5th consecutive contraction. New orders fell to 45.2." },
    { "name": "ISM Services",      "value": "51.6",  "prior": "53.5",  "date": "2026-04", "direction": "down", "signal": "cooling", "note": "Still expanding but deceleration notable." },
    { "name": "Retail Sales MoM",  "value": "-0.9%", "prior": "+1.5%", "date": "2026-04", "direction": "down", "signal": "cooling", "note": "Sharp reversal. Pull-forward buying in March unwinding." },
    { "name": "Consumer Sentiment","value": "52.2",  "prior": "57.0",  "date": "2026-04", "direction": "down", "signal": "cooling", "note": "UMich. Lowest since 2022. Inflation expectations at 6.5%." }
  ]
}`);
}

export async function fetchMonthly() {
  return callClaude(`Return JSON with monthly US debt, flows, and Fed data as of April 2026.
{
  "tic": {
    "report_month": "2026-02",
    "total_foreign_bn": 9490,
    "mom_change_bn": 198,
    "yoy_change_bn": 587,
    "foreign_share_pct": 31.0,
    "china_net_since_2021_bn": -357,
    "top_holders": [
      { "country": "Japan",          "holdings_bn": 1221, "mom_bn": -8,  "trend": "selling",  "note": "Constrained by own currency defense needs." },
      { "country": "United Kingdom", "holdings_bn": 897,  "mom_bn": 42,  "trend": "buying",   "note": "City of London financial flows." },
      { "country": "China",          "holdings_bn": 761,  "mom_bn": -15, "trend": "selling",  "note": "Structural reduction. Down $357B since 2021." },
      { "country": "Luxembourg",     "holdings_bn": 418,  "mom_bn": 12,  "trend": "buying",   "note": "European fund flows." },
      { "country": "Cayman Islands", "holdings_bn": 398,  "mom_bn": 6,   "trend": "flat",     "note": "Hedge fund / offshore vehicles." },
      { "country": "Belgium",        "holdings_bn": 332,  "mom_bn": 8,   "trend": "buying",   "note": "Euroclear — proxy for global CBs." },
      { "country": "Canada",         "holdings_bn": 328,  "mom_bn": 38,  "trend": "buying",   "note": "+13% single month. Tariff-era diversification." },
      { "country": "Saudi Arabia",   "holdings_bn": 142,  "mom_bn": 24,  "trend": "buying",   "note": "+19% single month. Petrodollar recycling." }
    ]
  },
  "fed_balance": {
    "report_date": "2026-04-23",
    "total_assets_tn": 6.72,
    "treasuries_tn": 4.31,
    "mbs_tn": 2.24,
    "reserves_tn": 3.28,
    "tga_bn": 618,
    "qt_ended": "2025-12-01",
    "weekly_change_bn": 14.2,
    "reserve_mgmt_note": "Fed buying T-bills via SOMA reinvestment. Not QE by definition but functionally expanding reserves. Treasury also executed $75.6B in buybacks YTD — longest-duration repurchase program since 2000.",
    "repo_sofr_pct": 4.31,
    "repo_stress": "low"
  },
  "tga": {
    "current_bn": 618,
    "prior_month_bn": 702,
    "note": "Drawdown of $84B in April. Debt ceiling dynamics. Watch for X-date risk if ceiling not raised by July."
  },
  "basis_trade": {
    "estimated_size_tn": 0.8,
    "stress_level": "elevated",
    "note": "Basis trade estimated at $800B. April tariff shock triggered forced unwind signals — primary dealers absorbed excess. SOFR-Treasury spread widened briefly to 42bp before stabilizing.",
    "sofr_treasury_spread_bp": 28
  }
}`);
}

export async function fetchQuarterly() {
  return callClaude(`Return JSON with quarterly corporate earnings, government reports, and key data revisions as of Q1 2026.
{
  "earnings": [
    { "company": "Apple",      "symbol": "AAPL", "quarter": "Q2 FY26", "report_date": "2026-05-01", "eps_actual": 1.88,  "eps_est": 1.82,  "beat_pct": 3.3,  "revenue_bn": 95.4,  "yoy_rev_pct": 4.2,  "guidance": "maintained", "key_note": "Services revenue +14% YoY. iPhone weakness offset by ecosystem." },
    { "company": "Microsoft",  "symbol": "MSFT", "quarter": "Q3 FY26", "report_date": "2026-04-30", "eps_actual": 3.46,  "eps_est": 3.22,  "beat_pct": 7.5,  "revenue_bn": 70.1,  "yoy_rev_pct": 15.3, "guidance": "raised",      "key_note": "Azure growth re-accelerated to 33%. Copilot monetization ahead of schedule." },
    { "company": "Alphabet",   "symbol": "GOOGL","quarter": "Q1 2026",  "report_date": "2026-04-29", "eps_actual": 2.81,  "eps_est": 2.52,  "beat_pct": 11.5, "revenue_bn": 90.2,  "yoy_rev_pct": 12.0, "guidance": "raised",      "key_note": "Search +10%, Cloud +29%. Ad market holding despite macro." },
    { "company": "Meta",       "symbol": "META", "quarter": "Q1 2026",  "report_date": "2026-04-30", "eps_actual": 6.43,  "eps_est": 5.88,  "beat_pct": 9.4,  "revenue_bn": 42.3,  "yoy_rev_pct": 16.1, "guidance": "raised",      "key_note": "Ad pricing +11%. AI-driven targeting showing clear ROI." },
    { "company": "Amazon",     "symbol": "AMZN", "quarter": "Q1 2026",  "report_date": "2026-05-01", "eps_actual": 1.59,  "eps_est": 1.36,  "beat_pct": 16.9, "revenue_bn": 155.7, "yoy_rev_pct": 9.0,  "guidance": "lowered",     "key_note": "AWS +19% but tariff impact on retail margin cited. Q2 guide cut." },
    { "company": "Nvidia",     "symbol": "NVDA", "quarter": "Q1 FY27",  "report_date": "2026-05-28", "eps_actual": null,  "eps_est": 9.22,  "beat_pct": null, "revenue_bn": null,  "yoy_rev_pct": null, "guidance": null,          "key_note": "Expected. Blackwell ramp + H20 China export restriction impact key." },
    { "company": "Tesla",      "symbol": "TSLA", "quarter": "Q1 2026",  "report_date": "2026-04-22", "eps_actual": 0.27,  "eps_est": 0.41,  "beat_pct": -34.1,"revenue_bn": 19.3,  "yoy_rev_pct": -9.2, "guidance": "lowered",     "key_note": "Vehicle deliveries -13% YoY. Brand damage from Musk political exposure." },
    { "company": "JPMorgan",   "symbol": "JPM",  "quarter": "Q1 2026",  "report_date": "2026-04-11", "eps_actual": 5.07,  "eps_est": 4.61,  "beat_pct": 10.0, "revenue_bn": 46.0,  "yoy_rev_pct": 8.0,  "guidance": "maintained",  "key_note": "Trading revenue surged on volatility. NII benefiting from higher-for-longer." },
    { "company": "ExxonMobil", "symbol": "XOM",  "quarter": "Q1 2026",  "report_date": "2026-05-02", "eps_actual": null,  "eps_est": 1.76,  "beat_pct": null, "revenue_bn": null,  "yoy_rev_pct": null, "guidance": null,          "key_note": "Expected. WTI at $62 creates margin pressure vs Q4 2025." }
  ],
  "gov_reports": [
    { "report": "GDP Q1 2026 Advance",       "value": "-0.3%",    "prior": "+2.4%",    "revision": "down", "note": "First negative print since Q1 2022. Import surge pre-tariff distorted. Watch Q2." },
    { "report": "Federal Deficit FY2026 YTD","value": "$1.05T",   "prior": "$0.83T",   "revision": "up",   "note": "7 months into FY2026. On track for $1.9T full year per CBO." },
    { "report": "Debt-to-GDP",               "value": "122%",     "prior": "120%",     "revision": "up",   "note": "Rising. CBO projects 130% by 2030 under current path." },
    { "report": "Federal Debt Outstanding",  "value": "$36.8T",   "prior": "$36.2T",   "revision": "up",   "note": "Net new issuance accelerating. $2.4T to refinance in 2026." },
    { "report": "TGA Balance",               "value": "$618B",    "prior": "$702B",     "revision": "down", "note": "Drawdown continues. Debt ceiling creates X-date risk ~July 2026." },
    { "report": "Trade Balance Mar 2026",    "value": "-$140.5B", "prior": "-$123.2B", "revision": "down", "note": "Record deficit. Pre-tariff front-loading inflated imports." }
  ],
  "upcoming_earnings": [
    { "company": "ExxonMobil", "symbol": "XOM",  "date": "2026-05-02" },
    { "company": "Nvidia",     "symbol": "NVDA", "date": "2026-05-28" },
    { "company": "Walmart",    "symbol": "WMT",  "date": "2026-05-15" }
  ]
}`);
}

export async function fetchIntel(userQuestion) {
  const base = `You are a macro intelligence analyst. Today: ${new Date().toISOString().split('T')[0]}.
Specialties: US Treasury markets, foreign capital flows, Fed policy, basis trade, DXY regime, geopolitics-market nexus.
Return ONLY valid JSON.`;

  if (userQuestion) {
    return callClaude(`User question: "${userQuestion}"
Return JSON:
{
  "answer": "detailed 3-5 paragraph response",
  "key_points": ["point 1", "point 2", "point 3"],
  "related_indicators": ["indicator to watch 1", "indicator to watch 2"]
}`, base);
  }

  return callClaude(`Generate a current macro intelligence briefing for April/May 2026. Context: tariff shock, weak Treasury auctions, China selling, Fed under political pressure, stagflation signals, basis trade stress.
Return JSON:
{
  "thesis": "3-4 sentence current macro thesis. Be specific — cite data points.",
  "regime": "stagflation|reflation|deflation|goldilocks|crisis",
  "regime_confidence": "high|medium|low",
  "alerts": [
    { "level": "critical|warning|watch", "title": "string", "detail": "2-3 sentence specific detail with numbers", "category": "DEBT|FED|GEOPOLITICS|MARKETS|FLOWS|INFLATION" }
  ],
  "key_risks": [
    { "risk": "string", "probability": "high|medium|low", "horizon": "immediate|3mo|6mo|12mo" }
  ],
  "key_watches": [
    { "indicator": "string", "why": "string", "threshold": "string" }
  ],
  "dalio_lens": "2-3 sentence read through Ray Dalio big debt cycle framework on current positioning.",
  "positioning": {
    "usd": "bearish|neutral|bullish",
    "gold": "bearish|neutral|bullish",
    "long_bonds": "bearish|neutral|bullish",
    "equities": "bearish|neutral|bullish",
    "rationale": "string"
  }
}`, base);
}