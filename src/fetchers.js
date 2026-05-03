import { callClaude } from './api.js';

var TODAY = new Date().toISOString().split('T')[0];

async function fetchLive(path) {
  var res = await fetch(path);
  if (res.ok === false) throw new Error('err' + res.status);
  return res.json();
}

export async function fetchDaily() {
  try {
    var rs = await Promise.allSettled([fetchLive('/api/metals'),fetchLive('/api/markets'),fetchLive('/api/fred')]);
    var metals  = rs[0].status === 'fulfilled' ? rs[0].value : {};
    var markets = rs[1].status === 'fulfilled' ? rs[1].value : {};
    var fred    = rs[2].status === 'fulfilled' ? rs[2].value : {};
    var t10y = fred.yields && fred.yields.t10y ? fred.yields.t10y.latest : null;
    var dxy  = fred.commodities && fred.commodities.dxy ? fred.commodities.dxy.price : null;
    var spxObj = markets.indices ? markets.indices.find(function(i){return i.symbol === 'SPX';}) : null;
    var gold = metals.gold ? metals.gold.price : null;
    var lp = spxObj && dxy ? +(spxObj.price/dxy).toFixed(2) : null;
    var gr = gold && t10y ? +(gold/t10y).toFixed(1) : null;
    var vp = markets.vix ? markets.vix.price : null;
    var vz = vp < 15 ? 'Complacent' : vp < 20 ? 'Normal' : vp < 30 ? 'Elevated' : vp < 40 ? 'Fear' : 'Extreme Fear';
    return {
      metals:{gold:Object.assign({},metals.gold,{delay:'Real-time (gold-api.com)'}),silver:Object.assign({},metals.silver,{delay:'Real-time (gold-api.com)'})},
      oil:{wti:fred.commodities?fred.commodities.wti:null,brent:fred.commodities?fred.commodities.brent:null},
      fx:{eurusd:markets.fx?markets.fx.eurusd:null,jpyusd:markets.fx?markets.fx.jpyusd:null,gbpusd:markets.fx?markets.fx.gbpusd:null,dxy:fred.commodities?fred.commodities.dxy:null},
      vix:markets.vix?Object.assign({},markets.vix,{currentZone:vz,scale:'Under 15 Normal | 20-30 Elevated | 30-40 Fear | Over 40 Extreme'}):null,
      rates:{t2y:fred.yields?fred.yields.t2y:null,t10y:fred.yields?fred.yields.t10y:null,t30y:fred.yields?fred.yields.t30y:null,fed_funds:fred.yields&&fred.yields.fedfunds?fred.yields.fedfunds.latest:null,tips_10y_real:fred.yields&&fred.yields.tips10y?fred.yields.tips10y.latest:null,delay:'Daily FRED'},
      indices:markets.indices||[],mag7:markets.mag7||[],
      derived:{term_premium:fred.yields?fred.yields.termPremium:null,liquidity_proxy:{value:lp,signal:lp>50?'expanding':lp>40?'neutral':'tightening',label:'SPX/DXY'},gold_vs_yield:{ratio:gr,signal:gr>800?'distrust':'normal'}},
      timestamp:new Date().toISOString()
    };
  } catch(e){throw e;}
}

export async function fetchWeekly() {
  try {
    var fred = await fetchLive('/api/fred');
    var m = fred.macro || {};
    var ff = fred.yields&&fred.yields.fedfunds?fred.yields.fedfunds.latest:null;
    var fr = fred.yields&&fred.yields.fedfunds?fred.yields.fedfunds.targetRange:null;
    var fd = fred.yields&&fred.yields.fedfunds?fred.yields.fedfunds.date:null;
    var fn = await callClaude('Fed rate '+(fr||(ff+'%'))+' as of '+fd+'. Next FOMC June 16-17 2026. April 29 2026 held rates 4 dissents. Return JSON: market_cut_prob_jun_pct number, powell_status string, qt_status string, fomc_dissents number, fomc_note string.','Return only raw JSON. Start with {');
    return {
      fed_policy:{current_rate:fr||(ff+'%'),effr:ff,next_meeting:'June 16-17, 2026',fomc_dissents:fn?fn.fomc_dissents:4,fomc_note:fn?fn.fomc_note:'Most dissents since 1992',market_cut_prob_jun_pct:fn?fn.market_cut_prob_jun_pct:null,powell_status:fn?fn.powell_status:null,qt_status:fn?fn.qt_status:null,delay:'Real EFFR FRED | Narrative AI'},
      labor:[
        {name:'Unemployment Rate',fullName:'US Unemployment Rate U-3',value:m.unrate&&m.unrate.latest!=null?m.unrate.latest.toFixed(1)+'%':'N/A',prior:m.unrate&&m.unrate.prior!=null?m.unrate.prior.toFixed(1)+'%':'N/A',date:m.unrate?m.unrate.date:null,direction:m.unrate&&m.unrate.latest>m.unrate.prior?'up':'down',signal:m.unrate&&m.unrate.latest>4.5?'hot':'neutral',delay:'Monthly BLS via FRED'},
        {name:'NFP',fullName:'Nonfarm Payrolls Monthly Change',value:m.nfp&&m.nfp.latest!=null?(m.nfp.latest>=0?'+':'')+m.nfp.latest.toLocaleString()+'k':'N/A',prior:m.nfp&&m.nfp.prior!=null?(m.nfp.prior>=0?'+':'')+m.nfp.prior.toLocaleString()+'k':'N/A',date:m.nfp?m.nfp.date:null,direction:'neutral',signal:'neutral',delay:'Monthly BLS via FRED'},
        {name:'Initial Jobless Claims',fullName:'Initial Unemployment Insurance Claims',value:m.claims&&m.claims.latest!=null?Math.round(m.claims.latest).toLocaleString():'N/A',prior:m.claims&&m.claims.prior!=null?Math.round(m.claims.prior).toLocaleString():'N/A',date:m.claims?m.claims.date:null,direction:m.claims&&m.claims.latest>m.claims.prior?'up':'down',signal:m.claims&&m.claims.latest>260000?'hot':'neutral',delay:'Weekly Thursday DOL via FRED'},
        {name:'Continuing Claims',fullName:'Continuing Unemployment Insurance Claims',value:m.contClaims&&m.contClaims.latest!=null?Math.round(m.contClaims.latest).toLocaleString():'N/A',prior:m.contClaims&&m.contClaims.prior!=null?Math.round(m.contClaims.prior).toLocaleString():'N/A',date:m.contClaims?m.contClaims.date:null,direction:m.contClaims&&m.contClaims.latest>m.contClaims.prior?'up':'down',signal:'neutral',delay:'Weekly DOL via FRED'},
        {name:'Avg Hourly Earnings',fullName:'Average Hourly Earnings YoY',value:m.ahe&&m.ahe.yoyChange!=null?(m.ahe.yoyChange>0?'+':'')+m.ahe.yoyChange+'% YoY':'N/A',prior:m.ahe&&m.ahe.prior!=null?'$'+m.ahe.prior.toFixed(2)+'/hr':'N/A',date:m.ahe?m.ahe.date:null,direction:'neutral',signal:'neutral',delay:'Monthly BLS via FRED',note:'Key wage inflation input'},
      ],
      inflation:[
        {name:'CPI',fullName:'Consumer Price Index',value:m.cpi&&m.cpi.momChange!=null?(m.cpi.momChange>0?'+':'')+m.cpi.momChange+'% MoM':'N/A',yoy:m.cpi&&m.cpi.yoyChange!=null?m.cpi.yoyChange+'% YoY':null,prior:m.cpi&&m.cpi.prior!=null?m.cpi.prior.toFixed(1):'N/A',date:m.cpi?m.cpi.date:null,direction:m.cpi&&m.cpi.momChange>0?'up':'down',signal:m.cpi&&m.cpi.momChange>0.4?'hot':'neutral',delay:'Monthly BLS via FRED'},
        {name:'Core CPI',fullName:'Core CPI ex Food and Energy',value:m.coreCpi&&m.coreCpi.momChange!=null?(m.coreCpi.momChange>0?'+':'')+m.coreCpi.momChange+'% MoM':'N/A',yoy:m.coreCpi&&m.coreCpi.yoyChange!=null?m.coreCpi.yoyChange+'% YoY':null,prior:m.coreCpi&&m.coreCpi.prior!=null?m.coreCpi.prior.toFixed(1):'N/A',date:m.coreCpi?m.coreCpi.date:null,direction:m.coreCpi&&m.coreCpi.momChange>0?'up':'down',signal:m.coreCpi&&m.coreCpi.momChange>0.3?'hot':'neutral',delay:'Monthly BLS via FRED'},
        {name:'PCE',fullName:'Personal Consumption Expenditures - Fed preferred',value:m.pce&&m.pce.momChange!=null?(m.pce.momChange>0?'+':'')+m.pce.momChange+'% MoM':'N/A',yoy:m.pce&&m.pce.yoyChange!=null?m.pce.yoyChange+'% YoY':null,prior:m.pce&&m.pce.prior!=null?m.pce.prior.toFixed(1):'N/A',date:m.pce?m.pce.date:null,direction:m.pce&&m.pce.momChange>0?'up':'down',signal:m.pce&&m.pce.momChange>0.3?'hot':'neutral',delay:'Monthly BEA via FRED'},
        {name:'Core PCE',fullName:'Core PCE ex Food and Energy',value:m.corePce&&m.corePce.momChange!=null?(m.corePce.momChange>0?'+':'')+m.corePce.momChange+'% MoM':'N/A',yoy:m.corePce&&m.corePce.yoyChange!=null?m.corePce.yoyChange+'% YoY':null,prior:m.corePce&&m.corePce.prior!=null?m.corePce.prior.toFixed(1):'N/A',date:m.corePce?m.corePce.date:null,direction:m.corePce&&m.corePce.momChange>0?'up':'down',signal:m.corePce&&m.corePce.momChange>0.3?'hot':'neutral',delay:'Monthly BEA via FRED'},
      ],
      activity:[
        {name:'GDP',fullName:'Real GDP QoQ Annualized',value:m.gdp&&m.gdp.latest!=null?(m.gdp.latest>0?'+':'')+m.gdp.latest.toFixed(1)+'%':'N/A',prior:m.gdp&&m.gdp.prior!=null?(m.gdp.prior>0?'+':'')+m.gdp.prior.toFixed(1)+'%':'N/A',date:m.gdp?m.gdp.date:null,direction:m.gdp&&m.gdp.latest>m.gdp.prior?'up':'down',signal:m.gdp&&m.gdp.latest<0?'hot':'neutral',delay:'Quarterly BEA via FRED'},
        {name:'Retail Sales',fullName:'Advance Retail Sales',value:m.retail&&m.retail.latest!=null?'$'+m.retail.latest+'B':'N/A',prior:m.retail&&m.retail.prior!=null?'$'+m.retail.prior+'B':'N/A',date:m.retail?m.retail.date:null,direction:m.retail&&m.retail.momChange>0?'up':'down',signal:'neutral',delay:'Monthly Census via FRED'},
        {name:'10Y TIPS Real Yield',fullName:'10-Year TIPS Real Yield',value:fred.yields&&fred.yields.tips10y&&fred.yields.tips10y.latest!=null?fred.yields.tips10y.latest.toFixed(2)+'%':'N/A',prior:fred.yields&&fred.yields.tips10y&&fred.yields.tips10y.prior!=null?fred.yields.tips10y.prior.toFixed(2)+'%':'N/A',date:fred.yields&&fred.yields.tips10y?fred.yields.tips10y.date:null,direction:'neutral',signal:fred.yields&&fred.yields.tips10y&&fred.yields.tips10y.latest>2?'hot':'neutral',delay:'Daily FRED',note:'Above 2% restrictive'},
      ],
      timestamp:new Date().toISOString()
    };
  } catch(e){throw e;}
}

export async function fetchAuctions() {
  try { return await fetchLive('/api/auctions'); }
  catch(e) {
    var f = await callClaude('Return JSON with recent Treasury auction results as of '+TODAY+'. Fields: recent array, upcoming array, macro_note string.','Return only raw JSON. Start with {');
    return Object.assign({},f,{delay:'AI estimate verify at treasurydirect.gov'});
  }
}

export async function fetchMonthly() {
  var fb = null;
  try { var fred=await fetchLive('/api/fred'); if(fred&&fred.fedBalance)fb=fred.fedBalance; } catch(e){}
  var data = await callClaude('Return JSON with TIC foreign holdings as of '+TODAY+'. Fields: tic object with report_month/total_foreign_bn/foreign_share_pct/china_net_since_2021_bn/top_holders array. basis_trade object with estimated_size_tn/stress_level/note/sofr_treasury_spread_bp.','Return only raw JSON. Start with {');
  return Object.assign({},data,{
    fed_balance:fb?{report_date:new Date().toISOString().split('T')[0],total_assets_tn:fb.totalAssets?fb.totalAssets.value:null,treasuries_tn:fb.treasuries?fb.treasuries.value:null,mbs_tn:fb.mbs?fb.mbs.value:1.98,reserves_tn:fb.reserves?fb.reserves.value:null,tga_bn:fb.tga?fb.tga.value:null,weekly_change_bn:fb.weeklyChange?fb.weeklyChange.value:null,reserve_mgmt_note:'QT ended Dec 2025. Reserve management phase.',data_source:'Real FRED H.4.1'}:null,
    tga:fb&&fb.tga?{current_bn:fb.tga.value,prior_month_bn:fb.tga.prior,note:'Treasury General Account key liquidity indicator.',delay:'Weekly FRED'}:null,
    delay:'Fed Balance Sheet Real FRED H.4.1 | TIC AI estimate'
  });
}

export async function fetchQuarterly() {
  var re = [];
  try { var e=await fetchLive('/api/earnings'); re=e.earnings||[]; } catch(e){}
  var gd = await callClaude('As of '+TODAY+' Fed 3.50-3.75%. GDP Q1 2026 +2.0%. Return JSON with gov_reports array and upcoming_earnings array. Upcoming: AMZN May 6, GOOGL May 8, META May 12, NVDA May 20, WMT May 15.','Return only raw JSON. Start with {');
  var mt={AAPL:'Apple',MSFT:'Microsoft',NVDA:'Nvidia',GOOGL:'Alphabet',AMZN:'Amazon',META:'Meta',TSLA:'Tesla',JPM:'JPMorgan',XOM:'ExxonMobil'};
  return {earnings:re.map(function(e){return {company:mt[e.symbol]||e.symbol,symbol:e.symbol,quarter:e.quarter,report_date:e.reportDate,eps_actual:e.epsActual,eps_est:e.epsEst,beat_pct:e.beatPct,source:e.source};}),gov_reports:gd?gd.gov_reports:[],upcoming_earnings:gd?gd.upcoming_earnings:[],delay:'Earnings Real Finnhub/SEC | Gov AI estimate'};
}

export async function fetchIntel(userQuestion) {
  var sys = 'Macro analyst. Return ONLY raw JSON. No markdown. Start with {';
  if (userQuestion) {
    return callClaude('Answer this macro question with JSON: answer string, key_points array, data_sources array. Question: '+userQuestion, sys);
  }
  return callClaude('Today '+TODAY+'. Fed 3.50-3.75pct. Gold 4615. VIX 17. SP500 7200. 10Y 4.38pct. CPI 3.3pct. GDP Q1 2.0pct. Deficit 2T. Debt/GDP 122pct. 4 FOMC dissents April 29 2026. Return JSON: thesis string, regime string, regime_confidence string, alerts array with level/title/detail/category, key_risks array with risk/probability/horizon, key_watches array with indicator/why/threshold/source, dalio_lens string, positioning object with usd/gold/long_bonds/equities/rationale.', sys);
}
