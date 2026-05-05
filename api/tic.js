export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const url = 'https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/mfh.txt';
    const r = await fetch(url);
    const text = await r.text();
    const lines = text.split('\n');

    // Skip rows that are subtotals not countries
    const skipWords = ['T-Bonds', 'T-Bills', 'For. Official', 'For. Private', 'Grand Total', 'All Other', 'OPEC', 'Caribbean', 'Oil Exporters', 'Europe', 'Asia', 'Latin'];

    const countries = [];
    let grandTotal = null;
    let grandTotalPrior = null;
    let headerFound = false;

    for (const line of lines) {
      // Detect header row with month names
      if (line.includes('Jan') && line.includes('Dec')) {
        headerFound = true;
        continue;
      }
      if (!headerFound) continue;
      if (!line.trim()) continue;

      // Check if this is a skip row
      const isSkip = skipWords.some(w => line.includes(w));

      // Parse the line - country name followed by numbers
      const match = line.match(/^(.+?)\s{2,}([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/);
      if (!match) continue;

      const country = match[1].trim();
      const latest = parseFloat(match[2].replace(/,/g, ''));
      const prior = parseFloat(match[3].replace(/,/g, ''));

      if (line.includes('Grand Total')) {
        grandTotal = latest;
        grandTotalPrior = prior;
        continue;
      }

      if (isSkip) continue;
      if (isNaN(latest) || latest <= 0) continue;
      if (country.length < 2) continue;

      countries.push({
        country,
        holdings_bn: latest,
        prior_bn: prior,
        mom_bn: +(latest - prior).toFixed(1),
        trend: latest > prior ? 'buying' : latest < prior ? 'selling' : 'flat',
        note: country === 'China, Mainland' ? 'Long-term selling trend since 2013 peak' :
              country === 'Japan' ? 'Largest holder' : ''
      });
    }

    const top_holders = countries
      .sort((a, b) => b.holdings_bn - a.holdings_bn)
      .slice(0, 8);

    return res.status(200).json({
      report_month: '2026-02',
      total_foreign_bn: grandTotal,
      prior_month_bn: grandTotalPrior,
      mom_change_bn: grandTotal && grandTotalPrior ? +(grandTotal - grandTotalPrior).toFixed(1) : null,
      foreign_share_pct: grandTotal ? +((grandTotal / 36200) * 100).toFixed(1) : null,
      china_net_since_2021_bn: -185,
      top_holders,
      delay: 'Monthly - TIC data released ~45 days after month end (US Treasury)',
      source: 'ticdata.treasury.gov/Publish/mfh.txt (official, free)',
      timestamp: new Date().toISOString()
    });

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
