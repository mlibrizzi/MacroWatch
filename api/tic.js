export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const url = 'https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.txt';
    const r = await fetch(url);
    const text = await r.text();
    const lines = text.split('\n').filter(l => l.trim());

    // Find header row with dates
    let headerRow = null;
    let dataRows = [];
    for (const line of lines) {
      if (line.startsWith('Country\t') || line.startsWith('Country	')) {
        headerRow = line.split('\t');
        continue;
      }
      if (headerRow && line.trim() && !line.startsWith('Table') && !line.startsWith('Holdings') && !line.startsWith('Billions') && !line.startsWith('Link')) {
        dataRows.push(line);
      }
    }

    if (!headerRow) return res.status(500).json({ error: 'Could not find header row' });

    // Latest month is column index 1 (after Country)
    const latestMonth = headerRow[1];
    const priorMonth = headerRow[2];

    const skipCountries = ['Grand Total', 'All Other', 'Oil Exporters', 'Caribbean', 'OPEC'];

    const countries = [];
    let grandTotal = null;
    let grandTotalPrior = null;

    for (const row of dataRows) {
      const cols = row.split('\t');
      if (cols.length < 3) continue;
      const country = cols[0].trim();
      const latest = parseFloat(cols[1]);
      const prior = parseFloat(cols[2]);
      if (isNaN(latest)) continue;

      if (country === 'Grand Total') {
        grandTotal = latest;
        grandTotalPrior = isNaN(prior) ? null : prior;
        continue;
      }

      if (skipCountries.some(s => country.includes(s))) continue;

      countries.push({
        country,
        holdings_bn: latest,
        mom_bn: isNaN(prior) ? null : +(latest - prior).toFixed(1),
        trend: isNaN(prior) ? 'unknown' : latest > prior ? 'buying' : latest < prior ? 'selling' : 'flat',
        note: country === 'China, Mainland' ? 'Long-term selling trend since 2013 peak' :
              country === 'Japan' ? 'Largest holder' :
              country === 'Cayman Islands' || country === 'Luxembourg' ? 'Financial center custody hub' : ''
      });
    }

    const top_holders = countries
      .sort((a, b) => b.holdings_bn - a.holdings_bn)
      .slice(0, 8);

    return res.status(200).json({
      report_month: latestMonth,
      total_foreign_bn: grandTotal,
      prior_month_bn: grandTotalPrior,
      mom_change_bn: grandTotal && grandTotalPrior ? +(grandTotal - grandTotalPrior).toFixed(1) : null,
      foreign_share_pct: grandTotal ? +((grandTotal / 36200) * 100).toFixed(1) : null,
      china_net_since_2021_bn: -185,
      top_holders,
      delay: 'Monthly - TIC data released ~45 days after month end (US Treasury)',
      source: 'ticdata.treasury.gov slt_table5.txt (official, free)',
      timestamp: new Date().toISOString()
    });

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
