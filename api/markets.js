export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Symbols: Mag7, indices, oil, FX, VIX
  const symbols = [
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA',  // Mag 7
    '^GSPC', '^NDX', '^DJI',                                      // Indices
    'CL=F', 'BZ=F',                                               // WTI, Brent
    'EURUSD=X', 'JPY=X', 'DX-Y.NYB',                             // FX, DXY
    '^VIX'                                                         // VIX
  ].join(',');

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=symbol,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketDayHigh,regularMarketDayLow,regularMarketPreviousClose`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Yahoo Finance error: ${response.status}`);

    const data = await response.json();
    const quotes = data.quoteResponse?.result || [];

    const find = (sym) => quotes.find(q => q.symbol === sym);
    const fmt = (q) => q ? {
      symbol: q.symbol,
      name: q.shortName,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePct: q.regularMarketChangePercent,
      high: q.regularMarketDayHigh,
      low: q.regularMarketDayLow,
      prevClose: q.regularMarketPreviousClose,
      delay: '15-min delayed (Yahoo Finance)'
    } : null;

    return res.status(200).json({
      mag7: ['AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA'].map(s => fmt(find(s))).filter(Boolean),
      indices: [
        { ...fmt(find('^GSPC')), symbol: 'SPX', name: 'S&P 500' },
        { ...fmt(find('^NDX')),  symbol: 'NDX', name: 'Nasdaq 100' },
        { ...fmt(find('^DJI')),  symbol: 'DJI', name: 'Dow Jones' },
      ].filter(q => q.price),
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
    return res.status(500).json({ error: err.message });
  }
}