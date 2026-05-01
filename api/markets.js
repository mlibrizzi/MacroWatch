export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,MSFT,NVDA,GOOGL,AMZN,META,TSLA,%5EGSPC,%5ENDX,%5EDJI,CL%3DF,BZ%3DF,EURUSD%3DX,JPY%3DX,DX-Y.NYB,%5EVIX`;

    const response = await fetch(quoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com'
      }
    });

    if (!response.ok) throw new Error(`Yahoo Finance ${response.status}`);

    const data = await response.json();
    const quotes = data.quoteResponse?.result || [];

    const find = (sym) => quotes.find(q => q.symbol === sym);

    const fmt = (q) => !q ? null : {
      symbol: q.symbol,
      name: q.shortName || q.symbol,
      price: q.regularMarketPrice,
      change: +(q.regularMarketChange?.toFixed(2) || 0),
      changePct: +(q.regularMarketChangePercent?.toFixed(2) || 0),
      high: q.regularMarketDayHigh,
      low: q.regularMarketDayLow,
      delay: '15-min delayed (Yahoo Finance)'
    };

    return res.status(200).json({
      mag7: ['AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA'].map(s => fmt(find(s))).filter(Boolean),
      indices: [
        find('^GSPC') ? { ...fmt(find('^GSPC')), symbol: 'SPX', name: 'S&P 500' } : null,
        find('^NDX')  ? { ...fmt(find('^NDX')),  symbol: 'NDX', name: 'Nasdaq 100' } : null,
        find('^DJI')  ? { ...fmt(find('^DJI')),  symbol: 'DJI', name: 'Dow Jones' } : null,
      ].filter(Boolean),
      oil: {
        wti:   fmt(find('CL=F')),
        brent: fmt(find('BZ=F')),
      },
      fx: {
        eurusd: fmt(find('EURUSD=X')),
        jpyusd: fmt(find('JPY=X')),
        dxy:    fmt(find('DX-Y.NYB')),
      },
      vix: fmt(find('^VIX')),
      delay: '15-min delayed (Yahoo Finance)',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return res.status(200).json({
      error: err.message,
      mag7: [], indices: [],
      oil: { wti: null, brent: null },
      fx: { eurusd: null, jpyusd: null, dxy: null },
      vix: null,
      delay: '15-min delayed (Yahoo Finance)',
      timestamp: new Date().toISOString()
    });
  }
}