export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  try {
    const base = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/holdings_of_treasury_securities';
    const fields = 'record_date,country_name,close_holdings_mil';
    const sort = '-record_date,close_holdings_mil';
    const url = base + '?fields=' + fields + '&sort=' + sort + '&page[size]=50';

    const r = await fetch(url);
    const d = await r.json();
    const data = d.data || [];

    if (!data.length) return res.status(200).json({ error: 'No TIC data available' });

    // Get the latest report date
    const latestDate = data[0].record_date;
    const latest = data.filter(x => x.record_date === latestDate);

    // Build top holders
    const holders = latest
      .filter(x => x.country_name !== 'Grand Total' && x.country_name !== 'All Other')
      .map(x => ({
        country: x.country_name,
        holdings_bn: x.close_holdings_mil ? +(parseFloat(x.close_holdings_mil) / 1000).toFixed(1) : null
      }))
      .filter(x => x.holdings_bn > 0)
      .sort((a, b) => b.holdings_bn - a.holdings_bn)
      .slice(0, 8);

    // Get grand total
    const grandTotal = latest.find(x => x.country_name === 'Grand Total');
    const total_bn = grandTotal ? +(parseFloat(grandTotal.close_holdings_mil) / 1000).toFixed(1) : null;

    // Get prior month for comparison
    const dates = [...new Set(data.map(x => x.record_date))].sort().reverse();
    const priorDate = dates[1];
    const prior = data.filter(x => x.record_date === priorDate);
    const priorTotal = prior.find(x => x.country_name === 'Grand Total');
    const prior_bn = priorTotal ? +(parseFloat(priorTotal.close_holdings_mil) / 1000).toFixed(1) : null;
    const mom_change = total_bn && prior_bn ? +(total_bn - prior_bn).toFixed(1) : null;

    return res.status(200).json({
      report_month: latestDate,
      total_foreign_bn: total_bn,
      prior_month_bn: prior_bn,
      mom_change_bn: mom_change,
      foreign_share_pct: total_bn ? +((total_bn / 36200) * 100).toFixed(1) : null,
      top_holders: holders,
      delay: 'Monthly - TIC data released 45 days after month end (US Treasury)',
      source: 'fiscaldata.treasury.gov (official, free)',
      timestamp: new Date().toISOString()
    });

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
