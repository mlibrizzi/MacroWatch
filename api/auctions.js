export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // TreasuryDirect public API - no key required
    // Get recent auctioned securities for notes and bonds
    const [notesRes, bondsRes, upcomingRes] = await Promise.all([
      fetch('https://www.treasurydirect.gov/TA_WS/securities/auctioned?format=json&type=Note&dateFieldName=auctionDate&startDate=2026-01-01&endDate=2026-12-31&pagesize=20'),
      fetch('https://www.treasurydirect.gov/TA_WS/securities/auctioned?format=json&type=Bond&dateFieldName=auctionDate&startDate=2026-01-01&endDate=2026-12-31&pagesize=10'),
      fetch('https://www.treasurydirect.gov/TA_WS/securities/announced?format=json&dateFieldName=auctionDate&startDate=2026-05-01&endDate=2026-06-30&pagesize=20'),
    ]);

    const notes    = await notesRes.json();
    const bonds    = await bondsRes.json();
    const upcoming = await upcomingRes.json();

    // Combine and sort by auction date descending
    const allAuctioned = [...(Array.isArray(notes) ? notes : []), ...(Array.isArray(bonds) ? bonds : [])]
      .filter(s => s.auctionDate && s.bidToCoverRatio)
      .sort((a, b) => new Date(b.auctionDate) - new Date(a.auctionDate));

    // Format a security into our dashboard format
    const formatSecurity = (s) => {
      const btc      = parseFloat(s.bidToCoverRatio) || null;
      const indirect = parseFloat(s.percentAllottedToIndirectBidders) || null;
      const direct   = parseFloat(s.percentAllottedToDirectBidders)   || null;
      const dealer   = parseFloat(s.percentAllottedToPrimaryDealers)  || null;
      const yield_   = parseFloat(s.highYield || s.highRate)          || null;
      const size     = parseFloat(s.offeringAmount) / 1e9             || null;
      const tail     = null; // Not available directly from TreasuryDirect API

      // Determine status based on real metrics
      let status = 'ok';
      if (btc && btc < 2.3) status = 'weak';
      else if (dealer && dealer > 18) status = 'weak';
      else if (btc && btc < 2.5) status = 'mixed';
      else if (dealer && dealer > 14) status = 'mixed';

      const term = s.securityTerm || '';
      let termLabel = s.securityType === 'Bond' ? `${term} Bond` : `${term} Note`;

      return {
        term:         termLabel,
        cusip:        s.cusip,
        date:         s.auctionDate?.split('T')[0],
        size_bn:      size ? +size.toFixed(1) : null,
        bid_to_cover: btc,
        btc_6mo_avg:  null, // Would need historical calc
        indirect_pct: indirect,
        indirect_avg: null,
        direct_pct:   direct,
        dealer_pct:   dealer,
        dealer_avg:   null,
        high_yield:   yield_,
        tail_bp:      tail,
        tail_avg_bp:  null,
        status,
        note: 'Official TreasuryDirect data. BTC: '+(btc?btc.toFixed(2):'N/A')+'x | Indirect: '+(indirect?indirect.toFixed(1):'N/A')+'% | Dealer: '+(dealer?dealer.toFixed(1):'N/A')+'%',
        source: 'TreasuryDirect.gov (official)',
        delay: 'Official — published same day as auction'
      };
    };

    // Get the 5 most recent unique maturities
    const seen = new Set();
    const recent = [];
    for (const s of allAuctioned) {
      const term = s.securityTerm;
      if (!seen.has(term) && recent.length < 6) {
        seen.add(term);
        recent.push(formatSecurity(s));
      }
    }

    // Format upcoming auctions
    const upcomingFormatted = (Array.isArray(upcoming) ? upcoming : [])
      .filter(s => s.auctionDate && (s.securityType === 'Note' || s.securityType === 'Bond'))
      .slice(0, 6)
      .map(s => ({
        term:   `${s.securityTerm} ${s.securityType}`,
        date:   s.auctionDate?.split('T')[0],
        size_bn: s.offeringAmount ? +(parseFloat(s.offeringAmount) / 1e9).toFixed(1) : null,
        source: 'TreasuryDirect.gov'
      }));

    // Generate macro note based on real data
    const weakCount  = recent.filter(a => a.status === 'weak').length;
    const avgBTC     = recent.filter(a => a.bid_to_cover).reduce((s, a) => s + a.bid_to_cover, 0) / recent.filter(a => a.bid_to_cover).length;
    const avgDealer  = recent.filter(a => a.dealer_pct).reduce((s, a) => s + a.dealer_pct, 0) / recent.filter(a => a.dealer_pct).length;

    let macroNote = `Real TreasuryDirect data. Average BTC: ${avgBTC?.toFixed(2)}x across recent auctions. `;
    if (weakCount >= 2) macroNote += `${weakCount} of ${recent.length} recent auctions show weak demand signals.`;
    else if (avgDealer > 18) macroNote += 'Dealer absorption elevated — watch for demand deterioration.';
    else macroNote += 'Demand conditions broadly stable.';

    return res.status(200).json({
      recent,
      upcoming: upcomingFormatted,
      macro_note: macroNote,
      delay: '✅ Official TreasuryDirect.gov data — no API key required — published same day as auction',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message,
      note: 'TreasuryDirect API unavailable — verify at treasurydirect.gov/auctions/results'
    });
  }
}