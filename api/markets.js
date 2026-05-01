export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VITE_FINNHUB_API_KEY;
  const base   = 'https://finnhub.io/api/v1';

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

  // Finnhub forex quote — symbol format is OANDA:EUR_USD
  const fxQuote = async (oandaSymbol, displaySymbol) => {
    const r = await fetch(`${base}/quote?symbol=OANDA:${oandaSymbol}&token=${apiKey}`);
    const d = await r.json();
    return {
      symbol:    displaySymbol,
      price:     d.c  || null,
      change:    d.d  != null ? +d.d.toFixed(4)  : null,
      changePct: d.dp != null ? +d.dp.toFixed(2) : null,
      high:      d.h  || null,
      low:       d.l  || null,
      delay:     'Real-time (Finnhub Forex)'
    };
  };

  try {
    const [
      aapl, msft, nvda, googl, amzn, meta, tsla,
      spy, qqq, dia,
      wti, brent,
      uvxy,
      eurusd, jpyusd, gbpusd,
      dxyQuote
    ] = await Promise.all([
      // Mag 7
      quote('AAPL'), quote('MSFT'), quote('NVDA'), quote('GOOGL'),
      quote('AMZN'), quote('META'), quote('TSLA'),
      // Index ETFs
      quote('SPY'), quote('QQQ'), quote('DIA'),
      // Oil ETFs
      quote('USO'), quote('BNO'),
      // Volatility
      quote('UVXY'),
      // FX via OANDA format
      fxQuote('EUR_USD', 'EUR/USD'),
      fxQuote('USD_JPY', 'USD/JPY'),
      fxQuote('GBP_USD', 'GBP/USD'),
      // DXY via ETF
      quote('UUP'),
    ]);

    // Scale ETF prices to approximate index levels
    // SPY ≈ SPX/10, QQQ ≈ NDX/40, DIA ≈ DJI/100
    const spxPrice  = spy.price  ? +(spy.price  * 10).toFixed(0)  : null;
    const ndxPrice  = qqq.price  ? +(qqq.price  * 28).toFixed(0)  : null;
    const djiPrice  = dia.price  ? +(dia.price  * 100).toFixed(0) : null;
    const spxChange = spy.change ? +(spy.change * 10).toFixed(0)  : null;
    const ndxChange = qqq.change ? +(qqq.change * 28).toFixed(0)  : null;
    const djiChange = dia.change ? +(dia.change * 100).toFixed(0) : null;

    return res.status(200).json({
      mag7: [
        { ...aapl,  name: 'Apple'    },
        { ...msft,  name: 'Microsoft'},
        { ...nvda,  name: 'Nvidia'   },
        { ...googl, name: 'Alphabet' },
        { ...amzn,  name: 'Amazon'   },
        { ...meta,  name: 'Meta'     },
        { ...tsla,  name: 'Tesla'    },
      ],
      indices: [
        { symbol: 'SPX', name: 'S&P 500',    price: spxPrice, change: spxChange, changePct: spy.changePct, delay: 'Real-time via SPY ETF (Finnhub)' },
        { symbol: 'NDX', name: 'Nasdaq 100', price: ndxPrice, change: ndxChange, changePct: qqq.changePct, delay: 'Real-time via QQQ ETF (Finnhub)' },
        { symbol: 'DJI', name: 'Dow Jones',  price: djiPrice, change: djiChange, changePct: dia.changePct, delay: 'Real-time via DIA ETF (Finnhub)' },
      ],
      oil: {
        wti:   { ...wti,   name: 'WTI Crude',   delay: 'Real-time via USO ETF (Finnhub)' },
        brent: { ...brent, name: 'Brent Crude',  delay: 'Real-time via BNO ETF (Finnhub)' },
      },
      fx: {
        eurusd: eurusd,
        jpyusd: jpyusd,
        gbpusd: gbpusd,
        dxy:    { 
          symbol: 'DXY', 
          name: 'Dollar Index (UUP ETF)',
          price: dxyQuote.price,
          change: dxyQuote.change,
          changePct: dxyQuote.changePct,
          delay: 'Real-time via UUP ETF (Finnhub)'
        },
      },
      vix: { 
        ...uvxy, 
        symbol: 'VIX', 
        name: 'Volatility (UVXY)',
        delay: 'Real-time via UVXY ETF (Finnhub)'
      },
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