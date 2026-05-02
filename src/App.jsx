import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { fetchDaily, fetchAuctions, fetchWeekly, fetchMonthly, fetchQuarterly, fetchIntel } from './fetchers.js';
const G = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap'); *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent} :root{ --bg:#06090d;--s1:#0b1018;--s2:#111820;--s3:#182030; --b1:#1a2535;--b2:#243040;--b3:#304050; --t1:#e8f0f8;--t2:#8aa0b8;--t3:#4a6080; --acc:#00e5c0;--acc2:#0096ff;--acc3:#ffd060; --up:#00e5c0;--dn:#ff3e5a;--warn:#ffd060;--neu:#8aa0b8; --red:#ff3e5a;--amber:#ffd060;--green:#00e5c0;--blue:#0096ff; --gold:#fbbf24; --mono:'IBM Plex Mono',monospace;--sans:'Outfit',sans-serif; --r:6px; } html,body,#root{height:100%;background:var(--bg)} body{font-family:var(--sans);color:var(--t1);overflow-x:hidden} .app{max-width:430px;margin:0 auto;min-height:100vh;padding-bottom:72px;position:relative} .hdr{background:var(--s1);border-bottom:1px solid var(--b1);padding:env(safe-area-inset-top,12px) 16px 0;position:sticky;top:0;z-index:200} .hdr-top{display:flex;align-items:center;justify-content:space-between;padding-bottom:10px} .logo{font-family:var(--mono);font-size:14px;font-weight:700;color:var(--acc);letter-spacing:3px} .logo em{color:var(--t3);font-style:normal;font-weight:400} .hdr-right{display:flex;align-items:center;gap:8px} .hdr-date{font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:1px;text-align:right;line-height:1.5} .refbtn{background:none;border:1px solid var(--b2);color:var(--acc);padding:5px 10px;border-radius:var(--r);font-family:var(--mono);font-size:10px;cursor:pointer;transition:all .15s} .refbtn:hover{background:rgba(0,229,192,.08);border-color:var(--acc)} .refbtn:disabled{opacity:.35;cursor:not-allowed} .tabs{display:flex;overflow-x:auto;scrollbar-width:none;padding:0 16px} .tabs::-webkit-scrollbar{display:none} .tab{background:none;border:none;border-bottom:2px solid transparent;color:var(--t3);font-family:var(--mono);font-size:9px;letter-spacing:1.5px;padding:8px 12px;cursor:pointer;white-space:nowrap;transition:all .15s} .tab.on{color:var(--acc);border-bottom-color:var(--acc)} .tab:hover:not(.on){color:var(--t1)} .page{padding:12px 16px} .sec{margin-bottom:18px} .sec-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px} .sec-ttl{font-family:var(--mono);font-size:8px;letter-spacing:2.5px;color:var(--t3);text-transform:uppercase} .badge{font-family:var(--mono);font-size:7px;letter-spacing:1px;padding:2px 6px;border-radius:2px;background:rgba(0,229,192,.1);color:var(--acc)} .badge.red{background:rgba(255,62,90,.1);color:var(--red)} .badge.amb{background:rgba(255,208,96,.1);color:var(--amber)} .card{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:12px;margin-bottom:7px} .card.stress{border-left:3px solid var(--amber)} .card.critical{border-left:3px solid var(--red)} .card.ok{border-left:3px solid var(--green)} .row{display:flex;align-items:center;justify-content:space-between} .col-l{flex:1} .col-r{text-align:right} .lbl{font-size:12px;font-weight:500;color:var(--t1)} .sub{font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:1px} .val{font-family:var(--mono);font-size:14px;font-weight:700} .chg{font-family:var(--mono);font-size:10px;margin-top:1px} .up{color:var(--up)}.dn{color:var(--dn)}.neu{color:var(--neu)}.warn{color:var(--warn)}.gold{color:var(--gold)} .tgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px} .tk{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:10px} .tk-sym{font-family:var(--mono);font-size:10px;font-weight:700;color:var(--acc2);margin-bottom:3px} .tk-price{font-family:var(--mono);font-size:15px;font-weight:700} .tk-chg{font-family:var(--mono);font-size:10px;margin-top:2px} .sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px} .sig-box{background:var(--s2);border:1px solid var(--b2);border-radius:var(--r);padding:10px;text-align:center} .sig-lbl{font-family:var(--mono);font-size:7px;color:var(--t3);letter-spacing:1px;margin-bottom:6px} .sig-val{font-family:var(--mono);font-size:13px;font-weight:700;margin-bottom:4px} .sig-status{font-family:var(--mono);font-size:7px;letter-spacing:1px;padding:2px 5px;border-radius:2px;display:inline-block} .sig-note{font-size:9px;color:var(--t3);margin-top:5px;line-height:1.4} .div{height:1px;background:var(--b1);margin:10px 0} .sbar{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);margin-bottom:6px} .sdot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:3px} .sdot.gr{background:var(--green);box-shadow:0 0 5px var(--green)} .sdot.rd{background:var(--red);box-shadow:0 0 5px var(--red)} .sdot.am{background:var(--amber);box-shadow:0 0 5px var(--amber)} .sdot.bl{background:var(--blue);box-shadow:0 0 5px var(--blue)} .stxt{flex:1;font-size:12px;color:var(--t1);line-height:1.4} .smeta{font-family:var(--mono);font-size:9px;color:var(--t3);white-space:nowrap} .load{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 20px;gap:14px} .spin{width:22px;height:22px;border:2px solid var(--b2);border-top-color:var(--acc);border-radius:50%;animation:spin .7s linear infinite} @keyframes spin{to{transform:rotate(360deg)}} .load-txt{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:2px;animation:pulse 1.5s ease-in-out infinite} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}} .zone-legend{display:flex;gap:8px;margin-top:4px;flex-wrap:wrap} .thesis-box{background:var(--s2);border:1px solid var(--b2);border-left:3px solid var(--acc2);border-radius:var(--r);padding:14px;margin-bottom:10px} .thesis-ttl{font-family:var(--mono);font-size:8px;color:var(--acc2);letter-spacing:2px;margin-bottom:8px} .thesis-txt{font-size:12px;color:var(--t1);line-height:1.7} .regime-pill{display:inline-block;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:2px;padding:3px 10px;border-radius:3px;margin-bottom:10px} .pos-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px} .pos-box{background:var(--s2);border:1px solid var(--b2);border-radius:var(--r);padding:8px;text-align:center} .pos-asset{font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:4px} .pos-signal{font-family:var(--mono);font-size:11px;font-weight:700} .intel-card{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:12px;margin-bottom:8px} .intel-ttl{font-family:var(--mono);font-size:10px;font-weight:700;margin-bottom:5px} .intel-det{font-size:11px;color:var(--t2);line-height:1.6} .intel-meta{display:flex;gap:8px;margin-top:6px} .intel-badge{font-family:var(--mono);font-size:7px;padding:2px 5px;border-radius:2px;letter-spacing:1px} .qbox{display:flex;gap:8px;margin-bottom:16px} .qinput{flex:1;background:var(--s2);border:1px solid var(--b2);border-radius:var(--r);color:var(--t1);font-family:var(--sans);font-size:13px;padding:10px 12px;outline:none} .qinput:focus{border-color:var(--acc)} .qinput::placeholder{color:var(--t3)} .qbtn{background:var(--acc);color:var(--bg);font-family:var(--mono);font-size:10px;font-weight:700;border:none;border-radius:var(--r);padding:10px 14px;cursor:pointer;white-space:nowrap} .qbtn:disabled{opacity:.4;cursor:not-allowed} .ans-box{background:var(--s2);border:1px solid var(--b2);border-left:3px solid var(--acc);border-radius:var(--r);padding:14px;margin-bottom:12px} .ans-txt{font-size:12px;color:var(--t1);line-height:1.7;white-space:pre-wrap} .bnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--s1);border-top:1px solid var(--b1);display:flex;padding:8px 0 max(12px,env(safe-area-inset-bottom,12px));z-index:200} .nbtn{flex:1;background:none;border:none;color:var(--t3);font-family:var(--mono);font-size:7px;letter-spacing:1px;cursor:pointer;padding:3px 2px;display:flex;flex-direction:column;align-items:center;gap:4px;transition:color .15s} .nbtn.on{color:var(--acc)} .nbtn svg{width:17px;height:17px;stroke-width:1.5} .rates-tbl{width:100%} .rates-tbl tr:not(:last-child) td{padding-bottom:8px} .rates-tbl td:last-child{text-align:right} .tic-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--b1)} .tic-row:last-child{border-bottom:none} .macro-row{display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--b1)} .macro-row:last-child{border-bottom:none}`;

const fmt = (n, d = 2) => n == null ? ‘—’ : Number(n).toLocaleString(‘en-US’, { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = n => n == null ? ‘—’ : `${n > 0 ? '+' : ''}${fmt(n)}%`;
const signCls = n => n == null ? ‘neu’ : n > 0 ? ‘up’ : n < 0 ? ‘dn’ : ‘neu’;
const arrow = n => n > 0 ? ‘▲’ : n < 0 ? ‘▼’ : ‘–’;

const SIGNAL_COLORS = { expanding:‘up’, tightening:‘dn’, neutral:‘neu’, steepening:‘warn’, flattening:‘neu’, inverted:‘dn’, distrust:‘dn’, normal:‘neu’, ‘risk-on’:‘up’ };
const REGIME_STYLE = {
stagflation:{ bg:‘rgba(255,62,90,.15)’,  color:’#ff3e5a’, label:‘⚠ STAGFLATION’ },
reflation:  { bg:‘rgba(255,208,96,.15)’, color:’#ffd060’, label:‘◈ REFLATION’   },
goldilocks: { bg:‘rgba(0,229,192,.12)’,  color:’#00e5c0’, label:‘◆ GOLDILOCKS’  },
deflation:  { bg:‘rgba(0,150,255,.12)’,  color:’#0096ff’, label:‘▽ DEFLATION’   },
crisis:     { bg:‘rgba(255,62,90,.25)’,  color:’#ff3e5a’, label:‘🔴 CRISIS’      },
};

function Loading({ text = ‘LOADING…’ }) {
return <div className="load"><div className="spin"/><div className="load-txt">{text}</div></div>;
}

/* ─── DAILY TAB ─────────────────────────────────────────────────────────── */
function DailyTab({ d }) {
if (!d) return <Loading text="FETCHING MARKETS..." />;
const { metals, oil, fx, vix, rates, indices, mag7, derived } = d;

const vixZone = v => v < 15 ? { label:‘COMPLACENT’, color:‘var(–green)’, bg:‘rgba(0,229,192,.1)’ }
: v < 20 ? { label:‘NORMAL’,      color:‘var(–green)’, bg:‘rgba(0,229,192,.1)’ }
: v < 30 ? { label:‘ELEVATED’,    color:‘var(–amber)’, bg:‘rgba(255,208,96,.1)’ }
: v < 40 ? { label:‘FEAR’,        color:‘var(–red)’,   bg:‘rgba(255,62,90,.12)’ }
:          { label:‘EXTREME FEAR’,color:‘var(–red)’,   bg:‘rgba(255,62,90,.2)’  };

const PriceCard = ({ label, sub, val, chg, pct, cls, delay }) => (
<div className="card">
<div className="row">
<div className="col-l">
<div className="lbl">{label}</div>
<div className="sub">{sub}</div>
{delay && <div style={{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginTop:2}}>📡 {delay}</div>}
</div>
<div className="col-r">
<div className={`val ${cls || signCls(chg)}`}>{val}</div>
{chg != null && <div className={`chg ${signCls(chg)}`}>{arrow(chg)} {fmt(Math.abs(chg))} ({pct != null ? fmtPct(pct) : ‘’})</div>}
</div>
</div>
</div>
);

return (
<div className="page">
{/* REGIME SIGNALS */}
{derived && (
<div className="sec">
<div className="sec-hdr"><div className="sec-ttl">⬡ REGIME SIGNALS</div><div className="badge">DERIVED</div></div>
<div className="sig-grid">
{derived.term_premium && (
<div className="sig-box">
<div className="sig-lbl">TERM PREMIUM</div>
<div className={`sig-val ${SIGNAL_COLORS[derived.term_premium.signal]||'neu'}`}>{fmt(derived.term_premium.value,2)}%</div>
<div className=“sig-status” style={{background:‘rgba(255,208,96,.12)’,color:‘var(–amber)’}}>{derived.term_premium.signal?.toUpperCase()}</div>
<div className="sig-note">10Y minus 2Y</div>
<div style={{fontFamily:‘var(–mono)’,fontSize:7,color:‘var(–t3)’,marginTop:4}}>📡 {derived.term_premium.delay}</div>
</div>
)}
{derived.liquidity_proxy && (
<div className="sig-box">
<div className="sig-lbl">LIQUIDITY</div>
<div className={`sig-val ${SIGNAL_COLORS[derived.liquidity_proxy.signal]||'neu'}`}>{fmt(derived.liquidity_proxy.value,1)}</div>
<div className=“sig-status” style={{background:derived.liquidity_proxy.signal===‘expanding’?‘rgba(0,229,192,.1)’:‘rgba(255,62,90,.1)’,color:derived.liquidity_proxy.signal===‘expanding’?‘var(–green)’:‘var(–red)’}}>{derived.liquidity_proxy.signal?.toUpperCase()}</div>
<div className="sig-note">SPX / DXY</div>
<div style={{fontFamily:‘var(–mono)’,fontSize:7,color:‘var(–t3)’,marginTop:4}}>📡 {derived.liquidity_proxy.delay}</div>
</div>
)}
{derived.gold_vs_yield && (
<div className="sig-box">
<div className="sig-lbl">GOLD/YIELD</div>
<div className={`sig-val ${SIGNAL_COLORS[derived.gold_vs_yield.signal]||'neu'}`}>{fmt(derived.gold_vs_yield.ratio,0)}</div>
<div className=“sig-status” style={{background:derived.gold_vs_yield.signal===‘distrust’?‘rgba(255,62,90,.1)’:‘rgba(0,229,192,.1)’,color:derived.gold_vs_yield.signal===‘distrust’?‘var(–red)’:‘var(–green)’}}>{derived.gold_vs_yield.signal?.toUpperCase()}</div>
<div className="sig-note">Gold ÷ 10Y yield</div>
<div style={{fontFamily:‘var(–mono)’,fontSize:7,color:‘var(–t3)’,marginTop:4}}>📡 {derived.gold_vs_yield.delay}</div>
</div>
)}
</div>
</div>
)}

```
  {/* METALS */}
  <div className="sec">
    <div className="sec-hdr"><div className="sec-ttl">⬡ METALS & COMMODITIES</div><div className="badge">SPOT</div></div>
    {metals?.gold?.price && <PriceCard label="Gold" sub="XAU/USD · troy oz" val={`$${fmt(metals.gold.price)}`} chg={metals.gold.change} pct={metals.gold.changePct} cls="gold" delay={metals.gold.delay} />}
    {metals?.silver?.price && <PriceCard label="Silver" sub="XAG/USD · troy oz" val={`$${fmt(metals.silver.price)}`} chg={metals.silver.change} pct={metals.silver.changePct} delay={metals.silver.delay} />}
    {oil?.wti?.price && <PriceCard label="WTI Crude" sub="USD/barrel (EIA spot)" val={`$${fmt(oil.wti.price)}`} chg={oil.wti.change} pct={oil.wti.changePct} delay={oil.wti.delay} />}
    {oil?.brent?.price && <PriceCard label="Brent Crude" sub="USD/barrel (EIA spot)" val={`$${fmt(oil.brent.price)}`} chg={oil.brent.change} pct={oil.brent.changePct} delay={oil.brent.delay} />}
  </div>

  {/* FX & VOLATILITY */}
  <div className="sec">
    <div className="sec-hdr"><div className="sec-ttl">⬡ FX & VOLATILITY</div></div>
    <div className="card">
      <table className="rates-tbl">
        <tbody>
          {/* DXY — real FRED broad dollar index */}
          {fx?.dxy?.price && (
            <tr>
              <td>
                <div className="lbl" style={{fontSize:12}}>DXY</div>
                <div className="sub">US Dollar Broad Index</div>
                <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginTop:1}}>📡 {fx.dxy.delay}</div>
              </td>
              <td>
                <div className={`val ${signCls(fx.dxy.change)}`} style={{fontSize:13}}>{fmt(fx.dxy.price,2)}</div>
                {fx.dxy.change != null && <div className={`chg ${signCls(fx.dxy.change)}`}>{arrow(fx.dxy.change)} {fmtPct(fx.dxy.changePct)}</div>}
              </td>
            </tr>
          )}
          {/* EUR/USD */}
          {fx?.eurusd?.price && (
            <tr>
              <td><div className="lbl" style={{fontSize:12}}>EUR/USD</div><div className="sub">Euro · {fx.eurusd.delay}</div></td>
              <td><div className="val neu" style={{fontSize:13}}>{fmt(fx.eurusd.price,4)}</div></td>
            </tr>
          )}
          {/* USD/JPY */}
          {fx?.jpyusd?.price && (
            <tr>
              <td><div className="lbl" style={{fontSize:12}}>USD/JPY</div><div className="sub">Japanese Yen · {fx.jpyusd.delay}</div></td>
              <td><div className="val neu" style={{fontSize:13}}>{fmt(fx.jpyusd.price,2)}</div></td>
            </tr>
          )}
          {/* GBP/USD */}
          {fx?.gbpusd?.price && (
            <tr>
              <td><div className="lbl" style={{fontSize:12}}>GBP/USD</div><div className="sub">British Pound</div></td>
              <td><div className="val neu" style={{fontSize:13}}>{fmt(fx.gbpusd.price,4)}</div></td>
            </tr>
          )}
          {/* VIX with zone indicator */}
          {vix?.price && (() => {
            const zone = vixZone(vix.price);
            return (
              <tr>
                <td>
                  <div className="lbl" style={{fontSize:12}}>VIX</div>
                  <div className="sub">CBOE Volatility Index</div>
                  <div style={{display:'inline-block',marginTop:3,fontFamily:'var(--mono)',fontSize:8,fontWeight:700,letterSpacing:1,padding:'2px 6px',borderRadius:2,background:zone.bg,color:zone.color}}>
                    {zone.label}
                  </div>
                  <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginTop:2}}>
                    {'<15 Normal · 20–30 Elevated · 30–40 Fear · >40 Extreme'}
                  </div>
                  <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginTop:1}}>📡 {vix.delay}</div>
                </td>
                <td>
                  <div className={`val ${vix.price>30?'dn':vix.price>20?'warn':'up'}`} style={{fontSize:13}}>{fmt(vix.price)}</div>
                  {vix.change != null && <div className={`chg ${signCls(vix.change)}`}>{arrow(vix.change)} {fmtPct(vix.changePct)}</div>}
                </td>
              </tr>
            );
          })()}
        </tbody>
      </table>
    </div>
  </div>

  {/* TREASURY YIELDS */}
  <div className="sec">
    <div className="sec-hdr"><div className="sec-ttl">⬡ TREASURY YIELDS</div><div className="badge">LIVE</div></div>
    <div className="card">
      <table className="rates-tbl">
        <tbody>
          {rates && [
            ['2Y','2-Year Note',rates.t2y,rates.t2y?.change_bp],
            ['10Y','10-Year Note',rates.t10y,rates.t10y?.change_bp],
            ['30Y','30-Year Bond',rates.t30y,rates.t30y?.change_bp],
          ].map(([k,lbl,v,bp]) => v?.yield ? (
            <tr key={k}>
              <td><div className="lbl" style={{fontSize:12}}>{lbl}</div></td>
              <td>
                <div className={`val ${bp>0?'dn':bp<0?'up':'neu'}`} style={{fontSize:13}}>{fmt(v.yield,3)}%</div>
                {bp != null && <div className={`chg ${bp>0?'dn':'up'}`}>{bp>0?'▲':'▼'} {Math.abs(bp)}bp</div>}
              </td>
            </tr>
          ) : null)}
          {rates?.fed_funds != null && (
            <>
              <tr><td colSpan={2}><div className="div"/></td></tr>
              <tr>
                <td><div className="sub">Fed Funds Rate</div></td>
                <td><div className="val neu" style={{fontSize:12}}>{fmt(rates.fed_funds,2)}%</div></td>
              </tr>
              {rates.tips_10y_real != null && (
                <tr>
                  <td><div className="sub">10Y TIPS Real Yield</div></td>
                  <td><div className={`val ${rates.tips_10y_real>2?'dn':'neu'}`} style={{fontSize:12}}>{fmt(rates.tips_10y_real,2)}%</div></td>
                </tr>
              )}
              <tr><td colSpan={2}><div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginTop:4}}>📡 {rates.delay}</div></td></tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  </div>

  {/* INDICES */}
  <div className="sec">
    <div className="sec-hdr"><div className="sec-ttl">⬡ INDICES</div></div>
    <div className="tgrid">
      {indices?.map(i => (
        <div className="tk" key={i.symbol}>
          <div className="tk-sym">{i.symbol}</div>
          <div className="tk-price">{i.price?.toLocaleString('en-US',{maximumFractionDigits:0})}</div>
          <div className={`tk-chg ${signCls(i.changePct)}`}>{arrow(i.changePct)} {fmt(Math.abs(i.changePct))}%</div>
          <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t3)',marginTop:2}}>Finnhub</div>
        </div>
      ))}
    </div>
  </div>

  {/* MAG 7 */}
  <div className="sec">
    <div className="sec-hdr"><div className="sec-ttl">⬡ MAG 7</div><div className="badge">REAL-TIME</div></div>
    <div className="tgrid">
      {mag7?.map(s => (
        <div className="tk" key={s.symbol}>
          <div className="tk-sym">{s.symbol}</div>
          <div className="tk-price">${fmt(s.price)}</div>
          <div className={`tk-chg ${signCls(s.changePct)}`}>{arrow(s.changePct)} {fmt(Math.abs(s.changePct))}%</div>
        </div>
      ))}
    </div>
  </div>
</div>
```

);
}

/* ─── AUCTIONS TAB ──────────────────────────────────────────────────────── */
const BTC_THRESHOLDS  = { green:2.5,  yellow:2.3  };
const IND_THRESHOLDS  = { green:68,   yellow:62   };
const DLR_THRESHOLDS  = { green:14,   yellow:18   };
const TAIL_THRESHOLDS = { green:0.5,  yellow:1.0  };

const METRIC_DEFS = {
‘BID/CVR’:  { full:‘Bid-to-Cover Ratio’,    desc:‘Total bids received ÷ amount sold. Measures overall demand for the auction.’,          green:’>2.50x’,   yellow:‘2.30–2.50x’, red:’<2.30x’  },
‘INDIRECT’: { full:‘Indirect Bidders %’,    desc:‘Foreign central banks & institutions buying via primary dealers. Key foreign demand signal.’, green:’>68%’, yellow:‘62–68%’,   red:’<62%’    },
‘DEALER’:   { full:‘Primary Dealer %’,      desc:‘Amount dealers were forced to absorb. Higher = weaker real demand. Dealers are buyer of last resort.’, green:’<14%’, yellow:‘14–18%’, red:’>18%’ },
‘TAIL’:     { full:‘Auction Tail (bp)’,      desc:‘Yield above pre-auction market level. Wider tail = auction came in weaker than expected. 1bp = 0.01%.’, green:’<0.5bp’, yellow:‘0.5–1.0bp’, red:’>1.0bp’ },
};

function zoneColor(val, { green, yellow }, invert=false) {
if (invert) { if (val>yellow) return ‘#ff3e5a’; if (val>green) return ‘#ffd060’; return ‘#00e5c0’; }
if (val>=green) return ‘#00e5c0’; if (val>=yellow) return ‘#ffd060’; return ‘#ff3e5a’;
}

function MetricDef({ label }) {
const [open, setOpen] = useState(false);
const def = METRIC_DEFS[label];
if (!def) return <div style={{fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–t3)’,letterSpacing:1,paddingBottom:4}}>{label}</div>;
return (
<div style={{marginBottom:8}}>
<div style={{display:‘flex’,alignItems:‘center’,gap:6,cursor:‘pointer’,padding:‘4px 0’}} onClick={()=>setOpen(o=>!o)}>
<div style={{fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–t3)’,letterSpacing:1}}>{label}</div>
<div style={{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–acc2)’}}>{open?‘▲ hide’:‘▼ define’}</div>
</div>
{open && (
<div style={{background:‘var(–s3)’,borderRadius:4,padding:‘8px 10px’,marginBottom:4}}>
<div style={{fontSize:11,fontWeight:600,marginBottom:4}}>{def.full}</div>
<div style={{fontSize:11,color:‘var(–t2)’,lineHeight:1.5,marginBottom:6}}>{def.desc}</div>
<div style={{display:‘flex’,gap:8,flexWrap:‘wrap’}}>
<span style={{fontFamily:‘var(–mono)’,fontSize:9,color:’#00e5c0’}}>🟢 {def.green}</span>
<span style={{fontFamily:‘var(–mono)’,fontSize:9,color:’#ffd060’}}>🟡 {def.yellow}</span>
<span style={{fontFamily:‘var(–mono)’,fontSize:9,color:’#ff3e5a’}}>🔴 {def.red}</span>
</div>
</div>
)}
</div>
);
}

function AuctionChart({ data, label, field, thresholds, invert, format }) {
if (!data?.length) return null;
const pts = data.map(a => ({
name: a.term?.replace(’-Year Note’,‘Y’).replace(’-Year Bond’,‘Y’).replace(’ Note’,’’).replace(’ Bond’,’’).trim(),
val: a[field], date: a.date
})).filter(p => p.val != null);
return (
<div style={{marginBottom:16}}>
<MetricDef label={label}/>
<div style={{height:120}}>
<ResponsiveContainer width="100%" height="100%">
<BarChart data={pts} margin={{top:4,right:4,left:-20,bottom:0}}>
<XAxis dataKey=“name” tick={{fill:’#4a6080’,fontSize:9,fontFamily:‘IBM Plex Mono’}}/>
<YAxis tick={{fill:’#4a6080’,fontSize:9,fontFamily:‘IBM Plex Mono’}}/>
<Tooltip contentStyle={{background:’#0b1018’,border:‘1px solid #1a2535’,borderRadius:4,fontFamily:‘IBM Plex Mono’,fontSize:10}} formatter={v=>[format?format(v):v,label]}/>
{thresholds.green  != null && <ReferenceLine y={thresholds.green}  stroke="#00e5c0" strokeDasharray="4 2" strokeWidth={1}/>}
{thresholds.yellow != null && <ReferenceLine y={thresholds.yellow} stroke="#ffd060" strokeDasharray="4 2" strokeWidth={1}/>}
<Bar dataKey="val" radius={[3,3,0,0]}>
{pts.map((p,i) => <Cell key={i} fill={zoneColor(p.val,thresholds,invert)}/>)}
</Bar>
</BarChart>
</ResponsiveContainer>
</div>
<div className="zone-legend">
<span style={{fontFamily:‘var(–mono)’,fontSize:8,color:’#00e5c0’}}>🟢 {METRIC_DEFS[label]?.green}</span>
<span style={{fontFamily:‘var(–mono)’,fontSize:8,color:’#ffd060’}}>🟡 {METRIC_DEFS[label]?.yellow}</span>
<span style={{fontFamily:‘var(–mono)’,fontSize:8,color:’#ff3e5a’}}>🔴 {METRIC_DEFS[label]?.red}</span>
</div>
</div>
);
}

function AuctionsTab({ d }) {
if (!d) return <Loading text="LOADING AUCTIONS..."/>;
const statusLabel = s => s===‘weak’?‘WEAK’:s===‘ok’?‘STRONG’:‘MIXED’;
const statusStyle = s => s===‘weak’
? {background:‘rgba(255,62,90,.12)’,color:’#ff3e5a’}
: s===‘ok’
? {background:‘rgba(0,229,192,.1)’,color:’#00e5c0’}
: {background:‘rgba(255,208,96,.1)’,color:’#ffd060’};

return (
<div className="page">
{d.delay && <div style={{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginBottom:10}}>📡 {d.delay}</div>}
{d.macro_note && <div className=“card stress” style={{marginBottom:12,fontSize:11,color:‘var(–amber)’,lineHeight:1.6}}>⚠ {d.macro_note}</div>}

```
  <div className="sec">
    <div className="sec-hdr"><div className="sec-ttl">⬡ DEMAND TRENDS — TAP TO DEFINE</div></div>
    <AuctionChart data={d.recent} label="BID/CVR"  field="bid_to_cover" thresholds={BTC_THRESHOLDS}  format={v=>`${fmt(v)}x`}/>
    <AuctionChart data={d.recent} label="INDIRECT" field="indirect_pct" thresholds={IND_THRESHOLDS}  format={v=>`${fmt(v)}%`}/>
    <AuctionChart data={d.recent} label="DEALER"   field="dealer_pct"   thresholds={DLR_THRESHOLDS}  invert format={v=>`${fmt(v)}%`}/>
    <AuctionChart data={d.recent} label="TAIL"     field="tail_bp"      thresholds={TAIL_THRESHOLDS} invert format={v=>`${fmt(v)}bp`}/>
  </div>

  <div className="sec">
    <div className="sec-hdr"><div className="sec-ttl">⬡ RECENT RESULTS</div></div>
    {d.recent?.map((a,i) => (
      <div className="card" key={i}>
        <div className="row" style={{marginBottom:8}}>
          <div><div className="lbl">{a.term}</div><div className="sub">{a.date} · ${a.size_bn}B offering</div></div>
          <div style={{...statusStyle(a.status),fontFamily:'var(--mono)',fontSize:9,fontWeight:700,letterSpacing:1,padding:'3px 8px',borderRadius:3}}>{statusLabel(a.status)}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6}}>
          {[
            ['BID/CVR',  `${fmt(a.bid_to_cover)}x`,  zoneColor(a.bid_to_cover,BTC_THRESHOLDS),       `avg ${fmt(a.btc_6mo_avg)}x`],
            ['INDIRECT', `${fmt(a.indirect_pct)}%`,  zoneColor(a.indirect_pct,IND_THRESHOLDS),       `avg ${fmt(a.indirect_avg)}%`],
            ['DEALER',   `${fmt(a.dealer_pct)}%`,    zoneColor(a.dealer_pct,  DLR_THRESHOLDS,true),  `avg ${fmt(a.dealer_avg)}%`],
            ['TAIL',     `${fmt(a.tail_bp)}bp`,      zoneColor(a.tail_bp,     TAIL_THRESHOLDS,true), `avg ${fmt(a.tail_avg_bp)}bp`],
          ].map(([lbl,val,color,avg]) => (
            <div key={lbl} style={{textAlign:'center',background:'var(--s2)',borderRadius:4,padding:'6px 4px'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t3)',marginBottom:3,letterSpacing:1}}>{lbl}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:700,color}}>{val}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginTop:2}}>{avg}</div>
            </div>
          ))}
        </div>
        {a.note && <div style={{marginTop:8,fontSize:10,color:'var(--t3)',lineHeight:1.5}}>{a.note}</div>}
        {a.high_yield && <div style={{marginTop:4,fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)'}}>High yield: {fmt(a.high_yield,3)}%</div>}
      </div>
    ))}
  </div>

  {d.upcoming?.length > 0 && (
    <div className="sec">
      <div className="sec-hdr"><div className="sec-ttl">⬡ UPCOMING AUCTIONS</div></div>
      {d.upcoming.map((u,i) => (
        <div className="sbar" key={i}>
          <div className="sdot bl"/>
          <div className="stxt">{u.term} · ${u.size_bn}B</div>
          <div className="smeta">{u.date}</div>
        </div>
      ))}
    </div>
  )}
</div>
```

);
}

/* ─── WEEKLY TAB ────────────────────────────────────────────────────────── */
function WeeklyTab({ d }) {
if (!d) return <Loading text="LOADING MACRO DATA..."/>;

const signalDot = s => s===‘hot’?‘rd’:s===‘cool’?‘gr’:‘am’;
const dirCls = (dir, isInflation) => {
if (isInflation) return dir===‘up’?‘dn’:dir===‘down’?‘up’:‘neu’;
return dir===‘up’?‘up’:dir===‘down’?‘dn’:‘neu’;
};
const dirArrow = dir => dir===‘up’?‘▲’:dir===‘down’?‘▼’:’–’;

const MacroRow = ({ ind, isInflation }) => (
<div className="macro-row">
<div className="col-l" style={{flex:1,paddingRight:8}}>
<div style={{display:‘flex’,alignItems:‘flex-start’,gap:6}}>
<div className={`sdot ${signalDot(ind.signal)}`} style={{width:7,height:7,borderRadius:‘50%’,flexShrink:0,marginTop:4}}/>
<div>
<div style={{fontSize:12,fontWeight:600}}>{ind.name}</div>
{ind.fullName && <div style={{fontSize:9,color:‘var(–t3)’,marginTop:1,lineHeight:1.3}}>{ind.fullName}</div>}
</div>
</div>
{ind.note && <div style={{fontSize:9,color:‘var(–t3)’,marginTop:3,paddingLeft:13,lineHeight:1.4}}>{ind.note}</div>}
{ind.delay && <div style={{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginTop:2,paddingLeft:13}}>📡 {ind.delay}</div>}
</div>
<div className=“col-r” style={{textAlign:‘right’,minWidth:100}}>
<div className={`val ${dirCls(ind.direction,isInflation)}`} style={{fontSize:12}}>
{dirArrow(ind.direction)} {ind.value}
</div>
{/* Show YoY if available */}
{ind.yoy && (
<div style={{fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–amber)’,marginTop:1}}>{ind.yoy}</div>
)}
<div style={{fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–t3)’,marginTop:1}}>prior {ind.prior}</div>
<div style={{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’}}>{ind.date}</div>
</div>
</div>
);

const fp = d.fed_policy;

return (
<div className="page">
{/* FED POLICY — using real FRED rate */}
{fp && (
<div className="sec">
<div className="sec-hdr"><div className="sec-ttl">⬡ FEDERAL RESERVE POLICY</div><div className="badge">FOMC</div></div>
<div className="card">
<div className="row" style={{marginBottom:8}}>
<div>
<div className="lbl">Fed Funds Rate</div>
<div style={{fontSize:9,color:‘var(–t3)’}}>Federal Funds Target Range</div>
</div>
<div style={{textAlign:‘right’}}>
<div className="val neu">{fp.current_rate}</div>
{fp.effr && <div style={{fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–t3)’}}>EFFR: {fp.effr?.toFixed(2)}%</div>}
</div>
</div>
<div className="row" style={{marginBottom:8}}>
<div className="sub">Next FOMC Meeting</div>
<div className="sub">{fp.next_meeting}</div>
</div>
<div className="row" style={{marginBottom:8}}>
<div>
<div className="sub">Market Cut Probability</div>
<div style={{fontSize:8,color:‘var(–t3)’,fontFamily:‘var(–mono)’}}>June meeting</div>
</div>
<div className={`val ${(fp.market_cut_prob_jun_pct||0)>50?'up':'neu'}`} style={{fontSize:13}}>
{fp.market_cut_prob_jun_pct != null ? `${fp.market_cut_prob_jun_pct}%` : ‘—’}
</div>
</div>

```
        {/* FOMC dissent alert */}
        {fp.fomc_dissents >= 4 && (
          <div style={{
            background:'rgba(255,208,96,.08)',border:'1px solid rgba(255,208,96,.3)',
            borderRadius:4,padding:'7px 9px',marginBottom:8,
            fontSize:11,color:'var(--amber)',lineHeight:1.5
          }}>
            ⚡ {fp.fomc_note || `${fp.fomc_dissents} dissents at last meeting`}
          </div>
        )}

        <div className="div"/>
        {fp.powell_status && <div style={{fontSize:11,color:'var(--amber)',lineHeight:1.6,marginBottom:6}}>{fp.powell_status}</div>}
        {fp.qt_status     && <div style={{fontSize:10,color:'var(--t3)',lineHeight:1.5}}>{fp.qt_status}</div>}
        <div style={{marginTop:6,fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)'}}>📡 {fp.delay}</div>
      </div>
    </div>
  )}

  {/* LABOR */}
  <div className="sec">
    <div className="sec-hdr"><div className="sec-ttl">⬡ LABOR MARKET</div></div>
    <div className="card">{d.labor?.map((ind,i)=><MacroRow key={i} ind={ind} isInflation={false}/>)}</div>
  </div>

  {/* INFLATION */}
  <div className="sec">
    <div className="sec-hdr"><div className="sec-ttl">⬡ INFLATION</div><div className="badge amb">MoM + YoY</div></div>
    <div className="card">{d.inflation?.map((ind,i)=><MacroRow key={i} ind={ind} isInflation={true}/>)}</div>
  </div>

  {/* ACTIVITY */}
  <div className="sec">
    <div className="sec-hdr"><div className="sec-ttl">⬡ ECONOMIC ACTIVITY</div></div>
    <div className="card">{d.activity?.map((ind,i)=><MacroRow key={i} ind={ind} isInflation={false}/>)}</div>
  </div>
</div>
```

);
}

function MonthlyTab({ d }) {
if (!d) return <Loading text="LOADING FLOWS DATA..."/>;
const trendCls   = t => t===‘buying’?‘up’:t===‘selling’?‘dn’:‘neu’;
const trendArrow = t => t===‘buying’?‘▲’:t===‘selling’?‘▼’:’–’;

return (
<div className="page">
{d.delay && <div style={{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginBottom:10}}>📡 {d.delay}</div>}

```
  {d.tic && (
    <div className="sec">
      <div className="sec-hdr"><div className="sec-ttl">⬡ TIC — FOREIGN UST HOLDINGS</div><div className="badge">{d.tic.report_month}</div></div>
      <div className="card">
        <div className="row" style={{marginBottom:8}}>
          <div><div className="lbl">Total Foreign Holdings</div><div className="sub">Treasury International Capital</div></div>
          <div className="val neu" style={{fontSize:13}}>${d.tic.total_foreign_bn?.toLocaleString()}B</div>
        </div>
        <div className="row" style={{marginBottom:6}}>
          <div className="sub">Foreign Share of Total Debt</div>
          <div className="sub">{d.tic.foreign_share_pct}%</div>
        </div>
        <div className="div"/>
        {d.tic.top_holders?.map((h,i) => (
          <div className="tic-row" key={i}>
            <div style={{fontSize:12,fontWeight:500}}>{h.country}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>${h.holdings_bn?.toLocaleString()}B</div>
            <div className={trendCls(h.trend)} style={{fontFamily:'var(--mono)',fontSize:11,textAlign:'right',minWidth:60}}>
              {trendArrow(h.trend)} {h.mom_bn>0?'+':''}{h.mom_bn}B
            </div>
          </div>
        ))}
        {d.tic.china_net_since_2021_bn && (
          <div style={{marginTop:10,padding:'7px 9px',background:'rgba(255,62,90,.07)',borderRadius:4,fontSize:10,color:'var(--red)'}}>
            China net selling since 2021: ${d.tic.china_net_since_2021_bn}B
          </div>
        )}
      </div>
    </div>
  )}

  {d.fed_balance && (
    <div className="sec">
      <div className="sec-hdr"><div className="sec-ttl">⬡ FED BALANCE SHEET</div><div className="badge">{d.fed_balance.report_date}</div></div>
      <div className="card">
        {[
          ['Total Assets',       `$${d.fed_balance.total_assets_tn?.toFixed(2)}T`],
          ['Treasuries (SOMA)',  `$${d.fed_balance.treasuries_tn?.toFixed(2)}T`],
          ['MBS',               `$${d.fed_balance.mbs_tn?.toFixed(2)}T`],
          ['Bank Reserves',     `$${d.fed_balance.reserves_tn?.toFixed(2)}T`],
          ['Weekly Change',     `${d.fed_balance.weekly_change_bn>0?'+':''}$${d.fed_balance.weekly_change_bn}B`],
        ].map(([lbl,val]) => (
          <div className="row" style={{marginBottom:8}} key={lbl}>
            <div className="sub">{lbl}</div><div className="sub" style={{color:'var(--t1)'}}>{val}</div>
          </div>
        ))}
        <div className="div"/>
        <div style={{fontSize:11,color:'var(--amber)',lineHeight:1.6}}>{d.fed_balance.reserve_mgmt_note}</div>
      </div>
    </div>
  )}

  {d.tga && (
    <div className="sec">
      <div className="sec-hdr"><div className="sec-ttl">⬡ TREASURY CASH (TGA)</div></div>
      <div className="card stress">
        <div className="row" style={{marginBottom:6}}>
          <div><div className="lbl">TGA Balance</div><div className="sub">Treasury General Account</div></div>
          <div className="val warn">${d.tga.current_bn}B</div>
        </div>
        <div className="row"><div className="sub">Prior Month</div><div className="sub">${d.tga.prior_month_bn}B</div></div>
        <div style={{marginTop:8,fontSize:11,color:'var(--t2)',lineHeight:1.5}}>{d.tga.note}</div>
      </div>
    </div>
  )}

  {d.basis_trade && (
    <div className="sec">
      <div className="sec-hdr"><div className="sec-ttl">⬡ BASIS TRADE / REPO STRESS</div></div>
      <div className={`card ${d.basis_trade.stress_level==='elevated'?'stress':'ok'}`}>
        <div className="row" style={{marginBottom:8}}>
          <div><div className="lbl">Estimated Size</div><div className="sub">Leveraged Treasury basis positions</div></div>
          <div className="val warn">${d.basis_trade.estimated_size_tn?.toFixed(1)}T</div>
        </div>
        <div className="row" style={{marginBottom:8}}>
          <div className="sub">SOFR-Treasury Spread</div>
          <div className={`sub ${d.basis_trade.sofr_treasury_spread_bp>30?'warn':'up'}`}>{d.basis_trade.sofr_treasury_spread_bp}bp</div>
        </div>
        <div style={{fontSize:11,color:'var(--t2)',lineHeight:1.5}}>{d.basis_trade.note}</div>
      </div>
    </div>
  )}
</div>
```

);
}

/* ─── QUARTERLY TAB ─────────────────────────────────────────────────────── */

function QuarterlyTab({ d }) {
if (!d) return <Loading text="LOADING EARNINGS..."/>;

return (
<div className="page">
{d.delay && (
<div style={{fontFamily:‘var(–mono)’,fontSize:8,color:‘var(–t3)’,marginBottom:10,lineHeight:1.5}}>
📡 {d.delay}
</div>
)}

```
  {/* EARNINGS */}
  <div className="sec">
    <div className="sec-hdr">
      <div className="sec-ttl">⬡ EARNINGS — LATEST REPORTED</div>
      <div className="badge">FINNHUB / SEC</div>
    </div>
    {d.earnings?.map((e,i) => {
      const pending = e.eps_actual == null;
      const beat    = !pending && e.eps_actual >= e.eps_est;
      return (
        <div className="card" key={i}>
          <div className="row" style={{marginBottom:6}}>
            <div>
              <div className="lbl">{e.company || e.symbol}</div>
              <div className="sub">{e.symbol} · {e.sector} · {e.quarter}</div>
              {e.report_date && <div className="sub">Reported: {e.report_date}</div>}
            </div>
            {pending
              ? <div style={{fontFamily:'var(--mono)',fontSize:9,padding:'3px 8px',borderRadius:3,background:'rgba(0,150,255,.1)',color:'var(--blue)'}}>PENDING</div>
              : <div style={{fontFamily:'var(--mono)',fontSize:9,padding:'3px 8px',borderRadius:3,
                  background:beat?'rgba(0,229,192,.1)':'rgba(255,62,90,.1)',
                  color:beat?'var(--green)':'var(--red)'}}>
                  {beat?`BEAT +${fmt(Math.abs(e.beat_pct))}%`:`MISS -${fmt(Math.abs(e.beat_pct))}%`}
                </div>}
          </div>
          {!pending && e.eps_actual != null && (
            <div className="row" style={{marginBottom:4}}>
              <div className="sub">
                EPS: <span style={{color:beat?'var(--green)':'var(--red)',fontFamily:'var(--mono)'}}>
                  ${fmt(e.eps_actual)}
                </span> vs est ${fmt(e.eps_est)}
              </div>
            </div>
          )}
          {e.guidance && e.guidance!=='none' && (
            <div style={{fontFamily:'var(--mono)',fontSize:9,marginTop:2,
              color:e.guidance==='raised'?'var(--green)':e.guidance==='lowered'?'var(--red)':'var(--t3)'}}>
              GUIDANCE: {e.guidance.toUpperCase()}
            </div>
          )}
          {e.key_note && <div style={{marginTop:5,fontSize:10,color:'var(--t3)',lineHeight:1.4}}>{e.key_note}</div>}
          <div style={{marginTop:4,fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)'}}>
            📡 {e.source || 'Finnhub / SEC EDGAR'}
          </div>
        </div>
      );
    })}
  </div>

  {/* GOVERNMENT REPORTS */}
  <div className="sec">
    <div className="sec-hdr"><div className="sec-ttl">⬡ GOVERNMENT REPORTS</div></div>
    {d.gov_reports?.map((r,i) => (
      <div className="sbar" key={i}>
        <div className={`sdot ${r.revision==='up'?'rd':r.revision==='down'?'gr':'bl'}`}/>
        <div className="stxt">
          <div style={{fontWeight:600,fontSize:12}}>{r.report}</div>
          <div style={{fontSize:11,color:'var(--t2)',marginTop:2}}>
            {r.value} <span style={{color:'var(--t3)',fontSize:10}}>prior {r.prior}</span>
            {r.revision !== 'none' && (
              <span style={{
                marginLeft:6,fontFamily:'var(--mono)',fontSize:9,
                color:r.revision==='up'?'var(--red)':'var(--green)'
              }}>
                {r.revision==='up'?'▲ REVISED UP':'▼ REVISED DOWN'}
              </span>
            )}
          </div>
          {r.note && <div style={{fontSize:10,color:'var(--t3)',marginTop:1}}>{r.note}</div>}
          {r.source && <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginTop:2}}>📡 {r.source}</div>}
        </div>
      </div>
    ))}
  </div>

  {/* UPCOMING EARNINGS */}
  {d.upcoming_earnings?.length > 0 && (
    <div className="sec">
      <div className="sec-hdr"><div className="sec-ttl">⬡ UPCOMING EARNINGS</div></div>
      {d.upcoming_earnings.map((u,i) => (
        <div className="sbar" key={i}>
          <div className="sdot bl"/>
          <div className="stxt">
            <div style={{fontWeight:600}}>{u.company} <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>({u.symbol})</span></div>
            {u.eps_est && <div style={{fontSize:10,color:'var(--t3)'}}>EPS est: ${u.eps_est?.toFixed(2)}</div>}
          </div>
          <div className="smeta">{u.date}</div>
        </div>
      ))}
    </div>
  )}
</div>
```

);
}

function IntelTab({ d, onRefresh, loading }) {
const [question, setQuestion] = useState(’’);
const [answer, setAnswer]     = useState(null);
const [asking, setAsking]     = useState(false);

const askQuestion = async () => {
if (!question.trim()) return;
setAsking(true); setAnswer(null);
try { const res = await fetchIntel(question); setAnswer(res); } catch(e){ console.error(e); }
setAsking(false);
};

const regime    = d?.regime;
const regStyle  = REGIME_STYLE[regime] || REGIME_STYLE.reflation;
const probCls   = p => p===‘high’?‘dn’:p===‘medium’?‘warn’:‘neu’;
const posColor  = p => p===‘bullish’?‘up’:p===‘bearish’?‘dn’:‘neu’;
const levelDot  = l => l===‘critical’?‘rd’:l===‘warning’?‘am’:‘bl’;

return (
<div className="page">
<div className="sec">
<div className="sec-hdr"><div className="sec-ttl">⬡ ASK A MACRO QUESTION</div></div>
<div className="qbox">
<input className=“qinput” placeholder=“e.g. What does weak auction demand signal for the dollar?” value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key===‘Enter’&&askQuestion()}/>
<button className="qbtn" onClick={askQuestion} disabled={asking||!question.trim()}>{asking?’…’:‘ASK’}</button>
</div>
{asking && <Loading text="ANALYZING..."/>}
{answer && (
<div className="ans-box">
<div className="thesis-ttl">◈ RESPONSE</div>
<div className="ans-txt">{answer.answer}</div>
{answer.key_points?.length > 0 && (
<>
<div className="div"/>
{answer.key_points.map((p,i) => (
<div className=“sbar” key={i} style={{background:‘transparent’,border:‘none’,padding:‘4px 0’}}>
<div className="sdot bl"/><div className="stxt" style={{fontSize:11}}>{p}</div>
</div>
))}
</>
)}
{answer.data_sources?.length > 0 && (
<div style={{marginTop:8,fontFamily:‘var(–mono)’,fontSize:9,color:‘var(–t3)’}}>
Verify at: {answer.data_sources.join(’ · ’)}
</div>
)}
</div>
)}
</div>

```
  {loading && !d && <Loading text="GENERATING BRIEFING..."/>}

  {d && (
    <>
      {regime && (
        <div className="sec">
          <div className="sec-hdr">
            <div className="sec-ttl">⬡ MARKET REGIME</div>
            <button className="refbtn" onClick={onRefresh} disabled={loading}>{loading?'...':'⟳ REFRESH'}</button>
          </div>
          <div style={{marginBottom:8}}>
            <span className="regime-pill" style={{background:regStyle.bg,color:regStyle.color}}>{regStyle.label}</span>
            <span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginLeft:8}}>Confidence: {d.regime_confidence?.toUpperCase()}</span>
          </div>
          {d.thesis && (
            <div className="thesis-box">
              <div className="thesis-ttl">◈ CURRENT THESIS</div>
              <div className="thesis-txt">{d.thesis}</div>
            </div>
          )}
        </div>
      )}

      {d.positioning && (
        <div className="sec">
          <div className="sec-hdr"><div className="sec-ttl">⬡ POSITIONING SIGNALS</div></div>
          <div className="pos-grid">
            {[['USD',d.positioning.usd],['GOLD',d.positioning.gold],['LONG BONDS',d.positioning.long_bonds],['EQUITIES',d.positioning.equities]].map(([a,p])=>(
              <div className="pos-box" key={a}>
                <div className="pos-asset">{a}</div>
                <div className={`pos-signal ${posColor(p)}`}>{p?.toUpperCase()||'—'}</div>
              </div>
            ))}
          </div>
          {d.positioning.rationale && <div style={{fontSize:11,color:'var(--t3)',lineHeight:1.5,marginTop:6}}>{d.positioning.rationale}</div>}
        </div>
      )}

      {d.alerts?.length > 0 && (
        <div className="sec">
          <div className="sec-hdr"><div className="sec-ttl">⬡ ACTIVE SIGNALS</div></div>
          {d.alerts.map((a,i) => {
            const isStr = typeof a === 'string';
            const title = isStr ? a : a.title;
            const detail = isStr ? null : a.detail;
            const level = isStr ? 'watch' : (a.level || 'watch');
            const category = isStr ? null : a.category;
            const borderColor = level==='critical'?'var(--red)':level==='warning'?'var(--amber)':'var(--blue)';
            const titleColor = level==='critical'?'var(--red)':level==='warning'?'var(--amber)':'var(--acc2)';
            return (
              <div className="intel-card" style={{borderLeft:`3px solid ${borderColor}`}} key={i}>
                <div className="intel-ttl" style={{color:titleColor}}>{title}</div>
                {detail && <div className="intel-det">{detail}</div>}
                <div className="intel-meta">
                  {category && <span className="intel-badge" style={{background:'rgba(0,150,255,.1)',color:'var(--blue)'}}>{category}</span>}
                  <span className="intel-badge" style={{background:level==='critical'?'rgba(255,62,90,.1)':'rgba(255,208,96,.1)',color:level==='critical'?'var(--red)':'var(--amber)'}}>{level.toUpperCase()}</span>
                </div>
                {!isStr && a.verify_at && <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginTop:6}}>Verify: {a.verify_at}</div>}
              </div>
            );
          })}
        </div>
      )}

      {d.key_risks?.length > 0 && (
        <div className="sec">
          <div className="sec-hdr"><div className="sec-ttl">⬡ KEY RISKS</div></div>
          {d.key_risks.map((r,i) => {
            const isStr = typeof r === 'string';
            const risk = isStr ? r : r.risk;
            const prob = isStr ? null : r.probability;
            const horizon = isStr ? null : r.horizon;
            return (
              <div className="sbar" key={i}>
                <div className="sdot rd"/>
                <div className="stxt">
                  <div>{risk}</div>
                  {(prob || horizon) && (
                    <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',marginTop:2}}>
                      {prob && <>Prob: <span className={probCls(prob)}>{prob}</span></>}
                      {prob && horizon && ' · '}
                      {horizon}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {d.key_watches?.length > 0 && (
        <div className="sec">
          <div className="sec-hdr"><div className="sec-ttl">⬡ WATCH LIST</div></div>
          {d.key_watches.map((w,i) => {
            const isStr = typeof w === 'string';
            const indicator = isStr ? w : w.indicator;
            const why = isStr ? null : w.why;
            const threshold = isStr ? null : w.threshold;
            const source = isStr ? null : w.source;
            return (
              <div className="sbar" key={i}>
                <div className="sdot am"/>
                <div className="stxt">
                  <div style={{fontWeight:600}}>{indicator}</div>
                  {why && <div style={{fontSize:10,color:'var(--t3)',marginTop:1}}>{why}</div>}
                  {threshold && <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--amber)',marginTop:2}}>Threshold: {threshold}</div>}
                  {source && <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginTop:1}}>📡 {source}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {d.dalio_lens && (
        <div className="sec">
          <div className="sec-hdr"><div className="sec-ttl">⬡ BIG CYCLE LENS</div></div>
          <div className="thesis-box" style={{borderLeftColor:'var(--gold)'}}>
            <div className="thesis-ttl" style={{color:'var(--gold)'}}>◈ RAY DALIO FRAMEWORK</div>
            <div className="thesis-txt">{d.dalio_lens}</div>
          </div>
        </div>
      )}
    </>
  )}
</div>
```

);
}

/* ─── NAV ───────────────────────────────────────────────────────────────── */
const ICONS = {
daily:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
auctions:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
weekly:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
monthly:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
quarterly: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
intel:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
};

const TABS = [
{ id:‘daily’,     label:‘DAILY’,    loader:fetchDaily     },
{ id:‘auctions’,  label:‘AUCTIONS’, loader:fetchAuctions  },
{ id:‘weekly’,    label:‘WEEKLY’,   loader:fetchWeekly    },
{ id:‘monthly’,   label:‘MONTHLY’,  loader:fetchMonthly   },
{ id:‘quarterly’, label:‘QTR’,      loader:fetchQuarterly },
{ id:‘intel’,     label:‘INTEL’,    loader:fetchIntel     },
];

/* ─── APP ───────────────────────────────────────────────────────────────── */
export default function App() {
const [active, setActive]   = useState(‘daily’);
const [data, setData]       = useState({});
const [loading, setLoading] = useState({});
const refreshed             = useRef({});

const load = useCallback(async (tabId) => {
const tab = TABS.find(t => t.id===tabId);
if (!tab) return;
setLoading(p=>({…p,[tabId]:true}));
try {
const res = await tab.loader();
setData(p=>({…p,[tabId]:res}));
refreshed.current[tabId] = new Date();
} catch(e){ console.error(‘Load error:’,e); }
setLoading(p=>({…p,[tabId]:false}));
}, []);

useEffect(() => { if (!refreshed.current[active]) load(active); }, [active, load]);

const now     = new Date();
const dateStr = now.toLocaleDateString(‘en-US’,{weekday:‘short’,month:‘short’,day:‘numeric’});
const timeStr = now.toLocaleTimeString(‘en-US’,{hour:‘2-digit’,minute:‘2-digit’});

return (
<>
<style>{G}</style>
<div className="app">
<div className="hdr">
<div className="hdr-top">
<div className="logo">MACRO<em>WATCH</em></div>
<div className="hdr-right">
<div className="hdr-date">{dateStr}<br/>{timeStr}</div>
<button className=“refbtn” onClick={()=>load(active)} disabled={loading[active]}>
{loading[active]?<span style={{animation:‘pulse 1s infinite’}}>⟳</span>:‘⟳’}
</button>
</div>
</div>
<div className="tabs">
{TABS.map(t=>(
<button key={t.id} className={`tab ${active===t.id?'on':''}`} onClick={()=>setActive(t.id)}>{t.label}</button>
))}
</div>
</div>

```
    {active==='daily'     && <DailyTab     d={data.daily}/>}
    {active==='auctions'  && <AuctionsTab  d={data.auctions}/>}
    {active==='weekly'    && <WeeklyTab    d={data.weekly}/>}
    {active==='monthly'   && <MonthlyTab   d={data.monthly}/>}
    {active==='quarterly' && <QuarterlyTab d={data.quarterly}/>}
    {active==='intel'     && <IntelTab     d={data.intel} loading={loading.intel} onRefresh={()=>load('intel')}/>}

    <div className="bnav">
      {TABS.map(t=>(
        <button key={t.id} className={`nbtn ${active===t.id?'on':''}`} onClick={()=>setActive(t.id)}>
          {ICONS[t.id]}{t.label}
        </button>
      ))}
    </div>
  </div>
</>
```

);
}
