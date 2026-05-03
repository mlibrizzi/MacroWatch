import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { fetchDaily, fetchAuctions, fetchWeekly, fetchMonthly, fetchQuarterly, fetchIntel } from './fetchers.js';

const G = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap'); *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent} :root{ --bg:#06090d;--s1:#0b1018;--s2:#111820;--s3:#182030; --b1:#1a2535;--b2:#243040;--b3:#304050; --t1:#e8f0f8;--t2:#8aa0b8;--t3:#4a6080; --acc:#00e5c0;--acc2:#0096ff;--acc3:#ffd060; --up:#00e5c0;--dn:#ff3e5a;--warn:#ffd060;--neu:#8aa0b8; --red:#ff3e5a;--amber:#ffd060;--green:#00e5c0;--blue:#0096ff; --gold:#fbbf24; --mono:'IBM Plex Mono',monospace;--sans:'Outfit',sans-serif; --r:6px; } html,body,#root{height:100%;background:var(--bg)} body{font-family:var(--sans);color:var(--t1);overflow-x:hidden} .app{max-width:430px;margin:0 auto;min-height:100vh;padding-bottom:72px;position:relative} .hdr{background:var(--s1);border-bottom:1px solid var(--b1);padding:env(safe-area-inset-top,12px) 16px 0;position:sticky;top:0;z-index:200} .hdr-top{display:flex;align-items:center;justify-content:space-between;padding-bottom:10px} .logo{font-family:var(--mono);font-size:14px;font-weight:700;color:var(--acc);letter-spacing:3px} .logo em{color:var(--t3);font-style:normal;font-weight:400} .hdr-right{display:flex;align-items:center;gap:8px} .hdr-date{font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:1px;text-align:right;line-height:1.5} .refbtn{background:none;border:1px solid var(--b2);color:var(--acc);padding:5px 10px;border-radius:var(--r);font-family:var(--mono);font-size:10px;cursor:pointer;transition:all .15s} .refbtn:hover{background:rgba(0,229,192,.08);border-color:var(--acc)} .refbtn:disabled{opacity:.35;cursor:not-allowed} .tabs{display:flex;overflow-x:auto;scrollbar-width:none;padding:0 16px} .tabs::-webkit-scrollbar{display:none} .tab{background:none;border:none;border-bottom:2px solid transparent;color:var(--t3);font-family:var(--mono);font-size:9px;letter-spacing:1.5px;padding:8px 12px;cursor:pointer;white-space:nowrap;transition:all .15s} .tab.on{color:var(--acc);border-bottom-color:var(--acc)} .tab:hover:not(.on){color:var(--t1)} .page{padding:12px 16px} .sec{margin-bottom:18px} .sec-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px} .sec-ttl{font-family:var(--mono);font-size:8px;letter-spacing:2.5px;color:var(--t3);text-transform:uppercase} .badge{font-family:var(--mono);font-size:7px;letter-spacing:1px;padding:2px 6px;border-radius:2px;background:rgba(0,229,192,.1);color:var(--acc)} .badge.red{background:rgba(255,62,90,.1);color:var(--red)} .badge.amb{background:rgba(255,208,96,.1);color:var(--amber)} .card{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:12px;margin-bottom:7px} .card.stress{border-left:3px solid var(--amber)} .card.critical{border-left:3px solid var(--red)} .card.ok{border-left:3px solid var(--green)} .row{display:flex;align-items:center;justify-content:space-between} .col-l{flex:1} .col-r{text-align:right} .lbl{font-size:12px;font-weight:500;color:var(--t1)} .sub{font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:1px} .val{font-family:var(--mono);font-size:14px;font-weight:700} .chg{font-family:var(--mono);font-size:10px;margin-top:1px} .up{color:var(--up)}.dn{color:var(--dn)}.neu{color:var(--neu)}.warn{color:var(--warn)}.gold{color:var(--gold)} .tgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px} .tk{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:10px} .tk-sym{font-family:var(--mono);font-size:10px;font-weight:700;color:var(--acc2);margin-bottom:3px} .tk-price{font-family:var(--mono);font-size:15px;font-weight:700} .tk-chg{font-family:var(--mono);font-size:10px;margin-top:2px} .sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px} .sig-box{background:var(--s2);border:1px solid var(--b2);border-radius:var(--r);padding:10px;text-align:center} .sig-lbl{font-family:var(--mono);font-size:7px;color:var(--t3);letter-spacing:1px;margin-bottom:6px} .sig-val{font-family:var(--mono);font-size:13px;font-weight:700;margin-bottom:4px} .sig-status{font-family:var(--mono);font-size:7px;letter-spacing:1px;padding:2px 5px;border-radius:2px;display:inline-block} .sig-note{font-size:9px;color:var(--t3);margin-top:5px;line-height:1.4} .div{height:1px;background:var(--b1);margin:10px 0} .sbar{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);margin-bottom:6px} .sdot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:3px} .sdot.gr{background:var(--green);box-shadow:0 0 5px var(--green)} .sdot.rd{background:var(--red);box-shadow:0 0 5px var(--red)} .sdot.am{background:var(--amber);box-shadow:0 0 5px var(--amber)} .sdot.bl{background:var(--blue);box-shadow:0 0 5px var(--blue)} .stxt{flex:1;font-size:12px;color:var(--t1);line-height:1.4} .smeta{font-family:var(--mono);font-size:9px;color:var(--t3);white-space:nowrap} .load{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 20px;gap:14px} .spin{width:22px;height:22px;border:2px solid var(--b2);border-top-color:var(--acc);border-radius:50%;animation:spin .7s linear infinite} @keyframes spin{to{transform:rotate(360deg)}} .load-txt{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:2px;animation:pulse 1.5s ease-in-out infinite} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}} .zone-legend{display:flex;gap:8px;margin-top:4px;flex-wrap:wrap} .thesis-box{background:var(--s2);border:1px solid var(--b2);border-left:3px solid var(--acc2);border-radius:var(--r);padding:14px;margin-bottom:10px} .thesis-ttl{font-family:var(--mono);font-size:8px;color:var(--acc2);letter-spacing:2px;margin-bottom:8px} .thesis-txt{font-size:12px;color:var(--t1);line-height:1.7} .regime-pill{display:inline-block;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:2px;padding:3px 10px;border-radius:3px;margin-bottom:10px} .pos-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px} .pos-box{background:var(--s2);border:1px solid var(--b2);border-radius:var(--r);padding:8px;text-align:center} .pos-asset{font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:4px} .pos-signal{font-family:var(--mono);font-size:11px;font-weight:700} .intel-card{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:12px;margin-bottom:8px} .intel-ttl{font-family:var(--mono);font-size:10px;font-weight:700;margin-bottom:5px} .intel-det{font-size:11px;color:var(--t2);line-height:1.6} .intel-meta{display:flex;gap:8px;margin-top:6px} .intel-badge{font-family:var(--mono);font-size:7px;padding:2px 5px;border-radius:2px;letter-spacing:1px} .qbox{display:flex;gap:8px;margin-bottom:16px} .qinput{flex:1;background:var(--s2);border:1px solid var(--b2);border-radius:var(--r);color:var(--t1);font-family:var(--sans);font-size:13px;padding:10px 12px;outline:none} .qinput:focus{border-color:var(--acc)} .qinput::placeholder{color:var(--t3)} .qbtn{background:var(--acc);color:var(--bg);font-family:var(--mono);font-size:10px;font-weight:700;border:none;border-radius:var(--r);padding:10px 14px;cursor:pointer;white-space:nowrap} .qbtn:disabled{opacity:.4;cursor:not-allowed} .ans-box{background:var(--s2);border:1px solid var(--b2);border-left:3px solid var(--acc);border-radius:var(--r);padding:14px;margin-bottom:12px} .ans-txt{font-size:12px;color:var(--t1);line-height:1.7;white-space:pre-wrap} .bnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--s1);border-top:1px solid var(--b1);display:flex;padding:8px 0 max(12px,env(safe-area-inset-bottom,12px));z-index:200} .nbtn{flex:1;background:none;border:none;color:var(--t3);font-family:var(--mono);font-size:7px;letter-spacing:1px;cursor:pointer;padding:3px 2px;display:flex;flex-direction:column;align-items:center;gap:4px;transition:color .15s} .nbtn.on{color:var(--acc)} .nbtn svg{width:17px;height:17px;stroke-width:1.5} .rates-tbl{width:100%} .rates-tbl tr:not(:last-child) td{padding-bottom:8px} .rates-tbl td:last-child{text-align:right} .tic-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--b1)} .tic-row:last-child{border-bottom:none} .macro-row{display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--b1)} .macro-row:last-child{border-bottom:none}`;

const fmt = (n, d = 2) => n == null ? ‘N/A’ : Number(n).toLocaleString(‘en-US’, { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = n => n == null ? ‘N/A’ : (n > 0 ? ‘+’ : ‘’) + fmt(n) + ‘%’;
const signCls = n => n == null ? ‘neu’ : n > 0 ? ‘up’ : n < 0 ? ‘dn’ : ‘neu’;
const arrow = n => n > 0 ? ‘up’ : n < 0 ? ‘dn’ : ‘neu’;
const arrowChar = n => n > 0 ? ‘up’ : n < 0 ? ‘dn’ : ‘neu’;

const SIGNAL_COLORS = { expanding:‘up’, tightening:‘dn’, neutral:‘neu’, steepening:‘warn’, flattening:‘neu’, inverted:‘dn’, distrust:‘dn’, normal:‘neu’, ‘risk-on’:‘up’ };
const REGIME_STYLE = {
stagflation:{ bg:‘rgba(255,62,90,.15)’,  color:’#ff3e5a’, label:‘STAGFLATION’ },
reflation:  { bg:‘rgba(255,208,96,.15)’, color:’#ffd060’, label:‘REFLATION’   },
goldilocks: { bg:‘rgba(0,229,192,.12)’,  color:’#00e5c0’, label:‘GOLDILOCKS’  },
deflation:  { bg:‘rgba(0,150,255,.12)’,  color:’#0096ff’, label:‘DEFLATION’   },
crisis:     { bg:‘rgba(255,62,90,.25)’,  color:’#ff3e5a’, label:‘CRISIS’      },
};

function Loading({ text }) {
return (
React.createElement(‘div’, { className:‘load’ },
React.createElement(‘div’, { className:‘spin’ }),
React.createElement(‘div’, { className:‘load-txt’ }, text || ‘LOADING…’)
)
);
}

function DailyTab({ d }) {
if (!d) return React.createElement(Loading, { text:‘FETCHING MARKETS…’ });
const { metals, oil, fx, vix, rates, indices, mag7, derived } = d;

const vixZone = v => !v ? { label:‘N/A’, color:‘var(–neu)’, bg:‘rgba(100,100,100,.1)’ }
: v < 15 ? { label:‘COMPLACENT’, color:‘var(–green)’, bg:‘rgba(0,229,192,.1)’ }
: v < 20 ? { label:‘NORMAL’,     color:‘var(–green)’, bg:‘rgba(0,229,192,.1)’ }
: v < 30 ? { label:‘ELEVATED’,   color:‘var(–amber)’, bg:‘rgba(255,208,96,.1)’ }
: v < 40 ? { label:‘FEAR’,       color:‘var(–red)’,   bg:‘rgba(255,62,90,.12)’ }
:          { label:‘EXTREME’,    color:‘var(–red)’,   bg:‘rgba(255,62,90,.2)’  };

const PCard = ({ label, sub, val, chg, pct, cls, delay }) =>
React.createElement(‘div’, { className:‘card’ },
React.createElement(‘div’, { className:‘row’ },
React.createElement(‘div’, { className:‘col-l’ },
React.createElement(‘div’, { className:‘lbl’ }, label),
React.createElement(‘div’, { className:‘sub’ }, sub),
delay && React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginTop:2} }, ’📡 ’ + delay)
),
React.createElement(‘div’, { className:‘col-r’ },
React.createElement(‘div’, { className:’val ’ + (cls || signCls(chg)) }, val),
chg != null && React.createElement(‘div’, { className:’chg ’ + signCls(chg) },
(chg > 0 ? ’up ’ : chg < 0 ? ‘dn ’ : ‘’) + fmt(Math.abs(chg)) + (pct != null ? ’ (’ + fmtPct(pct) + ‘)’ : ‘’)
)
)
)
);

return React.createElement(‘div’, { className:‘page’ },
derived && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ },
React.createElement(‘div’, { className:‘sec-ttl’ }, ‘REGIME SIGNALS’),
React.createElement(‘div’, { className:‘badge’ }, ‘DERIVED’)
),
React.createElement(‘div’, { className:‘sig-grid’ },
derived.term_premium && React.createElement(‘div’, { className:‘sig-box’ },
React.createElement(‘div’, { className:‘sig-lbl’ }, ‘TERM PREMIUM’),
React.createElement(‘div’, { className:‘sig-val ’ + (SIGNAL_COLORS[derived.term_premium.signal] || ‘neu’) }, fmt(derived.term_premium.value, 2) + ‘%’),
React.createElement(‘div’, { className:‘sig-status’, style:{background:‘rgba(255,208,96,.12)’,color:‘var(–amber)’} }, (derived.term_premium.signal || ‘’).toUpperCase()),
React.createElement(‘div’, { className:‘sig-note’ }, ‘10Y minus 2Y’)
),
derived.liquidity_proxy && React.createElement(‘div’, { className:‘sig-box’ },
React.createElement(‘div’, { className:‘sig-lbl’ }, ‘LIQUIDITY’),
React.createElement(‘div’, { className:‘sig-val ’ + (SIGNAL_COLORS[derived.liquidity_proxy.signal] || ‘neu’) }, fmt(derived.liquidity_proxy.value, 1)),
React.createElement(‘div’, { className:‘sig-status’, style:{background:derived.liquidity_proxy.signal===‘expanding’?‘rgba(0,229,192,.1)’:‘rgba(255,62,90,.1)’,color:derived.liquidity_proxy.signal===‘expanding’?‘var(–green)’:‘var(–red)’} }, (derived.liquidity_proxy.signal || ‘’).toUpperCase()),
React.createElement(‘div’, { className:‘sig-note’ }, ‘SPX / DXY’)
),
derived.gold_vs_yield && React.createElement(‘div’, { className:‘sig-box’ },
React.createElement(‘div’, { className:‘sig-lbl’ }, ‘GOLD/YIELD’),
React.createElement(‘div’, { className:‘sig-val ’ + (SIGNAL_COLORS[derived.gold_vs_yield.signal] || ‘neu’) }, fmt(derived.gold_vs_yield.ratio, 0)),
React.createElement(‘div’, { className:‘sig-status’, style:{background:derived.gold_vs_yield.signal===‘distrust’?‘rgba(255,62,90,.1)’:‘rgba(0,229,192,.1)’,color:derived.gold_vs_yield.signal===‘distrust’?‘var(–red)’:‘var(–green)’} }, (derived.gold_vs_yield.signal || ‘’).toUpperCase()),
React.createElement(‘div’, { className:‘sig-note’ }, ‘Gold / 10Y yield’)
)
)
),
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ },
React.createElement(‘div’, { className:‘sec-ttl’ }, ‘METALS AND COMMODITIES’),
React.createElement(‘div’, { className:‘badge’ }, ‘SPOT’)
),
metals && metals.gold && metals.gold.price && React.createElement(PCard, { label:‘Gold’, sub:‘XAU/USD troy oz’, val:’$’ + fmt(metals.gold.price), chg:metals.gold.change, pct:metals.gold.changePct, cls:‘gold’, delay:metals.gold.delay }),
metals && metals.silver && metals.silver.price && React.createElement(PCard, { label:‘Silver’, sub:‘XAG/USD troy oz’, val:’$’ + fmt(metals.silver.price), chg:metals.silver.change, pct:metals.silver.changePct, delay:metals.silver.delay }),
oil && oil.wti && oil.wti.price && React.createElement(PCard, { label:‘WTI Crude’, sub:‘USD/barrel EIA spot’, val:’$’ + fmt(oil.wti.price), chg:oil.wti.change, pct:oil.wti.changePct, delay:oil.wti.delay }),
oil && oil.brent && oil.brent.price && React.createElement(PCard, { label:‘Brent Crude’, sub:‘USD/barrel EIA spot’, val:’$’ + fmt(oil.brent.price), chg:oil.brent.change, pct:oil.brent.changePct, delay:oil.brent.delay })
),
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ },
React.createElement(‘div’, { className:‘sec-ttl’ }, ‘FX AND VOLATILITY’)
),
React.createElement(‘div’, { className:‘card’ },
React.createElement(‘table’, { className:‘rates-tbl’ },
React.createElement(‘tbody’, null,
fx && fx.dxy && fx.dxy.price && React.createElement(‘tr’, null,
React.createElement(‘td’, null,
React.createElement(‘div’, { className:‘lbl’, style:{fontSize:12} }, ‘DXY’),
React.createElement(‘div’, { className:‘sub’ }, ‘US Dollar Broad Index’),
React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginTop:1} }, ’📡 ’ + (fx.dxy.delay || ‘’))
),
React.createElement(‘td’, null,
React.createElement(‘div’, { className:’val ’ + signCls(fx.dxy.change), style:{fontSize:13} }, fmt(fx.dxy.price, 2)),
fx.dxy.change != null && React.createElement(‘div’, { className:’chg ’ + signCls(fx.dxy.change) }, fmtPct(fx.dxy.changePct))
)
),
fx && fx.eurusd && fx.eurusd.price && React.createElement(‘tr’, null,
React.createElement(‘td’, null, React.createElement(‘div’, { className:‘lbl’, style:{fontSize:12} }, ‘EUR/USD’), React.createElement(‘div’, { className:‘sub’ }, ‘Euro’)),
React.createElement(‘td’, null, React.createElement(‘div’, { className:‘val neu’, style:{fontSize:13} }, fmt(fx.eurusd.price, 4)))
),
fx && fx.jpyusd && fx.jpyusd.price && React.createElement(‘tr’, null,
React.createElement(‘td’, null, React.createElement(‘div’, { className:‘lbl’, style:{fontSize:12} }, ‘USD/JPY’), React.createElement(‘div’, { className:‘sub’ }, ‘Japanese Yen’)),
React.createElement(‘td’, null, React.createElement(‘div’, { className:‘val neu’, style:{fontSize:13} }, fmt(fx.jpyusd.price, 2)))
),
fx && fx.gbpusd && fx.gbpusd.price && React.createElement(‘tr’, null,
React.createElement(‘td’, null, React.createElement(‘div’, { className:‘lbl’, style:{fontSize:12} }, ‘GBP/USD’), React.createElement(‘div’, { className:‘sub’ }, ‘British Pound’)),
React.createElement(‘td’, null, React.createElement(‘div’, { className:‘val neu’, style:{fontSize:13} }, fmt(fx.gbpusd.price, 4)))
),
vix && vix.price && (function() {
var zone = vixZone(vix.price);
return React.createElement(‘tr’, null,
React.createElement(‘td’, null,
React.createElement(‘div’, { className:‘lbl’, style:{fontSize:12} }, ‘VIX’),
React.createElement(‘div’, { className:‘sub’ }, ‘CBOE Volatility Index’),
React.createElement(‘div’, { style:{display:‘inline-block’,marginTop:3,fontFamily:‘var(–mono)’,fontSize:8,fontWeight:700,letterSpacing:1,padding:‘2px 6px’,borderRadius:2,background:zone.bg,color:zone.color} }, zone.label),
React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginTop:2} }, ‘Under 15 Normal | 20-30 Elevated | 30-40 Fear | Over 40 Extreme’),
React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginTop:1} }, ’📡 ’ + (vix.delay || ‘’))
),
React.createElement(‘td’, null,
React.createElement(‘div’, { className:’val ’ + (vix.price > 30 ? ‘dn’ : vix.price > 20 ? ‘warn’ : ‘up’), style:{fontSize:13} }, fmt(vix.price)),
vix.change != null && React.createElement(‘div’, { className:’chg ’ + signCls(vix.change) }, fmtPct(vix.changePct))
)
);
})()
)
)
)
),
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ },
React.createElement(‘div’, { className:‘sec-ttl’ }, ‘TREASURY YIELDS’),
React.createElement(‘div’, { className:‘badge’ }, ‘LIVE’)
),
React.createElement(‘div’, { className:‘card’ },
React.createElement(‘table’, { className:‘rates-tbl’ },
React.createElement(‘tbody’, null,
rates && [
[‘2Y’, ‘2-Year Note’, rates.t2y, rates.t2y && rates.t2y.change_bp],
[‘10Y’, ‘10-Year Note’, rates.t10y, rates.t10y && rates.t10y.change_bp],
[‘30Y’, ‘30-Year Bond’, rates.t30y, rates.t30y && rates.t30y.change_bp]
].filter(function(r) { return r[2] && r[2].yield; }).map(function(r) {
return React.createElement(‘tr’, { key:r[0] },
React.createElement(‘td’, null, React.createElement(‘div’, { className:‘lbl’, style:{fontSize:12} }, r[1])),
React.createElement(‘td’, null,
React.createElement(‘div’, { className:’val ’ + (r[3] > 0 ? ‘dn’ : r[3] < 0 ? ‘up’ : ‘neu’), style:{fontSize:13} }, fmt(r[2].yield, 3) + ‘%’),
r[3] != null && React.createElement(‘div’, { className:’chg ’ + (r[3] > 0 ? ‘dn’ : ‘up’) }, (r[3] > 0 ? ‘+’ : ‘’) + r[3] + ‘bp’)
)
);
}),
rates && rates.fed_funds != null && React.createElement(‘tr’, null,
React.createElement(‘td’, null, React.createElement(‘div’, { className:‘sub’ }, ‘Fed Funds Rate’)),
React.createElement(‘td’, null, React.createElement(‘div’, { className:‘val neu’, style:{fontSize:12} }, fmt(rates.fed_funds, 2) + ‘%’))
),
rates && rates.tips_10y_real != null && React.createElement(‘tr’, null,
React.createElement(‘td’, null, React.createElement(‘div’, { className:‘sub’ }, ‘10Y TIPS Real Yield’)),
React.createElement(‘td’, null, React.createElement(‘div’, { className:’val ’ + (rates.tips_10y_real > 2 ? ‘dn’ : ‘neu’), style:{fontSize:12} }, fmt(rates.tips_10y_real, 2) + ‘%’))
),
React.createElement(‘tr’, null,
React.createElement(‘td’, { colSpan:2 },
React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginTop:4} }, ’📡 ’ + (rates && rates.delay || ‘Daily FRED’))
)
)
)
)
)
),
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘INDICES’)),
React.createElement(‘div’, { className:‘tgrid’ },
(indices || []).map(function(i) {
return React.createElement(‘div’, { className:‘tk’, key:i.symbol },
React.createElement(‘div’, { className:‘tk-sym’ }, i.symbol),
React.createElement(‘div’, { className:‘tk-price’ }, i.price ? i.price.toLocaleString(‘en-US’, {maximumFractionDigits:0}) : ‘N/A’),
React.createElement(‘div’, { className:’tk-chg ’ + signCls(i.changePct) }, (i.changePct > 0 ? ‘+’ : ‘’) + fmt(Math.abs(i.changePct || 0)) + ‘%’)
);
})
)
),
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ },
React.createElement(‘div’, { className:‘sec-ttl’ }, ‘MAG 7’),
React.createElement(‘div’, { className:‘badge’ }, ‘REAL-TIME’)
),
React.createElement(‘div’, { className:‘tgrid’ },
(mag7 || []).map(function(s) {
return React.createElement(‘div’, { className:‘tk’, key:s.symbol },
React.createElement(‘div’, { className:‘tk-sym’ }, s.symbol),
React.createElement(‘div’, { className:‘tk-price’ }, ‘$’ + fmt(s.price)),
React.createElement(‘div’, { className:’tk-chg ’ + signCls(s.changePct) }, (s.changePct > 0 ? ‘+’ : ‘’) + fmt(Math.abs(s.changePct || 0)) + ‘%’)
);
})
)
)
);
}

const BTC_T  = { green:2.5,  yellow:2.3  };
const IND_T  = { green:68,   yellow:62   };
const DLR_T  = { green:14,   yellow:18   };
const TAIL_T = { green:0.5,  yellow:1.0  };

const METRIC_DEFS = {
‘BID/CVR’:  { full:‘Bid-to-Cover Ratio’,  desc:‘Total bids / amount sold. Higher = more demand.’, green:’>2.50x’, yellow:‘2.30-2.50x’, red:’<2.30x’ },
‘INDIRECT’: { full:‘Indirect Bidders %’,  desc:‘Foreign CBs and institutions. Key foreign demand signal.’, green:’>68%’, yellow:‘62-68%’, red:’<62%’ },
‘DEALER’:   { full:‘Primary Dealer %’,    desc:‘Dealers forced to absorb. Higher = weaker demand.’, green:’<14%’, yellow:‘14-18%’, red:’>18%’ },
‘TAIL’:     { full:‘Auction Tail (bp)’,   desc:‘Yield above pre-auction level. Wider = weaker auction.’, green:’<0.5bp’, yellow:‘0.5-1.0bp’, red:’>1.0bp’ },
};

function zoneColor(val, thresholds, invert) {
if (invert) {
if (val > thresholds.yellow) return ‘#ff3e5a’;
if (val > thresholds.green)  return ‘#ffd060’;
return ‘#00e5c0’;
}
if (val >= thresholds.green)  return ‘#00e5c0’;
if (val >= thresholds.yellow) return ‘#ffd060’;
return ‘#ff3e5a’;
}

function MetricDef({ label }) {
var def = METRIC_DEFS[label];
var open = useState(false);
if (!def) return React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–t3)’,letterSpacing:1,paddingBottom:4} }, label);
return React.createElement(‘div’, { style:{marginBottom:8} },
React.createElement(‘div’, { style:{display:‘flex’,alignItems:‘center’,gap:6,cursor:‘pointer’,padding:‘4px 0’}, onClick:function(){ open[1](function(v){ return !v; }); } },
React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–t3)’,letterSpacing:1} }, label),
React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–acc2)’} }, open[0] ? ‘hide’ : ‘tap to define’)
),
open[0] && React.createElement(‘div’, { style:{background:‘var(–s3)’,borderRadius:4,padding:‘8px 10px’,marginBottom:4} },
React.createElement(‘div’, { style:{fontSize:11,fontWeight:600,marginBottom:4} }, def.full),
React.createElement(‘div’, { style:{fontSize:11,color:‘var(–t2)’,lineHeight:1.5,marginBottom:6} }, def.desc),
React.createElement(‘div’, { style:{display:‘flex’,gap:8,flexWrap:‘wrap’} },
React.createElement(‘span’, { style:{fontFamily:‘var(–mono)’,fontSize:9,color:’#00e5c0’} }, ‘GREEN ’ + def.green),
React.createElement(‘span’, { style:{fontFamily:‘var(–mono)’,fontSize:9,color:’#ffd060’} }, ‘YELLOW ’ + def.yellow),
React.createElement(‘span’, { style:{fontFamily:‘var(–mono)’,fontSize:9,color:’#ff3e5a’} }, ’RED ’ + def.red)
)
)
);
}

function AuctionChart({ data, label, field, thresholds, invert, format }) {
if (!data || !data.length) return null;
var pts = data.map(function(a) {
return {
name: (a.term || ‘’).replace(’-Year Note’,‘Y’).replace(’-Year Bond’,‘Y’).replace(’ Note’,’’).replace(’ Bond’,’’).trim(),
val: a[field],
date: a.date
};
}).filter(function(p) { return p.val != null; });

return React.createElement(‘div’, { style:{marginBottom:16} },
React.createElement(MetricDef, { label:label }),
React.createElement(‘div’, { style:{height:120} },
React.createElement(ResponsiveContainer, { width:‘100%’, height:‘100%’ },
React.createElement(BarChart, { data:pts, margin:{top:4,right:4,left:-20,bottom:0} },
React.createElement(XAxis, { dataKey:‘name’, tick:{fill:’#4a6080’,fontSize:9,fontFamily:‘IBM Plex Mono’} }),
React.createElement(YAxis, { tick:{fill:’#4a6080’,fontSize:9,fontFamily:‘IBM Plex Mono’} }),
React.createElement(Tooltip, { contentStyle:{background:’#0b1018’,border:‘1px solid #1a2535’,borderRadius:4,fontFamily:‘IBM Plex Mono’,fontSize:10}, formatter:function(v){ return [format ? format(v) : v, label]; } }),
thresholds.green != null && React.createElement(ReferenceLine, { y:thresholds.green, stroke:’#00e5c0’, strokeDasharray:‘4 2’, strokeWidth:1 }),
thresholds.yellow != null && React.createElement(ReferenceLine, { y:thresholds.yellow, stroke:’#ffd060’, strokeDasharray:‘4 2’, strokeWidth:1 }),
React.createElement(Bar, { dataKey:‘val’, radius:[3,3,0,0] },
pts.map(function(p, i) { return React.createElement(Cell, { key:i, fill:zoneColor(p.val, thresholds, invert) }); })
)
)
)
),
React.createElement(‘div’, { className:‘zone-legend’ },
React.createElement(‘span’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:’#00e5c0’} }, ‘GREEN ’ + (METRIC_DEFS[label] ? METRIC_DEFS[label].green : ‘’)),
React.createElement(‘span’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:’#ffd060’} }, ‘YELLOW ’ + (METRIC_DEFS[label] ? METRIC_DEFS[label].yellow : ‘’)),
React.createElement(‘span’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:’#ff3e5a’} }, ’RED ’ + (METRIC_DEFS[label] ? METRIC_DEFS[label].red : ‘’))
)
);
}

function AuctionsTab({ d }) {
if (!d) return React.createElement(Loading, { text:‘LOADING AUCTIONS…’ });
var statusLabel = function(s) { return s === ‘weak’ ? ‘WEAK’ : s === ‘ok’ ? ‘STRONG’ : ‘MIXED’; };
var statusStyle = function(s) {
return s === ‘weak’ ? {background:‘rgba(255,62,90,.12)’,color:’#ff3e5a’}
: s === ‘ok’ ? {background:‘rgba(0,229,192,.1)’,color:’#00e5c0’}
: {background:‘rgba(255,208,96,.1)’,color:’#ffd060’};
};

return React.createElement(‘div’, { className:‘page’ },
d.delay && React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginBottom:10} }, ‘📡 ’ + d.delay),
d.macro_note && React.createElement(‘div’, { className:‘card stress’, style:{marginBottom:12,fontSize:11,color:‘var(–amber)’,lineHeight:1.6} }, d.macro_note),
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘DEMAND TRENDS - TAP TO DEFINE’)),
React.createElement(AuctionChart, { data:d.recent, label:‘BID/CVR’,  field:‘bid_to_cover’, thresholds:BTC_T,  format:function(v){ return fmt(v) + ‘x’; } }),
React.createElement(AuctionChart, { data:d.recent, label:‘INDIRECT’, field:‘indirect_pct’, thresholds:IND_T,  format:function(v){ return fmt(v) + ‘%’; } }),
React.createElement(AuctionChart, { data:d.recent, label:‘DEALER’,   field:‘dealer_pct’,   thresholds:DLR_T,  invert:true, format:function(v){ return fmt(v) + ‘%’; } }),
React.createElement(AuctionChart, { data:d.recent, label:‘TAIL’,     field:‘tail_bp’,      thresholds:TAIL_T, invert:true, format:function(v){ return fmt(v) + ‘bp’; } })
),
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘RECENT RESULTS’)),
(d.recent || []).map(function(a, i) {
return React.createElement(‘div’, { className:‘card’, key:i },
React.createElement(‘div’, { className:‘row’, style:{marginBottom:8} },
React.createElement(‘div’, null,
React.createElement(‘div’, { className:‘lbl’ }, a.term),
React.createElement(‘div’, { className:‘sub’ }, (a.date || ‘’) + ’ $’ + (a.size_bn || ‘’) + ‘B offering’)
),
React.createElement(‘div’, { style:Object.assign({fontFamily:‘var(–mono)’,fontSize:9,fontWeight:700,letterSpacing:1,padding:‘3px 8px’,borderRadius:3}, statusStyle(a.status)) }, statusLabel(a.status))
),
React.createElement(‘div’, { style:{display:‘grid’,gridTemplateColumns:‘1fr 1fr 1fr 1fr’,gap:6} },
[
[‘BID/CVR’,  fmt(a.bid_to_cover) + ‘x’,  zoneColor(a.bid_to_cover, BTC_T),       ’avg ’ + fmt(a.btc_6mo_avg) + ‘x’],
[‘INDIRECT’, fmt(a.indirect_pct) + ‘%’,   zoneColor(a.indirect_pct, IND_T),       ’avg ’ + fmt(a.indirect_avg) + ‘%’],
[‘DEALER’,   fmt(a.dealer_pct) + ‘%’,     zoneColor(a.dealer_pct,   DLR_T, true), ’avg ’ + fmt(a.dealer_avg) + ‘%’],
[‘TAIL’,     fmt(a.tail_bp) + ‘bp’,       zoneColor(a.tail_bp,      TAIL_T,true), ’avg ’ + fmt(a.tail_avg_bp) + ‘bp’],
].map(function(m) {
return React.createElement(‘div’, { key:m[0], style:{textAlign:‘center’,background:‘var(–s2)’,borderRadius:4,padding:‘6px 4px’} },
React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:7,color:‘var(–t3)’,marginBottom:3,letterSpacing:1} }, m[0]),
React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:12,fontWeight:700,color:m[2]} }, m[1]),
React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginTop:2} }, m[3])
);
})
),
a.note && React.createElement(‘div’, { style:{marginTop:8,fontSize:10,color:‘var(–t3)’,lineHeight:1.5} }, a.note),
a.high_yield && React.createElement(‘div’, { style:{marginTop:4,fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’} }, ‘High yield: ’ + fmt(a.high_yield, 3) + ‘%’)
);
})
),
d.upcoming && d.upcoming.length > 0 && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘UPCOMING AUCTIONS’)),
d.upcoming.map(function(u, i) {
return React.createElement(‘div’, { className:‘sbar’, key:i },
React.createElement(‘div’, { className:‘sdot bl’ }),
React.createElement(‘div’, { className:‘stxt’ }, u.term + ’ $’ + u.size_bn + ‘B’),
React.createElement(‘div’, { className:‘smeta’ }, u.date || ‘’)
);
})
)
);
}

function WeeklyTab({ d }) {
if (!d) return React.createElement(Loading, { text:‘LOADING MACRO DATA…’ });

var signalDot = function(s) { return s === ‘hot’ ? ‘rd’ : s === ‘cool’ ? ‘gr’ : ‘am’; };
var dirCls = function(dir, isInfl) {
if (isInfl) return dir === ‘up’ ? ‘dn’ : dir === ‘down’ ? ‘up’ : ‘neu’;
return dir === ‘up’ ? ‘up’ : dir === ‘down’ ? ‘dn’ : ‘neu’;
};
var dirArrow = function(dir) { return dir === ‘up’ ? ‘up’ : dir === ‘down’ ? ‘dn’ : ‘–’; };

var MacroRow = function(props) {
var ind = props.ind;
var isInfl = props.isInflation;
return React.createElement(‘div’, { className:‘macro-row’ },
React.createElement(‘div’, { className:‘col-l’, style:{flex:1,paddingRight:8} },
React.createElement(‘div’, { style:{display:‘flex’,alignItems:‘flex-start’,gap:6} },
React.createElement(‘div’, { className:’sdot ’ + signalDot(ind.signal), style:{width:7,height:7,borderRadius:‘50%’,flexShrink:0,marginTop:4} }),
React.createElement(‘div’, null,
React.createElement(‘div’, { style:{fontSize:12,fontWeight:600} }, ind.name),
ind.fullName && React.createElement(‘div’, { style:{fontSize:9,color:‘var(–t3)’,marginTop:1,lineHeight:1.3} }, ind.fullName)
)
),
ind.note && React.createElement(‘div’, { style:{fontSize:9,color:‘var(–t3)’,marginTop:3,paddingLeft:13,lineHeight:1.4} }, ind.note),
ind.delay && React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginTop:2,paddingLeft:13} }, ’📡 ’ + ind.delay)
),
React.createElement(‘div’, { className:‘col-r’, style:{textAlign:‘right’,minWidth:100} },
React.createElement(‘div’, { className:’val ’ + dirCls(ind.direction, isInfl), style:{fontSize:12} }, (ind.direction === ‘up’ ? ’▲ ’ : ind.direction === ‘down’ ? ’▼ ’ : ‘’) + ind.value),
ind.yoy && React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–amber)’,marginTop:1} }, ind.yoy),
React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–t3)’,marginTop:1} }, ’prior ’ + (ind.prior || ‘N/A’)),
React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’} }, ind.date || ‘’)
)
);
};

var fp = d.fed_policy;

return React.createElement(‘div’, { className:‘page’ },
fp && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ },
React.createElement(‘div’, { className:‘sec-ttl’ }, ‘FEDERAL RESERVE POLICY’),
React.createElement(‘div’, { className:‘badge’ }, ‘FOMC’)
),
React.createElement(‘div’, { className:‘card’ },
React.createElement(‘div’, { className:‘row’, style:{marginBottom:8} },
React.createElement(‘div’, null,
React.createElement(‘div’, { className:‘lbl’ }, ‘Fed Funds Rate’),
React.createElement(‘div’, { style:{fontSize:9,color:‘var(–t3)’} }, ‘Federal Funds Target Range’)
),
React.createElement(‘div’, { style:{textAlign:‘right’} },
React.createElement(‘div’, { className:‘val neu’ }, fp.current_rate || ‘N/A’),
fp.effr && React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–t3)’} }, ’EFFR: ’ + fp.effr + ‘%’)
)
),
React.createElement(‘div’, { className:‘row’, style:{marginBottom:8} },
React.createElement(‘div’, { className:‘sub’ }, ‘Next FOMC Meeting’),
React.createElement(‘div’, { className:‘sub’ }, fp.next_meeting || ‘N/A’)
),
React.createElement(‘div’, { className:‘row’, style:{marginBottom:8} },
React.createElement(‘div’, null,
React.createElement(‘div’, { className:‘sub’ }, ‘Market Cut Probability’),
React.createElement(‘div’, { style:{fontSize:8,color:‘var(–t3)’,fontFamily:‘var(–mono)’} }, ‘Next meeting’)
),
React.createElement(‘div’, { className:‘val ’ + (fp.market_cut_prob_jun_pct > 50 ? ‘up’ : ‘neu’), style:{fontSize:13} }, fp.market_cut_prob_jun_pct != null ? fp.market_cut_prob_jun_pct + ‘%’ : ‘N/A’)
),
fp.fomc_dissents >= 4 && React.createElement(‘div’, { style:{background:‘rgba(255,208,96,.08)’,border:‘1px solid rgba(255,208,96,.3)’,borderRadius:4,padding:‘7px 9px’,marginBottom:8,fontSize:11,color:‘var(–amber)’,lineHeight:1.5} }, fp.fomc_note || fp.fomc_dissents + ’ dissents at last meeting’),
React.createElement(‘div’, { className:‘div’ }),
fp.powell_status && React.createElement(‘div’, { style:{fontSize:11,color:‘var(–amber)’,lineHeight:1.6,marginBottom:6} }, fp.powell_status),
fp.qt_status && React.createElement(‘div’, { style:{fontSize:10,color:‘var(–t3)’,lineHeight:1.5} }, fp.qt_status),
React.createElement(‘div’, { style:{marginTop:6,fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’} }, ’📡 ’ + (fp.delay || ‘AI estimate’))
)
),
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘LABOR MARKET’)),
React.createElement(‘div’, { className:‘card’ },
(d.labor || []).map(function(ind, i) { return React.createElement(MacroRow, { key:i, ind:ind, isInflation:false }); })
)
),
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ },
React.createElement(‘div’, { className:‘sec-ttl’ }, ‘INFLATION’),
React.createElement(‘div’, { className:‘badge amb’ }, ‘MoM + YoY’)
),
React.createElement(‘div’, { className:‘card’ },
(d.inflation || []).map(function(ind, i) { return React.createElement(MacroRow, { key:i, ind:ind, isInflation:true }); })
)
),
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘ECONOMIC ACTIVITY’)),
React.createElement(‘div’, { className:‘card’ },
(d.activity || []).map(function(ind, i) { return React.createElement(MacroRow, { key:i, ind:ind, isInflation:false }); })
)
)
);
}

function MonthlyTab({ d }) {
if (!d) return React.createElement(Loading, { text:‘LOADING FLOWS DATA…’ });
var trendCls = function(t) { return t === ‘buying’ ? ‘up’ : t === ‘selling’ ? ‘dn’ : ‘neu’; };
var trendArrow = function(t) { return t === ‘buying’ ? ‘▲’ : t === ‘selling’ ? ‘▼’ : ‘–’; };

return React.createElement(‘div’, { className:‘page’ },
d.delay && React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginBottom:10,lineHeight:1.5} }, ’📡 ’ + d.delay),
d.tic && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ },
React.createElement(‘div’, { className:‘sec-ttl’ }, ‘TIC FOREIGN UST HOLDINGS’),
React.createElement(‘div’, { className:‘badge’ }, d.tic.report_month || ‘’)
),
React.createElement(‘div’, { className:‘card’ },
React.createElement(‘div’, { className:‘row’, style:{marginBottom:8} },
React.createElement(‘div’, null,
React.createElement(‘div’, { className:‘lbl’ }, ‘Total Foreign Holdings’),
React.createElement(‘div’, { className:‘sub’ }, ‘Treasury International Capital’)
),
React.createElement(‘div’, { className:‘val neu’, style:{fontSize:13} }, ‘$’ + (d.tic.total_foreign_bn ? d.tic.total_foreign_bn.toLocaleString() : ‘N/A’) + ‘B’)
),
React.createElement(‘div’, { className:‘row’, style:{marginBottom:6} },
React.createElement(‘div’, { className:‘sub’ }, ‘Foreign Share of Total Debt’),
React.createElement(‘div’, { className:‘sub’ }, (d.tic.foreign_share_pct || ‘N/A’) + ‘%’)
),
React.createElement(‘div’, { className:‘div’ }),
(d.tic.top_holders || []).map(function(h, i) {
return React.createElement(‘div’, { className:‘tic-row’, key:i },
React.createElement(‘div’, { style:{fontSize:12,fontWeight:500} }, h.country),
React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:10,color:‘var(–t3)’} }, ‘$’ + (h.holdings_bn ? h.holdings_bn.toLocaleString() : ‘N/A’) + ‘B’),
React.createElement(‘div’, { className:trendCls(h.trend), style:{fontFamily:‘var(–mono)’,fontSize:11,textAlign:‘right’,minWidth:60} }, trendArrow(h.trend) + ’ ’ + (h.mom_bn > 0 ? ‘+’ : ‘’) + (h.mom_bn || 0) + ‘B’)
);
}),
d.tic.china_net_since_2021_bn && React.createElement(‘div’, { style:{marginTop:10,padding:‘7px 9px’,background:‘rgba(255,62,90,.07)’,borderRadius:4,fontSize:10,color:‘var(–red)’} }, ‘China net selling since 2021: $’ + d.tic.china_net_since_2021_bn + ‘B’)
)
),
d.fed_balance && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ },
React.createElement(‘div’, { className:‘sec-ttl’ }, ‘FED BALANCE SHEET’),
React.createElement(‘div’, { className:‘badge’ }, d.fed_balance.report_date || ‘’)
),
React.createElement(‘div’, { className:‘card’ },
[
[‘Total Assets’,      ‘$’ + (d.fed_balance.total_assets_tn || ‘N/A’) + ‘T’],
[‘Treasuries (SOMA)’, ‘$’ + (d.fed_balance.treasuries_tn  || ‘N/A’) + ‘T’],
[‘MBS’,               ‘$’ + (d.fed_balance.mbs_tn         || ‘N/A’) + ‘T’],
[‘Bank Reserves’,     ‘$’ + (d.fed_balance.reserves_tn    || ‘N/A’) + ‘T’],
[‘Weekly Change’,     (d.fed_balance.weekly_change_bn > 0 ? ‘+’ : ‘’) + ‘$’ + (d.fed_balance.weekly_change_bn || ‘N/A’) + ‘B’],
].map(function(r) {
return React.createElement(‘div’, { className:‘row’, style:{marginBottom:8}, key:r[0] },
React.createElement(‘div’, { className:‘sub’ }, r[0]),
React.createElement(‘div’, { className:‘sub’, style:{color:‘var(–t1)’} }, r[1])
);
}),
React.createElement(‘div’, { className:‘div’ }),
d.fed_balance.reserve_mgmt_note && React.createElement(‘div’, { style:{fontSize:11,color:‘var(–amber)’,lineHeight:1.6} }, d.fed_balance.reserve_mgmt_note)
)
),
d.tga && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘TREASURY CASH TGA’)),
React.createElement(‘div’, { className:‘card stress’ },
React.createElement(‘div’, { className:‘row’, style:{marginBottom:6} },
React.createElement(‘div’, null,
React.createElement(‘div’, { className:‘lbl’ }, ‘TGA Balance’),
React.createElement(‘div’, { className:‘sub’ }, ‘Treasury General Account’)
),
React.createElement(‘div’, { className:‘val warn’ }, ‘$’ + (d.tga.current_bn || ‘N/A’) + ‘B’)
),
React.createElement(‘div’, { className:‘row’ },
React.createElement(‘div’, { className:‘sub’ }, ‘Prior Month’),
React.createElement(‘div’, { className:‘sub’ }, ‘$’ + (d.tga.prior_month_bn || ‘N/A’) + ‘B’)
),
d.tga.note && React.createElement(‘div’, { style:{marginTop:8,fontSize:11,color:‘var(–t2)’,lineHeight:1.5} }, d.tga.note)
)
),
d.basis_trade && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘BASIS TRADE REPO STRESS’)),
React.createElement(‘div’, { className:’card ’ + (d.basis_trade.stress_level === ‘elevated’ ? ‘stress’ : ‘ok’) },
React.createElement(‘div’, { className:‘row’, style:{marginBottom:8} },
React.createElement(‘div’, null,
React.createElement(‘div’, { className:‘lbl’ }, ‘Estimated Size’),
React.createElement(‘div’, { className:‘sub’ }, ‘Leveraged Treasury basis positions’)
),
React.createElement(‘div’, { className:‘val warn’ }, ‘$’ + (d.basis_trade.estimated_size_tn || ‘N/A’) + ‘T’)
),
React.createElement(‘div’, { className:‘row’, style:{marginBottom:8} },
React.createElement(‘div’, { className:‘sub’ }, ‘SOFR-Treasury Spread’),
React.createElement(‘div’, { className:’sub ’ + (d.basis_trade.sofr_treasury_spread_bp > 30 ? ‘warn’ : ‘up’) }, (d.basis_trade.sofr_treasury_spread_bp || ‘N/A’) + ‘bp’)
),
d.basis_trade.note && React.createElement(‘div’, { style:{fontSize:11,color:‘var(–t2)’,lineHeight:1.5} }, d.basis_trade.note)
)
)
);
}

function QuarterlyTab({ d }) {
if (!d) return React.createElement(Loading, { text:‘LOADING EARNINGS…’ });

return React.createElement(‘div’, { className:‘page’ },
d.delay && React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginBottom:10,lineHeight:1.5} }, ’📡 ’ + d.delay),
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ },
React.createElement(‘div’, { className:‘sec-ttl’ }, ‘EARNINGS LATEST REPORTED’),
React.createElement(‘div’, { className:‘badge’ }, ‘FINNHUB / SEC’)
),
(d.earnings || []).map(function(e, i) {
var pending = e.eps_actual == null;
var beat = !pending && e.eps_actual >= e.eps_est;
return React.createElement(‘div’, { className:‘card’, key:i },
React.createElement(‘div’, { className:‘row’, style:{marginBottom:6} },
React.createElement(‘div’, null,
React.createElement(‘div’, { className:‘lbl’ }, e.company || e.symbol),
React.createElement(‘div’, { className:‘sub’ }, (e.symbol || ‘’) + ’ ’ + (e.sector || ‘’) + ’ ’ + (e.quarter || ‘’)),
e.report_date && React.createElement(‘div’, { className:‘sub’ }, ’Reported: ’ + e.report_date)
),
pending
? React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:9,padding:‘3px 8px’,borderRadius:3,background:‘rgba(0,150,255,.1)’,color:‘var(–blue)’} }, ‘PENDING’)
: React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:9,padding:‘3px 8px’,borderRadius:3,background:beat?‘rgba(0,229,192,.1)’:‘rgba(255,62,90,.1)’,color:beat?‘var(–green)’:‘var(–red)’} }, beat ? ‘BEAT +’ + fmt(Math.abs(e.beat_pct || 0)) + ‘%’ : ‘MISS -’ + fmt(Math.abs(e.beat_pct || 0)) + ‘%’)
),
!pending && e.eps_actual != null && React.createElement(‘div’, { className:‘row’, style:{marginBottom:4} },
React.createElement(‘div’, { className:‘sub’ }, ’EPS: ‘, React.createElement(‘span’, { style:{color:beat?‘var(–green)’:‘var(–red)’,fontFamily:‘var(–mono)’} }, ‘$’ + fmt(e.eps_actual)), ’ vs est $’ + fmt(e.eps_est))
),
e.key_note && React.createElement(‘div’, { style:{marginTop:5,fontSize:10,color:‘var(–t3)’,lineHeight:1.4} }, e.key_note),
React.createElement(‘div’, { style:{marginTop:4,fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’} }, ’📡 ’ + (e.source || ‘Finnhub / SEC EDGAR’))
);
})
),
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘GOVERNMENT REPORTS’)),
(d.gov_reports || []).map(function(r, i) {
return React.createElement(‘div’, { className:‘sbar’, key:i },
React.createElement(‘div’, { className:’sdot ’ + (r.revision === ‘up’ ? ‘rd’ : r.revision === ‘down’ ? ‘gr’ : ‘bl’) }),
React.createElement(‘div’, { className:‘stxt’ },
React.createElement(‘div’, { style:{fontWeight:600,fontSize:12} }, r.report),
React.createElement(‘div’, { style:{fontSize:11,color:‘var(–t2)’,marginTop:2} }, r.value, ’ ’, React.createElement(‘span’, { style:{color:‘var(–t3)’,fontSize:10} }, ’prior ’ + (r.prior || ‘N/A’))),
r.note && React.createElement(‘div’, { style:{fontSize:10,color:‘var(–t3)’,marginTop:1} }, r.note)
)
);
})
),
d.upcoming_earnings && d.upcoming_earnings.length > 0 && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘UPCOMING EARNINGS’)),
d.upcoming_earnings.map(function(u, i) {
return React.createElement(‘div’, { className:‘sbar’, key:i },
React.createElement(‘div’, { className:‘sdot bl’ }),
React.createElement(‘div’, { className:‘stxt’ }, u.company || u.symbol, ’ ’, React.createElement(‘span’, { style:{fontFamily:‘var(–mono)’,fontSize:10,color:‘var(–t3)’} }, ‘(’ + (u.symbol || ‘’) + ‘)’)),
React.createElement(‘div’, { className:‘smeta’ }, u.date || ‘’)
);
})
)
);
}

function IntelTab({ d, onRefresh, loading }) {
var question = useState(’’);
var answer   = useState(null);
var asking   = useState(false);

var askQuestion = function() {
if (!question[0].trim()) return;
asking[1](true);
answer[1](null);
fetchIntel(question[0]).then(function(res) {
answer[1](res);
asking[1](false);
}).catch(function() {
asking[1](false);
});
};

var regime   = d && d.regime;
var regStyle = REGIME_STYLE[regime] || REGIME_STYLE.reflation || { bg:‘rgba(255,208,96,.15)’, color:’#ffd060’, label:‘ANALYZING’ };
var probCls  = function(p) { return p === ‘high’ ? ‘dn’ : p === ‘medium’ ? ‘warn’ : ‘neu’; };
var posColor = function(p) { return p === ‘bullish’ ? ‘up’ : p === ‘bearish’ ? ‘dn’ : ‘neu’; };

var renderAlert = function(a, i) {
var isStr = typeof a === ‘string’;
var title = isStr ? a : a.title;
var detail = isStr ? null : a.detail;
var level = isStr ? ‘watch’ : (a.level || ‘watch’);
var category = isStr ? null : a.category;
var borderColor = level === ‘critical’ ? ‘var(–red)’ : level === ‘warning’ ? ‘var(–amber)’ : ‘var(–blue)’;
var titleColor  = level === ‘critical’ ? ‘var(–red)’ : level === ‘warning’ ? ‘var(–amber)’ : ‘var(–acc2)’;
return React.createElement(‘div’, { className:‘intel-card’, style:{borderLeft:’3px solid ’ + borderColor}, key:i },
React.createElement(‘div’, { className:‘intel-ttl’, style:{color:titleColor} }, title),
detail && React.createElement(‘div’, { className:‘intel-det’ }, detail),
React.createElement(‘div’, { className:‘intel-meta’ },
category && React.createElement(‘span’, { className:‘intel-badge’, style:{background:‘rgba(0,150,255,.1)’,color:‘var(–blue)’} }, category),
React.createElement(‘span’, { className:‘intel-badge’, style:{background:level===‘critical’?‘rgba(255,62,90,.1)’:‘rgba(255,208,96,.1)’,color:level===‘critical’?‘var(–red)’:‘var(–amber)’} }, level.toUpperCase())
)
);
};

var renderRisk = function(r, i) {
var isStr = typeof r === ‘string’;
var risk = isStr ? r : r.risk;
var prob = isStr ? null : r.probability;
var horizon = isStr ? null : r.horizon;
return React.createElement(‘div’, { className:‘sbar’, key:i },
React.createElement(‘div’, { className:‘sdot rd’ }),
React.createElement(‘div’, { className:‘stxt’ },
React.createElement(‘div’, null, risk),
(prob || horizon) && React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–t3)’,marginTop:2} },
prob ? ’Prob: ’ + prob : ‘’, prob && horizon ? ’ ’ : ‘’, horizon || ‘’
)
)
);
};

var renderWatch = function(w, i) {
var isStr = typeof w === ‘string’;
var indicator = isStr ? w : w.indicator;
var why = isStr ? null : w.why;
var threshold = isStr ? null : w.threshold;
var source = isStr ? null : w.source;
return React.createElement(‘div’, { className:‘sbar’, key:i },
React.createElement(‘div’, { className:‘sdot am’ }),
React.createElement(‘div’, { className:‘stxt’ },
React.createElement(‘div’, { style:{fontWeight:600} }, indicator),
why && React.createElement(‘div’, { style:{fontSize:10,color:‘var(–t3)’,marginTop:1} }, why),
threshold && React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–amber)’,marginTop:2} }, ’Threshold: ’ + threshold),
source && React.createElement(‘div’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginTop:1} }, ’📡 ’ + source)
)
);
};

return React.createElement(‘div’, { className:‘page’ },
React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘ASK A MACRO QUESTION’)),
React.createElement(‘div’, { className:‘qbox’ },
React.createElement(‘input’, { className:‘qinput’, placeholder:‘e.g. What does weak auction demand signal for the dollar?’, value:question[0], onChange:function(e){ question[1](e.target.value); }, onKeyDown:function(e){ if(e.key===‘Enter’) askQuestion(); } }),
React.createElement(‘button’, { className:‘qbtn’, onClick:askQuestion, disabled:asking[0] || !question[0].trim() }, asking[0] ? ‘…’ : ‘ASK’)
),
asking[0] && React.createElement(Loading, { text:‘ANALYZING…’ }),
answer[0] && React.createElement(‘div’, { className:‘ans-box’ },
React.createElement(‘div’, { className:‘thesis-ttl’ }, ‘RESPONSE’),
React.createElement(‘div’, { className:‘ans-txt’ }, answer[0].answer || JSON.stringify(answer[0])),
answer[0].key_points && answer[0].key_points.length > 0 && React.createElement(‘div’, null,
React.createElement(‘div’, { className:‘div’ }),
answer[0].key_points.map(function(p, i) {
return React.createElement(‘div’, { className:‘sbar’, key:i, style:{background:‘transparent’,border:‘none’,padding:‘4px 0’} },
React.createElement(‘div’, { className:‘sdot bl’ }),
React.createElement(‘div’, { className:‘stxt’, style:{fontSize:11} }, p)
);
})
)
)
),
loading && !d && React.createElement(Loading, { text:‘GENERATING BRIEFING…’ }),
d && React.createElement(‘div’, null,
regime && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ },
React.createElement(‘div’, { className:‘sec-ttl’ }, ‘MARKET REGIME’),
React.createElement(‘button’, { className:‘refbtn’, onClick:onRefresh, disabled:loading }, loading ? ‘…’ : ‘REFRESH’)
),
React.createElement(‘div’, { style:{marginBottom:8} },
React.createElement(‘span’, { className:‘regime-pill’, style:{background:regStyle.bg,color:regStyle.color} }, regStyle.label),
React.createElement(‘span’, { style:{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginLeft:8} }, ’Confidence: ’ + ((d.regime_confidence || ‘’).toUpperCase()))
),
d.thesis && React.createElement(‘div’, { className:‘thesis-box’ },
React.createElement(‘div’, { className:‘thesis-ttl’ }, ‘CURRENT THESIS’),
React.createElement(‘div’, { className:‘thesis-txt’ }, d.thesis)
)
),
d.positioning && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘POSITIONING SIGNALS’)),
React.createElement(‘div’, { className:‘pos-grid’ },
[[‘USD’,d.positioning.usd],[‘GOLD’,d.positioning.gold],[‘LONG BONDS’,d.positioning.long_bonds],[‘EQUITIES’,d.positioning.equities]].map(function(a) {
return React.createElement(‘div’, { className:‘pos-box’, key:a[0] },
React.createElement(‘div’, { className:‘pos-asset’ }, a[0]),
React.createElement(‘div’, { className:’pos-signal ’ + posColor(a[1]) }, (a[1] || ‘N/A’).toUpperCase())
);
})
),
d.positioning.rationale && React.createElement(‘div’, { style:{fontSize:11,color:‘var(–t3)’,lineHeight:1.5,marginTop:6} }, d.positioning.rationale)
),
d.alerts && d.alerts.length > 0 && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘ACTIVE SIGNALS’)),
d.alerts.map(renderAlert)
),
d.key_risks && d.key_risks.length > 0 && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘KEY RISKS’)),
d.key_risks.map(renderRisk)
),
d.key_watches && d.key_watches.length > 0 && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘WATCH LIST’)),
d.key_watches.map(renderWatch)
),
d.dalio_lens && React.createElement(‘div’, { className:‘sec’ },
React.createElement(‘div’, { className:‘sec-hdr’ }, React.createElement(‘div’, { className:‘sec-ttl’ }, ‘BIG CYCLE LENS’)),
React.createElement(‘div’, { className:‘thesis-box’, style:{borderLeftColor:‘var(–gold)’} },
React.createElement(‘div’, { className:‘thesis-ttl’, style:{color:‘var(–gold)’} }, ‘RAY DALIO FRAMEWORK’),
React.createElement(‘div’, { className:‘thesis-txt’ }, d.dalio_lens)
)
)
)
);
}

var ICONS = {
daily:     React.createElement(‘svg’, { viewBox:‘0 0 24 24’, fill:‘none’, stroke:‘currentColor’ }, React.createElement(‘polyline’, { points:‘22 12 18 12 15 21 9 3 6 12 2 12’ })),
auctions:  React.createElement(‘svg’, { viewBox:‘0 0 24 24’, fill:‘none’, stroke:‘currentColor’ }, React.createElement(‘rect’, { x:2, y:3, width:20, height:14, rx:2 }), React.createElement(‘line’, { x1:8, y1:21, x2:16, y2:21 }), React.createElement(‘line’, { x1:12, y1:17, x2:12, y2:21 })),
weekly:    React.createElement(‘svg’, { viewBox:‘0 0 24 24’, fill:‘none’, stroke:‘currentColor’ }, React.createElement(‘line’, { x1:18, y1:20, x2:18, y2:10 }), React.createElement(‘line’, { x1:12, y1:20, x2:12, y2:4 }), React.createElement(‘line’, { x1:6, y1:20, x2:6, y2:14 })),
monthly:   React.createElement(‘svg’, { viewBox:‘0 0 24 24’, fill:‘none’, stroke:‘currentColor’ }, React.createElement(‘rect’, { x:3, y:4, width:18, height:18, rx:2 }), React.createElement(‘line’, { x1:16, y1:2, x2:16, y2:6 }), React.createElement(‘line’, { x1:8, y1:2, x2:8, y2:6 }), React.createElement(‘line’, { x1:3, y1:10, x2:21, y2:10 })),
quarterly: React.createElement(‘svg’, { viewBox:‘0 0 24 24’, fill:‘none’, stroke:‘currentColor’ }, React.createElement(‘path’, { d:‘M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z’ }), React.createElement(‘polyline’, { points:‘14 2 14 8 20 8’ })),
intel:     React.createElement(‘svg’, { viewBox:‘0 0 24 24’, fill:‘none’, stroke:‘currentColor’ }, React.createElement(‘circle’, { cx:12, cy:12, r:3 }), React.createElement(‘path’, { d:‘M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83’ })),
};

var TABS = [
{ id:‘daily’,     label:‘DAILY’,    loader:fetchDaily     },
{ id:‘auctions’,  label:‘AUCTIONS’, loader:fetchAuctions  },
{ id:‘weekly’,    label:‘WEEKLY’,   loader:fetchWeekly    },
{ id:‘monthly’,   label:‘MONTHLY’,  loader:fetchMonthly   },
{ id:‘quarterly’, label:‘QTR’,      loader:fetchQuarterly },
{ id:‘intel’,     label:‘INTEL’,    loader:fetchIntel     },
];

export default function App() {
var active  = useState(‘daily’);
var data    = useState({});
var loading = useState({});
var refreshed = useRef({});

var load = useCallback(function(tabId) {
var tab = TABS.find(function(t) { return t.id === tabId; });
if (!tab) return;
loading[1](function(p) { var n = Object.assign({}, p); n[tabId] = true; return n; });
tab.loader().then(function(res) {
data[1](function(p) { var n = Object.assign({}, p); n[tabId] = res; return n; });
refreshed.current[tabId] = new Date();
loading[1](function(p) { var n = Object.assign({}, p); n[tabId] = false; return n; });
}).catch(function(e) {
console.error(‘Load error:’, e);
loading[1](function(p) { var n = Object.assign({}, p); n[tabId] = false; return n; });
});
}, []);

useEffect(function() {
if (!refreshed.current[active[0]]) load(active[0]);
}, [active[0], load]);

var now     = new Date();
var dateStr = now.toLocaleDateString(‘en-US’, {weekday:‘short’,month:‘short’,day:‘numeric’});
var timeStr = now.toLocaleTimeString(‘en-US’, {hour:‘2-digit’,minute:‘2-digit’});

return React.createElement(‘div’, null,
React.createElement(‘style’, null, G),
React.createElement(‘div’, { className:‘app’ },
React.createElement(‘div’, { className:‘hdr’ },
React.createElement(‘div’, { className:‘hdr-top’ },
React.createElement(‘div’, { className:‘logo’ }, ‘MACRO’, React.createElement(‘em’, null, ‘WATCH’)),
React.createElement(‘div’, { className:‘hdr-right’ },
React.createElement(‘div’, { className:‘hdr-date’ }, dateStr, React.createElement(‘br’), timeStr),
React.createElement(‘button’, { className:‘refbtn’, onClick:function(){ load(active[0]); }, disabled:loading[0][active[0]] }, loading[0][active[0]] ? ‘…’ : ‘refresh’)
)
),
React.createElement(‘div’, { className:‘tabs’ },
TABS.map(function(t) {
return React.createElement(‘button’, { key:t.id, className:’tab ’ + (active[0] === t.id ? ‘on’ : ‘’), onClick:function(){ active[1](t.id); } }, t.label);
})
)
),
active[0] === ‘daily’     && React.createElement(DailyTab,     { d:data[0].daily }),
active[0] === ‘auctions’  && React.createElement(AuctionsTab,  { d:data[0].auctions }),
active[0] === ‘weekly’    && React.createElement(WeeklyTab,    { d:data[0].weekly }),
active[0] === ‘monthly’   && React.createElement(MonthlyTab,   { d:data[0].monthly }),
active[0] === ‘quarterly’ && React.createElement(QuarterlyTab, { d:data[0].quarterly }),
active[0] === ‘intel’     && React.createElement(IntelTab,     { d:data[0].intel, loading:loading[0].intel, onRefresh:function(){ load(‘intel’); } }),
React.createElement(‘div’, { className:‘bnav’ },
TABS.map(function(t) {
return React.createElement(‘button’, { key:t.id, className:’nbtn ’ + (active[0] === t.id ? ‘on’ : ‘’), onClick:function(){ active[1](t.id); } },
ICONS[t.id], t.label
);
})
)
)
);
}
