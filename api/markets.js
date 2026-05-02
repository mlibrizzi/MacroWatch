export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VITE_FINNHUB_API_KEY;
  const base   = 'https://finnhub.io/api/v1';

  const quote = async (symbol) => {
    try {
      const r = await fetch(`${base}/quote?symbol=${symbol}&token=${apiKey}`);
      const d = await r.json();
      if (!d.c) return null;
      return {
        symbol,
        price:     d.c,
        change:    d.d  != null ? +d.d.toFixed(2)  : null,
        changePct: d.dp != null ? +d.dp.toFixed(2) : null,
        high:      d.h  || null,
        low:       d.l  || null,
        prevClose: d.pc || null,
        delay:     'Real-time (Finnhub)'
      };
    } catch(e) { return null; }
  };

  // FX via open.er-api.com — free, updates every few hours
  const fxRates = async () => {
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/USD');
      const d = await r.json();
      return d.rates || {};
    } catch(e) { return {}; }
  };

  // VIX directly from CBOE via Finnhub index quote
  const vixQuote = async () => {
    try {
      // Try direct VIX index
      const r = await fetch(`${base}/quote?symbol=^VIX&token=${apiKey}`);
      const d = await r.json();
      if (d.c && d.c > 0) {
        return {
          symbol: 'VIX', price: d.c,
          change: d.d != null ? +d.d.toFixed(2) : null,
          changePct: d.dp != null ? +d.dp.toFixed(2) : null,
          high: d.h, low: d.l,
          source: 'CBOE VIX (Finnhub)',
          delay: 'Real-time (Finnhub / CBOE)'
        };
      }
      // Fallback: VIX3M as alternative
      const r2 = await fetch(`${base}/quote?symbol=VIX3M&token=${apiKey}`);
      const d2 = await r2.json();
      if (d2.c && d2.c > 0) {
        return {
          symbol: 'VIX', price: d2.c,
          change: d2.d != null ? +d2.d.toFixed(2) : null,
          changePct: d2.dp != null ? +d2.dp.toFixed(2) : null,
          source: 'VIX3M proxy (Finnhub)',
          delay: 'Real-time (Finnhub / CBOE)'
        };
      }
      return null;
    } catch(e) { return null; }
  };

  try {
    const [
      aapl, msft, nvda, googl, amzn, meta, tsla,
      spy, qqq, dia,
      uso, bno,
      uup,
      vix,
      rates
    ] = await Promise.all([
      quote('AAPL'), quote('MSFT'), quote('NVDA'), quote('GOOGL'),
      quote('AMZN'), quote('META'), quote('TSLA'),
      quote('SPY'),  quote('QQQ'),  quote('DIA'),
      quote('USO'),  quote('BNO'),
      quote('UUP'),
      vixQuote(),
      fxRates()
    ]);

    const eur = rates.EUR ? +(1 / rates.EUR).toFixed(4) : null;
    const jpy = rates.JPY ? +rates.JPY.toFixed(2)       : null;
    const gbp = rates.GBP ? +(1 / rates.GBP).toFixed(4) : null;

    // Scale ETF to index approximation
    const idx = (etf, mult, sym, name) => !etf ? null : {
      symbol: sym, name,
      price:     etf.price ? +(etf.price * mult).toFixed(0)  : null,
      change:    etf.change ? +(etf.change * mult).toFixed(0) : null,
      changePct: etf.changePct,
      delay:     `Real-time via ${etf.symbol}×${mult} ETF (Finnhub)`
    };

    return res.status(200).json({
      mag7: [
        aapl  ? { ...aapl,  name: 'Apple'     } : null,
        msft  ? { ...msft,  name: 'Microsoft' } : null,
        nvda  ? { ...nvda,  name: 'Nvidia'    } : null,
        googl ? { ...googl, name: 'Alphabet'  } : null,
        amzn  ? { ...amzn,  name: 'Amazon'    } : null,
        meta  ? { ...meta,  name: 'Meta'      } : null,
        tsla  ? { ...tsla,  name: 'Tesla'     } : null,
      ].filter(Boolean),
      indices: [
        idx(spy, 10,  'SPX', 'S&P 500'),
        idx(qqq, 28,  'NDX', 'Nasdaq 100'),
        idx(dia, 100, 'DJI', 'Dow Jones'),
      ].filter(Boolean),
      oil: {
        wti:   uso ? { ...uso, name: 'WTI Crude (USO ETF)',   delay: 'Real-time via USO ETF (Finnhub)' } : null,
        brent: bno ? { ...bno, name: 'Brent Crude (BNO ETF)', delay: 'Real-time via BNO ETF (Finnhub)' } : null,
      },
      fx: {
        eurusd: { symbol: 'EUR/USD', price: eur, change: null, changePct: null, delay: 'Updated every few hours (open.er-api.com)' },
        jpyusd: { symbol: 'USD/JPY', price: jpy, change: null, changePct: null, delay: 'Updated every few hours (open.er-api.com)' },
        gbpusd: { symbol: 'GBP/USD', price: gbp, change: null, changePct: null, delay: 'Updated every few hours (open.er-api.com)' },
        dxy:    uup ? { symbol: 'DXY', name: 'Dollar Index (UUP ETF proxy)', price: uup.price, change: uup.change, changePct: uup.changePct, delay: 'Real-time via UUP ETF (Finnhub) — see FRED for broad index' } : null,
      },
      // VIX — direct CBOE index, not ETF proxy
      vix: vix || null,
      delay: 'Real-time (Finnhub)',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message,
      mag7: [], indices: [],
      oil: { wti: null, brent: null },
      fx: { eurusd: null, jpyusd: null, dxy: null },
      vix: null,
      timestamp: new Date().toISOString()
    });
  }
}
