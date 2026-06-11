// ── Tab 1: Market Overview ────────────────────────────────────────────
function renderOverview() {
  const { rspReturn1d, rspReturn1w, rspReturn1m, rspReturnYtd, rspReturn12m,
          recentLowDate, spyFromLow, rspFromLow, chartDates, chartSpy, chartRsp,
          spyReturn1d, spyReturn1m, spyReturnYtd, spyReturn12m } = _data;

  const hasRsp = rspReturnYtd != null && spyReturnYtd != null;
  const rspVsSpyYtd     = hasRsp ? rspReturnYtd - spyReturnYtd : null;
  const rspVsSpy12m     = hasRsp ? rspReturn12m  - spyReturn12m  : null;
  const rspVsSpyFromLow = (rspFromLow != null && spyFromLow != null) ? rspFromLow - spyFromLow : null;

  const ewRows = hasRsp ? [
    {lbl:'1-day',                        rsp:rspReturn1d,  spy:spyReturn1d,  diff:rspReturn1d  - spyReturn1d},
    {lbl:'1-month',                      rsp:rspReturn1m,  spy:spyReturn1m,  diff:rspReturn1m  - spyReturn1m},
    {lbl:'YTD',                          rsp:rspReturnYtd, spy:spyReturnYtd, diff:rspVsSpyYtd},
    {lbl:'12-month',                     rsp:rspReturn12m, spy:spyReturn12m, diff:rspVsSpy12m},
    {lbl:`From low (${recentLowDate})`,  rsp:rspFromLow,   spy:spyFromLow,   diff:rspVsSpyFromLow, highlight:true},
  ] : null;

  document.getElementById('root').innerHTML = tabHdr(
    'Is the rally broad or carried by a few?',
    'Tracks how many S&P 500 stocks are above key moving averages and hitting 52-week highs/lows. SPY vs RSP shows whether the average stock is keeping up with the cap-weighted index.'
  ) +
  buildInternalsPanel() +
  buildRspVsSpyPanel(hasRsp, ewRows, chartDates);

  initInternalsCharts();
  initBreadthChart(chartDates, chartSpy, chartRsp, recentLowDate);
}

function buildInternalsPanel() {
  if (!_breadthHistory || !_breadthHistory.length) return '';
  const allSectors = [...new Set(
    _breadthHistory.flatMap(e => e.sectors ? Object.keys(e.sectors) : [])
  )].sort();
  const allIndustries = internalsFilterSector === 'all'
    ? []
    : [...new Set(
        _breadthHistory.flatMap(e => {
          if (!e.industries) return [];
          return Object.entries(e.industries)
            .filter(([, v]) => v.sector === internalsFilterSector)
            .map(([k]) => k);
        })
      )].sort();

  const secOpts = allSectors.map(s =>
    `<option value="${s}"${s === internalsFilterSector ? ' selected' : ''}>${s}</option>`
  ).join('');
  const indOpts = allIndustries.map(i =>
    `<option value="${i}"${i === internalsFilterIndustry ? ' selected' : ''}>${i}</option>`
  ).join('');

  const showIndFilter = internalsFilterSector !== 'all';

  return `
    <div id="internals-panel" class="part-box" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <div>
          <div class="part-title" style="margin-bottom:2px">Market Internals — Historical Breadth</div>
          <div class="part-sub">% of S&P 500 stocks above key moving averages, and new 52-week high/low counts over time</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <select class="ctrl-input" style="width:170px" onchange="onInternalsSectorChange(this.value)">
            <option value="all"${internalsFilterSector === 'all' ? ' selected' : ''}>All Sectors</option>
            ${secOpts}
          </select>
          ${showIndFilter ? `
          <select class="ctrl-input" style="width:220px" onchange="onInternalsIndustryChange(this.value)">
            <option value="all"${internalsFilterIndustry === 'all' ? ' selected' : ''}>All Industries</option>
            ${indOpts}
          </select>` : ''}
        </div>
      </div>
      <div class="internals-grid">
        <div class="internals-chart-box">
          <div class="internals-chart-title">MA Participation — Stock Count</div>
          <div style="height:200px;position:relative"><canvas id="c-int-ma-count"></canvas></div>
        </div>
        <div class="internals-chart-box">
          <div class="internals-chart-title">MA Participation — % by Market Cap</div>
          <div style="height:200px;position:relative"><canvas id="c-int-ma-mcap"></canvas></div>
        </div>
        <div class="internals-chart-box">
          <div class="internals-chart-title">New 52-Week Highs vs Lows — Count</div>
          <div style="height:200px;position:relative"><canvas id="c-int-hl"></canvas></div>
        </div>
        <div class="internals-chart-box">
          <div class="internals-chart-title">New 52-Week Highs vs Lows — % by Market Cap</div>
          <div style="height:200px;position:relative"><canvas id="c-int-hl-mcap"></canvas></div>
        </div>
      </div>
    </div>
  `;
}

function buildRspVsSpyPanel(hasRsp, ewRows, chartDates) {
  return `
    <div class="rsp-spy-grid" style="display:grid;grid-template-columns:300px 1fr;gap:14px;margin-bottom:20px;align-items:start">
      <div class="part-box" style="margin-bottom:0">
        <div class="part-title">SPY vs RSP — Cap-weight vs Equal-weight</div>
        <div class="part-sub">Spread = RSP minus SPY</div>
        ${hasRsp ? `
          <div class="part-row" style="border-bottom:0.5px solid var(--border);padding-bottom:6px;margin-bottom:4px">
            <span class="part-lbl" style="font-size:12px;color:var(--text)">Period</span>
            <span class="part-spx" style="font-size:12px;color:var(--text)">SPY</span>
            <span class="part-rsp" style="font-size:12px;color:var(--text)">RSP</span>
            <span class="part-diff" style="font-size:12px;color:var(--text)">Spread</span>
          </div>
          ${ewRows.map(r=>`
            <div class="part-row" style="${r.highlight?'border-top:0.5px solid var(--border2);margin-top:4px;padding-top:8px;':''}">
              <span class="part-lbl" style="font-size:12px;color:var(--text)">${r.lbl}</span>
              <span class="part-spx" style="font-size:12px;color:${r.spy>=0?C.green:C.red}">${pp(r.spy,true)}%</span>
              <span class="part-rsp" style="font-size:12px;color:${r.rsp>=0?C.green:C.red}">${pp(r.rsp,true)}%</span>
              <span class="part-diff" style="font-size:12px;color:${r.diff>=0?C.green:C.red}">${pp(r.diff,true)}%</span>
            </div>`).join('')}
        ` : `
          <div style="padding:20px 0;text-align:center">
            <div style="font-size:28px;color:var(--text3);margin-bottom:8px">—</div>
            <div style="font-size:12px;color:var(--text2)">RSP / SPY data not in current snapshot</div>
            <div style="font-size:11px;color:var(--text3);margin-top:6px">Re-run <code style="background:var(--bg3);padding:1px 6px;border-radius:4px">python fetch_breadth.py</code> to load</div>
          </div>`}
      </div>
      <div class="sector-panel" style="margin-bottom:0">
        <div class="ptitle">SPY vs RSP — YTD % return (Jan 1 to today)</div>
        <div style="position:relative;height:240px">
          ${chartDates ? `<canvas id="c3" role="img" aria-label="SPY vs RSP performance chart"></canvas>`
                       : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:13px">No chart data — re-run fetch_breadth.py</div>`}
        </div>
      </div>
    </div>`;
}

function refreshInternals() {
  const el = document.getElementById('internals-panel');
  if (el) {
    el.outerHTML = buildInternalsPanel();
    initInternalsCharts();
  } else {
    renderOverview();
  }
}
function onInternalsSectorChange(val) {
  internalsFilterSector = val;
  internalsFilterIndustry = 'all';
  refreshInternals();
}
function onInternalsIndustryChange(val) {
  internalsFilterIndustry = val;
  refreshInternals();
}
