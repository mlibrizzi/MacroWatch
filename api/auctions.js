// Treasury auction results and upcoming schedule.
// Source: Treasury FiscalData auctions_query (official, free, no key).
//
// Notes on the data:
// - security_term is the remaining term on the auction date, so reopenings read
//   like "9-Year 10-Month". original_security_term ("10-Year") is the benchmark
//   tenor and is what we group by.
// - TIPS (inflation_index_security = Yes) and FRNs (floating_rate = Yes) are
//   reported as Notes/Bonds. They price on real yield / discount margin, so they
//   are kept out of the nominal coupon comparison and its thresholds.
// - A true auction tail is high yield minus the when-issued yield at 1pm ET,
//   which this API does not provide. high_yield - avg_med_yield is reported as
//   the "high-median spread": a measure of bid dispersion, not a tail.

const BASE = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query';
const FIELDS = [
  'security_type', 'security_term', 'original_security_term', 'auction_date',
  'offering_amt', 'bid_to_cover_ratio', 'indirect_bidder_accepted', 'direct_bidder_accepted',
  'primary_dealer_accepted', 'comp_accepted', 'total_accepted', 'high_yield', 'avg_med_yield',
  'reopening', 'inflation_index_security', 'floating_rate', 'announcemt_date',
].join(',');

const LOOKBACK_DAYS = 180;   // window for same-tenor history
const HISTORY_PER_TENOR = 6; // auctions kept per tenor for trend lines

const NOMINAL_TENORS = ['2-Year', '3-Year', '5-Year', '7-Year', '10-Year', '20-Year', '30-Year'];
const MATURITY_ORDER = ['30-Year', '20-Year', '10-Year', '7-Year', '5-Year', '3-Year', '2-Year'];

const AUCTION_PATTERNS = {
  '4-Week': 'Weekly every Thu', '8-Week': 'Weekly every Thu',
  '13-Week': 'Weekly every Mon', '17-Week': 'Weekly every Wed', '26-Week': 'Weekly every Mon',
  '52-Week': 'Every 4 weeks', '6-Week': 'Weekly every Tue', '2-Year': 'Monthly, late month', '3-Year': 'Monthly, 2nd week',
  '5-Year': 'Monthly, late month', '7-Year': 'Monthly, late month', '10-Year': 'Monthly, 2nd week',
  '20-Year': 'Monthly, 3rd week', '30-Year': 'Monthly, 2nd week',
};

const num = v => (v != null && v !== 'null' && v !== '') ? parseFloat(v) : null;
const pct = (part, total) => {
  const p = num(part), t = num(total);
  return (p != null && t) ? +((p / t) * 100).toFixed(1) : null;
};
const round = (v, d) => (v == null ? null : +v.toFixed(d));
const mean = arr => {
  const xs = arr.filter(v => v != null);
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
};

function kindOf(a) {
  if (a.inflation_index_security === 'Yes') return 'TIPS';
  if (a.floating_rate === 'Yes') return 'FRN';
  if (a.security_type === 'Bill') return 'Bill';
  return 'Nominal';
}

function labelOf(a) {
  const tenor = a.original_security_term || a.security_term;
  const kind = kindOf(a);
  const base = kind === 'TIPS' ? `${tenor} TIPS`
    : kind === 'FRN' ? `${tenor} FRN`
    : kind === 'Bill' ? `${a.security_term} Bill`
    : `${tenor} ${a.security_type}`;
  // Bills are routinely reopenings of an earlier issue; the tag only matters for coupons.
  return (a.reopening === 'Yes' && kind !== 'Bill') ? `${base} (reopening)` : base;
}

// Demand verdict from bid-to-cover and dealer take-down (same rules as before,
// minus the high-median spread, which is not a demand measure).
function statusOf({ bid_to_cover: btc, dealer_pct: dlr }) {
  if (btc == null) return 'pending';
  if (btc < 2.3 || (dlr != null && dlr > 18)) return 'weak';
  if (btc < 2.5 || (dlr != null && dlr > 14)) return 'mixed';
  return 'ok';
}

function toResult(a) {
  // Bidder shares are of competitive awards (indirect + direct + dealer = comp_accepted),
  // the convention used in Treasury's own results press releases.
  const denom = num(a.comp_accepted) ? a.comp_accepted : a.total_accepted;
  const highYield = num(a.high_yield);
  const medYield = num(a.avg_med_yield);
  return {
    term: labelOf(a),
    tenor: a.original_security_term || a.security_term,
    kind: kindOf(a),
    reopening: a.reopening === 'Yes',
    date: a.auction_date,
    size_bn: num(a.offering_amt) != null ? +(num(a.offering_amt) / 1e9).toFixed(1) : null,
    bid_to_cover: num(a.bid_to_cover_ratio),
    indirect_pct: pct(a.indirect_bidder_accepted, denom),
    direct_pct: pct(a.direct_bidder_accepted, denom),
    dealer_pct: pct(a.primary_dealer_accepted, denom),
    high_yield: highYield,
    avg_med_yield: medYield,
    spread_bp: (highYield != null && medYield != null) ? round((highYield - medYield) * 100, 1) : null,
    tail_bp: null, // true tail needs when-issued data (pending vendor access)
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const today = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString().split('T')[0];
    const filter = `security_type:in:(Note,Bond,Bill),auction_date:gte:${from}`;
    const url = `${BASE}?fields=${FIELDS}&filter=${filter}&sort=-auction_date&page%5Bsize%5D=1000`;

    const r = await fetch(url);
    if (!r.ok) throw new Error(`Treasury API ${r.status}`);
    const rows = (await r.json()).data || [];

    const completed = rows.filter(a => num(a.bid_to_cover_ratio) != null);
    const results = completed.map(toResult);

    // Same-tenor history for nominal coupons (rows are newest first).
    const byTenor = {};
    for (const a of results) {
      if (a.kind !== 'Nominal' || !NOMINAL_TENORS.includes(a.tenor)) continue;
      (byTenor[a.tenor] ||= []).push(a);
    }

    const recent = [];
    const history = {};
    for (const tenor of MATURITY_ORDER) {
      const list = (byTenor[tenor] || []).slice(0, HISTORY_PER_TENOR);
      if (!list.length) continue;
      const [latest, ...prior] = list;
      const last = prior[0];

      const btcAvg = mean(prior.map(p => p.bid_to_cover));
      const indAvg = mean(prior.map(p => p.indirect_pct));
      const dlrAvg = mean(prior.map(p => p.dealer_pct));
      const sprAvg = mean(prior.map(p => p.spread_bp));

      const yieldChgBp = (last && latest.high_yield != null && last.high_yield != null)
        ? round((latest.high_yield - last.high_yield) * 100, 0) : null;

      const parts = [];
      if (last) parts.push(`vs prior ${tenor} (${last.date}): BTC ${last.bid_to_cover?.toFixed(2)}x, indirect ${last.indirect_pct?.toFixed(1)}%`);
      if (yieldChgBp != null) parts.push(`high yield ${yieldChgBp >= 0 ? '+' : ''}${yieldChgBp}bp`);

      recent.push({
        ...latest,
        btc_6mo_avg: round(btcAvg, 2),
        indirect_avg: round(indAvg, 1),
        dealer_avg: round(dlrAvg, 1),
        spread_avg_bp: round(sprAvg, 1),
        yield_chg_bp: yieldChgBp,
        prior_count: prior.length,
        status: statusOf(latest),
        note: parts.join(' · '),
        source: 'fiscaldata.treasury.gov (official, free)',
      });

      history[tenor] = list.slice().reverse().map(p => ({
        date: p.date,
        high_yield: p.high_yield,
        bid_to_cover: p.bid_to_cover,
        indirect_pct: p.indirect_pct,
        dealer_pct: p.dealer_pct,
      }));
    }

    // Latest TIPS and FRN results, shown separately and not scored on nominal thresholds.
    const other = [];
    for (const kind of ['TIPS', 'FRN']) {
      const seen = new Set();
      for (const a of results) {
        if (a.kind !== kind || seen.has(a.tenor)) continue;
        seen.add(a.tenor);
        other.push({ ...a, status: 'n/a' });
      }
    }
    other.sort((a, b) => b.date.localeCompare(a.date));

    const upcoming = rows
      .filter(a => num(a.bid_to_cover_ratio) == null && a.auction_date >= today)
      .sort((a, b) => a.auction_date.localeCompare(b.auction_date))
      .slice(0, 12)
      .map(a => {
        const term = labelOf(a);
        // Bills are scheduled by the term being sold now; coupons by their benchmark tenor.
        const tenor = a.security_type === 'Bill' ? a.security_term : (a.original_security_term || a.security_term);
        const key = Object.keys(AUCTION_PATTERNS).find(k => tenor === k);
        return {
          term,
          date: a.auction_date,
          size_bn: num(a.offering_amt) != null ? +(num(a.offering_amt) / 1e9).toFixed(1) : null,
          announced: a.announcemt_date || null,
          pattern: key ? AUCTION_PATTERNS[key] : 'See treasurydirect.gov',
        };
      });

    // Cards: newest first. Charts re-sort by maturity on the client.
    recent.sort((a, b) => b.date.localeCompare(a.date));

    const dates = recent.map(a => a.date).sort();
    const range = dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null;
    const avgBTC = mean(recent.map(a => a.bid_to_cover));

    const macroNote = `Latest auction of each nominal coupon tenor${range ? ` (${range.from} to ${range.to})` : ''}. ` +
      `Average bid-to-cover ${avgBTC != null ? avgBTC.toFixed(2) + 'x' : 'N/A'}. ` +
      `Averages compare each tenor with its prior ${HISTORY_PER_TENOR - 1} auctions. TIPS and FRNs are listed separately.`;

    return res.status(200).json({
      recent,
      history,
      other,
      upcoming,
      range,
      macro_note: macroNote,
      delay: 'Official Treasury FiscalData API: published same day as each auction',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
