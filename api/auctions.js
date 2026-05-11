export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const base = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query';
    const fields = 'security_type,security_term,auction_date,offering_amt,bid_to_cover_ratio,indirect_bidder_accepted,direct_bidder_accepted,primary_dealer_accepted,total_accepted,total_tendered,high_yield,avg_med_yield,low_yield,reopening,announcemt_date';
    const filter = 'security_type:in:(Note,Bond),auction_date:gte:2026-01-01';
    const sort = '-auction_date';
    const url = `${base}?fields=${fields}&filter=${filter}&sort=${sort}&page%5Bsize%5D=30`;

    const r = await fetch(url);
    const d = await r.json();
    const auctions = d.data || [];

    const pct = (part, total) => {
      if (!part || !total || part === 'null' || total === 'null') return null;
      return +((parseFloat(part) / parseFloat(total)) * 100).toFixed(1);
    };

    const fmt = (v) => (v && v !== 'null') ? parseFloat(v) : null;

    const today = new Date().toISOString().split('T')[0];

    const completedAuctions = auctions.filter(a =>
      a.bid_to_cover_ratio && a.bid_to_cover_ratio !== 'null'
    );

    const upcomingAuctions = auctions.filter(a =>
      (!a.bid_to_cover_ratio || a.bid_to_cover_ratio === 'null') &&
      a.auction_date >= today
    );

    const termMap = new Map();
    for (const a of completedAuctions) {
      const term = a.security_term;
      const existing = termMap.get(term);
      const offeringAmt = fmt(a.offering_amt) || 0;
      const existingAmt = existing ? (fmt(existing.offering_amt) || 0) : 0;
      if (!existing || offeringAmt > existingAmt) {
        termMap.set(term, a);
      }
    }

    const recent = [];
    for (const [, a] of termMap) {
      const totalAcc = fmt(a.total_accepted);
      const indirectAcc = fmt(a.indirect_bidder_accepted);
      const dealerAcc = fmt(a.primary_dealer_accepted);
      const directAcc = fmt(a.direct_bidder_accepted);
      const btc = fmt(a.bid_to_cover_ratio);
      const highYield = fmt(a.high_yield);
      const avgMedYield = fmt(a.avg_med_yield);
      const offeringAmt = fmt(a.offering_amt);

      const indirectPct = pct(a.indirect_bidder_accepted, a.total_accepted);
      const dealerPct = pct(a.primary_dealer_accepted, a.total_accepted);
      const directPct = pct(a.direct_bidder_accepted, a.total_accepted);

      const tailBp = (highYield && avgMedYield)
        ? +((highYield - avgMedYield) * 100).toFixed(1)
        : null;

      let status = btc ? 'ok' : 'pending';
      if (btc && btc < 2.3) status = 'weak';
      else if (dealerPct && dealerPct > 18) status = 'weak';
      else if (btc && btc < 2.5) status = 'mixed';
      else if (dealerPct && dealerPct > 14) status = 'mixed';
      else if (tailBp && tailBp > 3.0) status = 'mixed';
      else if (tailBp && tailBp > 5.0) status = 'weak';

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
        avg_med_yield: avgMedYield,
        tail_bp: tailBp,
        tail_avg_bp: null,
        status,
        note: `BTC: ${btc || 'N/A'}x | Indirect: ${indirectPct || 'N/A'}% | Dealer: ${dealerPct || 'N/A'}% | Tail: ${tailBp !== null ? tailBp + 'bp' : 'N/A'}`,
        source: 'fiscaldata.treasury.gov (official, free)',
        delay: 'Official - published same day as auction'
      });

      if (recent.length >= 6) break;
    }

    const getMaturityRank = (term) => {
      if (term.includes('30')) return 1;
      if (term.includes('20')) return 2;
      if (term.includes('10')) return 3;
      if (term.includes('7')) return 4;
      if (term.includes('5')) return 5;
      if (term.includes('3')) return 6;
      if (term.includes('2')) return 7;
      if (term.includes('1')) return 8;
      return 9;
    };
    recent.sort((a, b) => getMaturityRank(a.term) - getMaturityRank(b.term));

    const upcoming = upcomingAuctions
      .sort((a, b) => a.auction_date.localeCompare(b.auction_date))
      .slice(0, 6)
      .map(a => {
        const offeringAmt = fmt(a.offering_amt);
        const label = a.security_type === 'Bond'
          ? a.security_term + ' Bond'
          : a.security_term + ' Note';
        return {
          term: label,
          date: a.auction_date,
          size_bn: offeringAmt ? +(offeringAmt / 1e9).toFixed(1) : null,
          announced: a.announcemt_date || null
        };
      });

    const avgBTC = recent
      .filter(a => a.bid_to_cover)
      .reduce((s, a, _, arr) => s + a.bid_to_cover / arr.length, 0);

    const macroNote = `Real Treasury Fiscal Data. Average BTC: ${avgBTC ? avgBTC.toFixed(2) : 'N/A'}x across recent auctions. Tail calculated as high yield minus median yield.`;

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
