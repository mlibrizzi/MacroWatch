export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const url = 'https://ticdata.treasury.gov/Publish/mfh.txt';
    const r = await fetch(url);
    const text = await r.text();
    const lines = text.split('\n');

    // Find the header line with dates
    let headerLine = '';
    let dataLines = [];
    let foundHeader = false;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.includes('Jan') && l.includes('Dec') && l.includes('Nov')) {
        headerLine = l;
        foundHeader = true;
        continue;
      }
      if (foundHeader && l.trim() && !l.includes('---') && !l.includes('HOLDINGS') && !l.includes('Country') && !l.includes('(in billions')) {
        dataLines.push(l);
      }
    }

    // Parse country data - each line has country name then values
    const countries = [];
    for (const line of dataLines) {
      if (!line.trim()) continue;
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length >= 3) {
        const country = parts[0].trim();
        const latest = parseFloat(parts[1].replace(/,/g, ''));
        const prior = parseFloat(parts[2].replace(/,/g, ''));
        if (!isNaN(latest) && latest > 0 && country && country !== 'Grand Total') {
          countries.push({
            country,
            holdings_bn: latest,
            prior_bn: prior,
            mom_bn: !isNaN(prior) ? +(latest - prior).toFixed(1) : null,
            trend: !isNaN(prior) ? (latest > prior ? 'buying' : latest < prior ? 'selling' : 'flat') : 'unknown'
          });
        }
      }
    }

    // Find Grand Total
    const totalLine = dataLines.find(l => l.includes('Grand Total'));
    let total_bn = null, prior_bn = null;
    if (totalLine) {
      const parts = totalLine.trim().split(/\s{2,}/);
      if (parts.length >= 3) {
        total_bn = parseFloat(parts[1].replace(/,/g, ''));
        prior_bn = parseFloat(parts[2].replace(/,/g, ''));
      }
    }

    const top_holders = countries
      .sort((a, b) => b.holdings_bn - a.holdings_bn)
      .slice(0, 8)
      .map(c => ({
        country: c.country,
        holdings_bn: c.holdings_bn,
        mom_bn: c.mom_bn,
        trend: c.trend,
        note: c.country === 'China, Mainland' ? 'Long-term selling trend since 2013 peak' :
              c.country === 'Japan' ? 'Largest holder, intervening to support yen' : ''
      }));

    return res.status(200).json({
      report_month: '2026-02',
      total_foreign_bn: total_bn,
      prior_month_bn: prior_bn,
      mom_change_bn: total_bn && prior_bn ? +(total_bn - prior_bn).toFixed(1) : null,
      foreign_share_pct: total_bn ? +((total_bn / 36200) * 100).toFixed(1) : null,
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
