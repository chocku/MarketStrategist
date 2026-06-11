// ── Tab 3: Rotation — Where's the Money? ─────────────────────────────

function rotTop(arr, key, n=3) {
  return [...arr].sort((a,b)=>b[key]-a[key]).slice(0,n);
}
function rotBottom(arr, key, n=3) {
  return [...arr].sort((a,b)=>a[key]-b[key]).slice(0,n);
}

// Compact card — used inside sector cards (industry prominent, ticker dimmed)
function rotStockCard(s, opts = {}) {
  const rc  = s.return1d > 0 ? 'var(--green)' : s.return1d < 0 ? 'var(--red)' : 'var(--text2)';
  const sec = s.sector   || '';
  const ind = s.industry || '';
  const sc  = sectorColor(sec);
  const name = s.name ? `<span class="rot-sc-name">${s.name.length > 18 ? s.name.slice(0,17)+'…' : s.name}</span>` : '';
  // Industry is the primary label; ticker is dimmed
  const indHtml = (opts.showIndustry && ind) ? `<div class="rot-sc-industry">${shortInd(ind)}</div>` : '';
  return `<div class="rot-sc" style="border-left-color:${sc}">
    ${indHtml}
    <div class="rot-sc-ticker">
      <a href="https://finance.yahoo.com/quote/${s.ticker}" target="_blank" rel="noopener">${s.ticker}</a>
      ${name}
      <b style="color:${rc};font-size:9px;flex-shrink:0">${pp(s.return1d,true)}%</b>
    </div>
  </div>`;
}

// Full-width stacked card for the Top/Bottom Stocks column
function rotStockCardFull(s) {
  const rc   = s.return1d > 0 ? 'var(--green)' : s.return1d < 0 ? 'var(--red)' : 'var(--text2)';
  const sec  = s.sector   || '';
  const ind  = s.industry || '';
  const sc   = sectorColor(sec);
  const name = s.name || '';
  return `<div class="rot-sf" style="border-left-color:${sc}">
    ${sec  ? `<div class="rot-sf-sector"  style="color:${sc}">${sec}</div>` : ''}
    ${ind  ? `<div class="rot-sf-industry">${shortInd(ind)}</div>` : ''}
    <div class="rot-sf-main">
      <a href="https://finance.yahoo.com/quote/${s.ticker}" target="_blank" rel="noopener">${s.ticker}</a>
      ${name ? `<span class="rot-sf-name">${name}</span>` : ''}
      <b style="color:${rc};font-size:9px;flex-shrink:0">${pp(s.return1d,true)}%</b>
    </div>
  </div>`;
}

// Legacy inline chip — still used in narrow contexts
function rotStockLink(s) {
  const c = s.return1d > 0 ? 'var(--green)' : s.return1d < 0 ? 'var(--red)' : 'var(--text2)';
  return `<span class="rot-chip"><a href="https://finance.yahoo.com/quote/${s.ticker}" target="_blank" rel="noopener">${s.ticker}</a> <b style="color:${c};font-size:9px">${pp(s.return1d,true)}%</b></span>`;
}

function rotSectorCard(sec, isTop) {
  const c = sec.ret > 0 ? 'var(--green)' : sec.ret < 0 ? 'var(--red)' : 'var(--text2)';
  const subStocks = isTop ? sec.topStocks : sec.botStocks;
  // Sector is the card header — show industry on each stock, no redundant industry sub-line
  const sc = sectorColor(sec.name);
  return `<div class="rot-sec-card" style="border-left:3px solid ${sc}">
    <div class="rot-sec-name"><span style="color:${sc}">${sec.name}</span> <b style="color:${c};font-size:9px">${pp(sec.ret,true)}%</b></div>
    <div class="rot-sec-stocks">${subStocks.map(s => rotStockCard(s, { showIndustry: true })).join('')}</div>
  </div>`;
}

// 52W group card: Sector (colored border+name) / Industry / tickers
function rotHighLowChip(i) {
  const secName = (i.stocks[0] && i.stocks[0].sector) || '';
  const sc      = sectorColor(secName);
  const tickers = i.stocks.map(s => {
    const c = s.return1d >= 0 ? 'var(--green)' : 'var(--red)';
    return `<a href="https://finance.yahoo.com/quote/${s.ticker}" target="_blank" rel="noopener" style="color:var(--text2);font-weight:600;text-decoration:none">${s.ticker}</a> <b style="color:${c};font-size:9px">${pp(s.return1d,true)}%</b>`;
  }).join('<span style="color:var(--border2)"> · </span>');
  return `<div class="rot-sf" style="border-left-color:${sc}">
    ${secName ? `<div class="rot-sf-sector" style="color:${sc}">${secName}</div>` : ''}
    <div class="rot-sf-industry">${shortInd(i.name)}</div>
    <div style="margin-top:2px;font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${tickers}</div>
  </div>`;
}

function rotRowHtml(entry, isLeaders) {
  const spx = entry.spxReturn1d;
  const spxColor = spx > 0 ? 'var(--green)' : spx < 0 ? 'var(--red)' : 'var(--text2)';
  const sectors  = isLeaders ? entry.topSectors : entry.botSectors;
  const allStocks = isLeaders ? entry.topStocks  : entry.botStocks;
  const highLow  = isLeaders ? entry.highInds    : entry.lowInds;

  const cols = `
    <div class="rot-col rot-col-wide">
      <div class="rot-col-label">${isLeaders ? 'Top Sectors' : 'Bottom Sectors'}</div>
      ${sectors.map(s => rotSectorCard(s, isLeaders)).join('')}
    </div>
    <div class="rot-col">
      <div class="rot-col-label">${isLeaders ? 'Top Stocks (S&P 500)' : 'Bottom Stocks (S&P 500)'}</div>
      <div style="display:flex;flex-direction:column;gap:5px">${allStocks.map(s => rotStockCardFull(s)).join('')}</div>
    </div>
    ${highLow.length ? `
    <div class="rot-col">
      <div class="rot-col-label">${isLeaders ? '52W Highs' : '52W Lows'}</div>
      <div style="display:flex;flex-direction:column;gap:5px">
        ${highLow.map(i => rotHighLowChip(i)).join('')}
      </div>
    </div>` : ''}`;

  return `
  <div class="rot-row">
    <div class="rot-date-col">
      <span class="rot-date">${fmtDate(entry.date)}</span>
      <span class="rot-spx" style="color:${spxColor}">SPX ${pp(spx,true)}%</span>
    </div>
    <div class="rot-cols">${cols}</div>
  </div>`;
}

function rotSwitchView(view) {
  _rotView = view;
  const rows = document.getElementById('rot-rows');
  const btnL  = document.getElementById('rot-btn-leaders');
  const btnLg = document.getElementById('rot-btn-laggers');
  if (!rows || !_rotationLog) return;
  rows.innerHTML = _rotationLog.map(e => rotRowHtml(e, _rotView === 'leaders')).join('');
  btnL.className  = 'rot-subtab leaders' + (_rotView === 'leaders' ? ' active' : '');
  btnLg.className = 'rot-subtab laggers' + (_rotView === 'laggers' ? ' active' : '');
}

async function renderRotation() {
  document.getElementById('root').innerHTML = tabHdr(
    'Where is the money going?',
    'Daily rotation log — ranked by 1D return (mcap-weighted for sectors & industries). Leaders shows top performers; Laggers shows bottom performers.'
  ) + `
  <div>
    <div class="rot-subtabs">
      <button id="rot-btn-leaders" class="rot-subtab leaders active" onclick="rotSwitchView('leaders')">▲ Leaders</button>
      <button id="rot-btn-laggers" class="rot-subtab laggers"        onclick="rotSwitchView('laggers')">▼ Laggers</button>
    </div>
    <div id="rot-rows"><div style="text-align:center;padding:40px;color:var(--text2);font-size:13px">Loading…</div></div>
  </div>`;

  _rotationLog = await loadRotationLog();

  const rows = document.getElementById('rot-rows');
  if (!rows) return;

  if (!_rotationLog.length) {
    rows.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text2)">No rotation data available.</div>';
    return;
  }

  rows.innerHTML = _rotationLog.map(e => rotRowHtml(e, _rotView === 'leaders')).join('');
}
