// ── SPY vs RSP breadth chart ──────────────────────────────────────────
function initBreadthChart(chartDates, chartSpy, chartRsp, recentLowDate) {
  if (!chartDates || !chartSpy || !document.getElementById('c3')) return;
  if (chart3) { chart3.destroy(); chart3 = null; }
  const lowIdx = recentLowDate ? chartDates.indexOf(recentLowDate) : chartSpy.indexOf(Math.min(...chartSpy));
  chart3 = new Chart(document.getElementById('c3'), {
    type: 'line',
    data: {
      labels: chartDates,
      datasets: [
        { label: 'SPY (cap-weight)',   data: chartSpy,  borderColor: C.blue,  backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: 0.3 },
        { label: 'RSP (equal-weight)', data: chartRsp,  borderColor: C.amber, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: 0.3 },
        { label: `Low (${recentLowDate})`,
          data: chartSpy.map((v,i) => i === lowIdx ? v : null),
          borderColor: C.red, backgroundColor: C.red,
          pointRadius: chartSpy.map((_,i) => i === lowIdx ? 6 : 0),
          pointHoverRadius: 8, showLine: false, type: 'scatter' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, labels: { color: '#8a92a2', font: { size: 11 }, boxWidth: 20 } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label.startsWith('Low') ? null : `${ctx.dataset.label}: ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(1)}%` } }
      },
      scales: {
        x: { ticks: { color: '#555e6e', font: { size: 10 }, maxTicksLimit: 8, callback: (_, i) => chartDates[i] ? chartDates[i].slice(5) : '' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#555e6e', font: { size: 11 }, callback: v => (v >= 0 ? '+' : '') + v + '%' }, grid: { color: 'rgba(255,255,255,0.06)' } }
      }
    }
  });
}

// ── Market Internals — Historical Breadth Charts ─────────────────────
function initInternalsCharts() {
  const data = getInternalsData();
  if (!data || !data.length) return;

  const labels = data.map(e => e.date);
  const pct = (n, t) => t > 0 ? +((n / t) * 100).toFixed(1) : 0;

  // Stock count (absolute)
  const cnt50   = data.map(e => e.above50);
  const cnt200  = data.map(e => e.above200);
  const cntBoth = data.map(e => e.both);

  // % by market cap
  const mc50   = data.map(e => pct(e.mcapAbove50,  e.mcapTotal));
  const mc200  = data.map(e => pct(e.mcapAbove200, e.mcapTotal));
  const mcBoth = data.map(e => pct(e.mcapBoth,     e.mcapTotal));

  // 52W high/low — count
  const highs = data.map(e => e.newHighs);
  const lows  = data.map(e => e.newLows);

  // 52W high/low — % by market cap
  const mcHighs = data.map(e => pct(e.mcapNewHighs, e.mcapTotal));
  const mcLows  = data.map(e => pct(e.mcapNewLows,  e.mcapTotal));

  const axisStyle = { color: '#555e6e', font: { size: 10 } };
  const gridStyle = { color: 'rgba(255,255,255,0.05)' };
  const xScale = { ticks: { ...axisStyle, maxTicksLimit: 8, callback: (_, i) => labels[i] ? labels[i].slice(5) : '' }, grid: gridStyle };
  const lineDs = (label, data, color) => ({ label, data, borderColor: color, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 2, tension: 0.3 });
  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: true, labels: { color: '#8a92a2', font: { size: 10 }, boxWidth: 16 } } },
  };

  if (chart4)  { chart4.destroy();  chart4  = null; }
  if (chart4b) { chart4b.destroy(); chart4b = null; }
  if (chart5)  { chart5.destroy();  chart5  = null; }
  if (chart5b) { chart5b.destroy(); chart5b = null; }

  const c4 = document.getElementById('c-int-ma-count');
  if (c4) chart4 = new Chart(c4, {
    type: 'line',
    data: { labels, datasets: [lineDs('> 50 MA', cnt50, C.blue), lineDs('> 200 MA', cnt200, C.amber), lineDs('> Both', cntBoth, C.green)] },
    options: { ...baseOpts, scales: { x: xScale, y: { ticks: axisStyle, grid: gridStyle, min: 0 } } }
  });

  const c4b = document.getElementById('c-int-ma-mcap');
  if (c4b) chart4b = new Chart(c4b, {
    type: 'line',
    data: { labels, datasets: [lineDs('> 50 MA', mc50, C.blue), lineDs('> 200 MA', mc200, C.amber), lineDs('> Both', mcBoth, C.green)] },
    options: { ...baseOpts, scales: { x: xScale, y: { ticks: { ...axisStyle, callback: v => v + '%' }, grid: gridStyle, min: 0, max: 100 } } }
  });

  const c5 = document.getElementById('c-int-hl');
  if (c5) chart5 = new Chart(c5, {
    type: 'line',
    data: { labels, datasets: [lineDs('New Highs', highs, C.green), lineDs('New Lows', lows, C.red)] },
    options: { ...baseOpts, scales: { x: xScale, y: { ticks: axisStyle, grid: gridStyle, min: 0 } } }
  });

  const c5b = document.getElementById('c-int-hl-mcap');
  if (c5b) chart5b = new Chart(c5b, {
    type: 'line',
    data: { labels, datasets: [lineDs('Highs % Mcap', mcHighs, C.green), lineDs('Lows % Mcap', mcLows, C.red)] },
    options: { ...baseOpts, scales: { x: xScale, y: { ticks: { ...axisStyle, callback: v => v + '%' }, grid: gridStyle, min: 0 } } }
  });
}
