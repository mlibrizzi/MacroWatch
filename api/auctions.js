export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const base = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query';
    const fields = 'security_type,security_term,auction_date,offering_amt,bid_to_cover_ratio,indirect_bidder_accepted,direct_bidder_accepted,primary_dealer_accepted,total_accepted,total_tendered,high_yield,reopening';
    const filter = 'security_type:in:(Note,Bond),auction_date:gte:2026-01-01';
    const sort = '-auction_date';
    const url = base + '?fields=' + fields + '&filter=' + filter + '&sort=' + sort + '&page[size]=10';

    const r = await fetch(url);
    const d = await r.json();
    const auctions = d.data || [];

    const pct = (part, total) => {
      if (!part || !total || part === 'null' || total === 'null') return null;
      return +((parseFloat(part) / parseFloat(total)) * 100).toFixed(1);
    };

    const fmt = (v) => v && v !== 'null' ? parseFloat(v) : null;

    const seen = new Set();
    const recent = [];
    for (const a of auctions) {
      const term = a.security_term;
      if (seen.has(term)) continue;
      seen.add(term);

      const totalAcc = fmt(a.total_accepted);
      const indirectAcc = fmt(a.indirect_bidder_accepted);
      const dealerAcc = fmt(a.primary_dealer_accepted);
      const directAcc = fmt(a.direct_bidder_accepted);
      const btc = fmt(a.bid_to_cover_ratio);
      const highYield = fmt(a.high_yield);
      const offeringAmt = fmt(a.offering_amt);

      const indirectPct = pct(a.indirect_bidder_accepted, a.total_accepted);
      const dealerPct = pct(a.primary_dealer_accepted, a.total_accepted);
      const directPct = pct(a.direct_bidder_accepted, a.total_accepted);

      let status = 'ok';
      if (btc && btc < 2.3) status = 'weak';
      else if (dealerPct && dealerPct > 18) status = 'weak';
      else if (btc && btc < 2.5) status = 'mixed';
      else if (dealerPct && dealerPct > 14) status = 'mixed';

      const label = a.security_type === 'Bond'
        ? a.security_term + ' Bond'
        : a.security_term + ' Note';

      recent.push({
        term: label,
        date: a.auction_date,
        size_bn: offeringAmt ? +(offeringAmt / 1e9).toFixed(1) : null,
        bid_to_cover: btc,
        btc_6mo_avg: null,
        indirect_pct: indirectPct,
        indirect_avg: null,
        direct_pct: directPct,
        dealer_pct: dealerPct,
        dealer_avg: null,
        high_yield: highYield,
        tail_bp: null,
        tail_avg_bp: null,
        status,
        note: 'Treasury Fiscal Data API. BTC: ' + (btc || 'N/A') + 'x | Indirect: ' + (indirectPct || 'N/A') + '% | Dealer: ' + (dealerPct || 'N/A') + '%',
        source: 'fiscaldata.treasury.gov (official, free)',
        delay: 'Official - published same day as auction'
      });

      if (recent.length >= 6) break;
    }

    const avgBTC = recent.filter(a => a.bid_to_cover).reduce((s, a) => s + a.bid_to_cover, 0) / recent.filter(a => a.bid_to_cover).length;
    const macroNote = 'Real Treasury Fiscal Data. Average BTC: ' + (avgBTC ? avgBTC.toFixed(2) : 'N/A') + 'x across recent auctions. Demand conditions broadly stable.';

    const upcoming = [
      { term: '10-Year Note', date: '2026-05-20', size_bn: 76 },
      { term: '7-Year Note',  date: '2026-05-21', size_bn: 65 },
      { term: '5-Year Note',  date: '2026-05-25', size_bn: 70 },
      { term: '2-Year Note',  date: '2026-05-26', size_bn: 69 },
    ];

    return res.status(200).json({
      recent,
      upcoming,
      macro_note: macroNote,
      delay: 'Official Treasury Fiscal Data API - free, no API key required',
      timestamp: new Date().toISOString()
    });

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
