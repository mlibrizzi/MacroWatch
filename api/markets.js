export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VITE_FINNHUB_API_KEY;
  const base   = 'https://finnhub.io/api/v1';

  const quote = async (symbol) => {
    const r = await fetch(`${base}/quote?symbol=${symbol}&token=${apiKey}`);
    const d = await r.json();
    // Finnhub returns: c=current, d=change, dp=changePct, h=high, l=low, o=open, pc=prevClose
    return {
      symbol,
      price:     d.c,
      change:    d.d  != null ? +d.d.toFixed(2)  : null,
      changePct: d.dp != null ? +d.dp.toFixed(2) : null,
      high:      d.h,
      low:       d.l,
      prevClose: d.pc,
      delay:     'Real-time (Finnhub)'
    };
  };

  try {
    // Fetch all symbols in parallel
    const [
      aapl, msft, nvda, googl, amzn, meta, tsla,  // Mag 7
      spx, ndx, dji,                                // Indices
      wti, brent,                                   // Oil
      eurusd, jpyusd, dxy,                          // FX
      vix                                           // Volatility
    ] = await Promise.all([
      quote('AAPL'), quote('MSFT'), quote('NVDA'), quote('GOOGL'),
      quote('AMZN'), quote('META'), quote('TSLA'),
      quote('SPY'),  quote('QQQ'),  quote('DIA'),   // ETF proxies for indices
      quote('USO'),  quote('BNO'),                  // Oil ETF proxies
      quote('EURUSD'), quote('USDJPY'), quote('UUP'), // FX
      quote('UVXY')                                 // VIX proxy
    ]);

    // Also get forex via Finnhub forex endpoint for accuracy
    const [eurRes, jpyRes] = await Promise.all([
      fetch(`${base}/forex/rates?base=USD&token=${apiKey}`),
      fetch(`${base}/forex/rates?base=USD&token=${apiKey}`)
    ]);
    const forexData = await eurRes.json();
    const rates = forexData.quote || {};

    return res.status(200).json({
      mag7: [
        { ...aapl,  symbol: 'AAPL', name: 'Apple'     },
        { ...msft,  symbol: 'MSFT', name: 'Microsoft'  },
        { ...nvda,  symbol: 'NVDA', name: 'Nvidia'     },
        { ...googl, symbol: 'GOOGL',name: 'Alphabet'   },
        { ...amzn,  symbol: 'AMZN', name: 'Amazon'     },
        { ...meta,  symbol: 'META', name: 'Meta'       },
        { ...tsla,  symbol: 'TSLA', name: 'Tesla'      },
      ],
      indices: [
        { ...spx, symbol: 'SPX', name: 'S&P 500 (SPY)',    delay: 'Real-time (Finnhub)' },
        { ...ndx, symbol: 'NDX', name: 'Nasdaq 100 (QQQ)', delay: 'Real-time (Finnhub)' },
        { ...dji, symbol: 'DJI', name: 'Dow Jones (DIA)',  delay: 'Real-time (Finnhub)' },
      ],
      oil: {
        wti:   { ...wti,   name: 'WTI Crude (USO)',   delay: 'Real-time (Finnhub)' },
        brent: { ...brent, name: 'Brent Crude (BNO)', delay: 'Real-time (Finnhub)' },
      },
      fx: {
        eurusd: rates.EUR ? {
          symbol: 'EUR/USD', price: +(1/rates.EUR).toFixed(4),
          change: null, changePct: null, delay: 'Real-time (Finnhub Forex)'
        } : { ...eurusd, symbol: 'EUR/USD' },
        jpyusd: rates.JPY ? {
          symbol: 'USD/JPY', price: +rates.JPY.toFixed(2),
          change: null, changePct: null, delay: 'Real-time (Finnhub Forex)'
        } : { ...jpyusd, symbol: 'USD/JPY' },
        dxy: { ...dxy, symbol: 'DXY', name: 'Dollar Index (UUP)', delay: 'Real-time (Finnhub)' },
      },
      vix: { ...vix, symbol: 'VIX', name: 'Volatility (UVXY)', delay: 'Real-time (Finnhub)' },
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