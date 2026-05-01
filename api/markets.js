export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VITE_FINNHUB_API_KEY;
  const fredKey = process.env.VITE_FRED_API_KEY;
  const base = 'https://finnhub.io/api/v1';

  const quote = async (symbol) => {
    const r = await fetch(`${base}/quote?symbol=${symbol}&token=${apiKey}`);
    const d = await r.json();
    return {
      symbol,
      price:     d.c  || 0,
      change:    d.d  != null ? +d.d.toFixed(2)  : null,
      changePct: d.dp != null ? +d.dp.toFixed(2) : null,
      high:      d.h  || null,
      low:       d.l  || null,
      prevClose: d.pc || null,
      delay:     'Real-time (Finnhub)'
    };
  };

  // Use exchangerate-api for FX (free, no key needed)
  const fxRate = async () => {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    const d = await r.json();
    return d.rates || {};
  };

  try {
    const [
      aapl, msft, nvda, googl, amzn, meta, tsla,
      spy, qqq, dia,
      uso, bno,
      uvxy, uup,
      rates
    ] = await Promise.all([
      quote('AAPL'), quote('MSFT'), quote('NVDA'), quote('GOOGL'),
      quote('AMZN'), quote('META'), quote('TSLA'),
      quote('SPY'),  quote('QQQ'),  quote('DIA'),
      quote('USO'),  quote('BNO'),
      quote('UVXY'), quote('UUP'),
      fxRate()
    ]);

    const eur = rates.EUR ? +(1 / rates.EUR).toFixed(4) : null;
    const jpy = rates.JPY ? +rates.JPY.toFixed(2)       : null;
    const gbp = rates.GBP ? +(1 / rates.GBP).toFixed(4) : null;

    return res.status(200).json({
      mag7: [
        { ...aapl,  name: 'Apple'     },
        { ...msft,  name: 'Microsoft' },
        { ...nvda,  name: 'Nvidia'    },
        { ...googl, name: 'Alphabet'  },
        { ...amzn,  name: 'Amazon'    },
        { ...meta,  name: 'Meta'      },
        { ...tsla,  name: 'Tesla'     },
      ],
      indices: [
        { symbol: 'SPX', name: 'S&P 500',    price: spy.price ? +(spy.price * 10).toFixed(0)  : null, change: spy.change ? +(spy.change * 10).toFixed(0) : null, changePct: spy.changePct, delay: 'Real-time via SPY×10 (Finnhub)' },
        { symbol: 'NDX', name: 'Nasdaq 100', price: qqq.price ? +(qqq.price * 28).toFixed(0)  : null, change: qqq.change ? +(qqq.change * 28).toFixed(0) : null, changePct: qqq.changePct, delay: 'Real-time via QQQ×28 (Finnhub)' },
        { symbol: 'DJI', name: 'Dow Jones',  price: dia.price ? +(dia.price * 100).toFixed(0) : null, change: dia.change ? +(dia.change * 100).toFixed(0) : null, changePct: dia.changePct, delay: 'Real-time via DIA×100 (Finnhub)' },
      ],
      oil: {
        wti:   { ...uso, name: 'WTI Crude (USO)',   delay: 'Real-time via USO ETF (Finnhub)' },
        brent: { ...bno, name: 'Brent Crude (BNO)', delay: 'Real-time via BNO ETF (Finnhub)' },
      },
      fx: {
        eurusd: { symbol: 'EUR/USD', price: eur, change: null, changePct: null, delay: 'Hourly (open.er-api.com)' },
        jpyusd: { symbol: 'USD/JPY', price: jpy, change: null, changePct: null, delay: 'Hourly (open.er-api.com)' },
        gbpusd: { symbol: 'GBP/USD', price: gbp, change: null, changePct: null, delay: 'Hourly (open.er-api.com)' },
        dxy:    { symbol: 'DXY', name: 'Dollar Index (UUP)', price: uup.price, change: uup.change, changePct: uup.changePct, delay: 'Real-time via UUP ETF (Finnhub)' },
      },
      vix: { ...uvxy, symbol: 'VIX', name: 'Volatility (UVXY)', delay: 'Real-time via UVXY ETF (Finnhub)' },
      delay: 'Real-time (Finnhub) + Hourly FX (open.er-api.com)',
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