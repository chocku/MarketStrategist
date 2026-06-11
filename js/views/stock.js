// ── Tab 4: Leaders — What to Buy? ────────────────────────────────────
function renderLeaders() {
  const allStocks = _data ? _data.stocks : [];
  const sectors   = [...new Set(allStocks.map(s => s.sector  ||'Unknown'))].sort();
  const indPool   = leadersSector === 'all'
    ? allStocks
    : allStocks.filter(s => s.sector === leadersSector);
  const industries = [...new Set(indPool.map(s => s.industry||'Unknown'))].sort();

  const stocks = getFilteredStocks();

  const grpTh = (label, colspan, extra='') =>
    `<th colspan="${colspan}" style="text-align:center;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--text3);border-bottom:0.5px solid var(--border);padding:3px 4px;background:rgba(255,255,255,0.02)${extra}">${label}</th>`;
  const sh = (col, label, title='') =>
    `<th data-col="${col}" onclick="setSort('${col}')" title="${title}"><span>${label}</span><span class="sort-ind"></span></th>`;

  document.getElementById('root').innerHTML = `
    <div class="tab-header">
      <div class="th-question">Which stocks are driving the market?</div>
      <div class="th-why">Sort by <strong>Relative Strength (vs SPY) 12m</strong> or <strong>YTD</strong> to find the leaders. Use the sector and industry filters to focus on groups in accumulation.</div>
    </div>
    <div class="tpanel">
      <div class="tbar">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <select class="ctrl-input" style="width:170px" onchange="onLeadersSectorChange(this.value)">
            <option value="all">All Sectors</option>
            ${sectors.map(s=>`<option value="${s}"${s===leadersSector?' selected':''}>${s}</option>`).join('')}
          </select>
          <select class="ctrl-input" style="width:220px" onchange="onLeadersIndustryChange(this.value)">
            <option value="all">All Industries</option>
            ${industries.map(i=>`<option value="${i}"${i===leadersIndustry?' selected':''}>${i}</option>`).join('')}
          </select>
          <select class="ctrl-input" style="width:145px" onchange="onLeadersMaChange(this.value)">
            <option value="all"${leadersMaStatus==='all'?' selected':''}>All MA Status</option>
            <option value="both"${leadersMaStatus==='both'?' selected':''}>Both MAs ✓</option>
            <option value="50only"${leadersMaStatus==='50only'?' selected':''}>50-MA only</option>
            <option value="200only"${leadersMaStatus==='200only'?' selected':''}>200-MA only</option>
            <option value="below"${leadersMaStatus==='below'?' selected':''}>Below both</option>
          </select>
          <select class="ctrl-input" style="width:145px" onchange="onLeadersRsYtdChange(this.value)">
            <option value="all"${leadersRsYtd==='all'?' selected':''}>RS YTD: All</option>
            <option value="pos"${leadersRsYtd==='pos'?' selected':''}>RS YTD > 0%</option>
            <option value="gt10"${leadersRsYtd==='gt10'?' selected':''}>RS YTD > +10%</option>
            <option value="gt25"${leadersRsYtd==='gt25'?' selected':''}>RS YTD > +25%</option>
            <option value="neg"${leadersRsYtd==='neg'?' selected':''}>RS YTD < 0%</option>
          </select>
          <input id="searchInput" class="ctrl-input" type="text" placeholder="Search ticker…" style="width:130px" oninput="onSearch(this.value)">
        </div>
        <div style="font-size:11px;color:var(--text3)">${stocks.length} stocks · click headers to sort</div>
      </div>
      <div class="sticky-table-wrap">
      <table>
        <thead>
          <tr id="tableGroupHead">
            ${grpTh('', 5)}
            ${grpTh('MA Status', 3, ';border-left:0.5px solid var(--border)')}
            ${grpTh('Return Profile', 5, ';border-left:0.5px solid var(--border)')}
            ${grpTh('Relative Strength (vs SPY)', 4, ';border-left:0.5px solid var(--border)')}
            ${grpTh('Contribution to SPY', 2, ';border-left:0.5px solid var(--border)')}
          </tr>
          <tr id="tableHead">
            <th style="width:28px">#</th>
            <th style="width:58px" data-col="ticker" onclick="setSort('ticker')"><span>Ticker</span><span class="sort-ind"></span></th>
            <th style="width:68px" data-col="price" onclick="setSort('price')"><span>Price</span><span class="sort-ind"></span></th>
            ${sh('marketCap','Mkt Cap')}
            <th style="width:160px">Sector / Industry</th>
            <th style="border-left:0.5px solid var(--border)" data-col="above50"  onclick="setSort('above50')"><span>vs 50MA</span><span class="sort-ind"></span></th>
            ${sh('above200','vs 200MA')}
            <th>Status</th>
            <th style="border-left:0.5px solid var(--border)" data-col="return1d"  onclick="setSort('return1d')"><span>1D</span><span class="sort-ind"></span></th>
            ${sh('return1m','1M')}
            ${sh('return3m','3M')}
            ${sh('returnYtd','YTD')}
            ${sh('return12m','12M')}
            <th style="border-left:0.5px solid var(--border)" data-col="vsSpx1d"  onclick="setSort('vsSpx1d')"  title="Excess return vs SPY"><span>1D</span><span class="sort-ind"></span></th>
            ${sh('vsSpxYtd','YTD','Excess return vs SPY YTD')}
            ${sh('vsSpx12m','12M','Excess return vs SPY 12m')}
            ${sh('vsSpyFromLow','Fr Low','Excess return vs SPY from recent low')}
            <th style="border-left:0.5px solid var(--border)" data-col="contribYtd"  onclick="setSort('contribYtd')"  title="% pts of SPY YTD return"><span>YTD</span><span class="sort-ind"></span></th>
            ${sh('contribFromLow','From Low','% pts of SPY return from recent low')}
          </tr>
        </thead>
        <tbody id="stockTbody"></tbody>
      </table>
      </div>
    </div>
    <div class="note">
      Data: S&amp;P 500 via yfinance &nbsp;·&nbsp;
      Run <code>python fetch_breadth.py</code> to refresh &nbsp;·&nbsp;
      Relative Strength (vs SPY) = excess return vs SPY &nbsp;·&nbsp;
      Contribution = beginning-of-period weight × return &nbsp;·&nbsp;
      New Highs/Lows = within 2% of 52-week extreme
    </div>
  `;
  renderTable(stocks);
}

// ── Table-only render ─────────────────────────────────────────────────
function renderTable(stocks) {
  // Compute per-stock contribution using all stocks as the index base
  const allStocks = _data ? _data.stocks : [];
  let totalAdjMcYtd = 0, totalAdjMcLow = 0;
  allStocks.forEach(s => {
    const mc   = s.marketCap || 0;
    const rYtd = (s.returnYtd     || 0) / 100;
    const rLow = (s.returnFromLow || 0) / 100;
    totalAdjMcYtd += mc / (1 + rYtd);
    totalAdjMcLow += mc / (1 + rLow);
  });

  // Sort
  const getValue = (s, col) => {
    if (col==='above50')  return (s.price-s.ma50)/s.ma50;
    if (col==='above200') return (s.price-s.ma200)/s.ma200;
    if (col==='vsSpyFromLow') return (s.returnFromLow||0) - (_data.spyFromLow||0);
    if (col==='contribYtd' || col==='contribFromLow') {
      const mc   = s.marketCap || 0;
      const rYtd = (s.returnYtd     || 0) / 100;
      const rLow = (s.returnFromLow || 0) / 100;
      const adjYtd = mc / (1 + rYtd);
      const adjLow = mc / (1 + rLow);
      return col==='contribYtd'
        ? (totalAdjMcYtd > 0 ? adjYtd * (s.returnYtd||0) / totalAdjMcYtd : 0)
        : (totalAdjMcLow > 0 ? adjLow * (s.returnFromLow||0) / totalAdjMcLow : 0);
    }
    return s[col] ?? (typeof s[col]==='string' ? '' : -Infinity);
  };
  const sorted = [...stocks].sort((a,b) => {
    const av = getValue(a, sortCol), bv = getValue(b, sortCol);
    if (av === bv) return 0;
    if (typeof av === 'string') return sortDir * av.localeCompare(bv);
    return sortDir * (av > bv ? 1 : -1);
  });

  // Ticker search filter
  const q = searchTicker;
  const rows = q ? sorted.filter(s => s.ticker.includes(q)) : sorted;

  // Update sort indicators on headers
  document.querySelectorAll('th[data-col]').forEach(th => {
    const col = th.dataset.col;
    const ind = th.querySelector('.sort-ind');
    th.classList.toggle('sort-active', col === sortCol);
    if (ind) ind.textContent = col===sortCol ? (sortDir>0?' ▲':' ▼') : '';
  });

  const borderL = 'border-left:0.5px solid var(--border)';

  // Render rows
  document.getElementById('stockTbody').innerHTML = rows.map((s,i) => {
    const mc   = s.marketCap || 0;
    const rYtd = (s.returnYtd     || 0) / 100;
    const rLow = (s.returnFromLow || 0) / 100;
    const adjYtd = mc / (1 + rYtd);
    const adjLow = mc / (1 + rLow);
    const cYtd  = totalAdjMcYtd > 0 ? +(adjYtd * (s.returnYtd||0)     / totalAdjMcYtd).toFixed(2) : 0;
    const cLow  = totalAdjMcLow > 0 ? +(adjLow * (s.returnFromLow||0) / totalAdjMcLow).toFixed(2) : 0;

    const hlTag = s.newHigh
      ? ` <span class="htag" style="color:${C.green}">↑H</span>`
      : s.newLow
        ? ` <span class="htag" style="color:${C.red}">↓L</span>`
        : '';
    return `<tr data-ticker="${s.ticker}">
      <td class="muted" style="width:28px">${i+1}</td>
      <td style="width:58px;font-weight:700;letter-spacing:.02em"><a href="https://finance.yahoo.com/quote/${s.ticker}" target="_blank" rel="noopener" title="${s.name||s.ticker}" style="color:inherit;text-decoration:none;border-bottom:1px dotted var(--text3)">${s.ticker}</a>${hlTag}</td>
      <td style="width:68px">$${s.price.toFixed(2)}</td>
      <td class="muted">${fmtMcap(s.marketCap)}</td>
      <td style="font-size:10px;line-height:1.3;width:160px;max-width:160px;white-space:nowrap;overflow:hidden"><div style="color:#fff;overflow:hidden;text-overflow:ellipsis">${s.sector||'—'}</div><div style="color:#fff;overflow:hidden;text-overflow:ellipsis">${shortInd(s.industry||'—')}</div></td>
      <td style="${borderL}" class="${s.above50?'up':'dn'}">${vsPct(s.price,s.ma50)}</td>
      <td class="${s.above200?'up':'dn'}">${vsPct(s.price,s.ma200)}</td>
      <td>${maBadge(s.above50,s.above200)}</td>
      <td style="${borderL}" class="${(s.return1d||0)>=0?'up':'dn'}">${pp(s.return1d||0,true)}%</td>
      <td class="${s.return1m>=0?'up':'dn'}">${pp(s.return1m,true)}%</td>
      <td class="${s.return3m>=0?'up':'dn'}">${pp(s.return3m,true)}%</td>
      <td class="${(s.returnYtd||0)>=0?'up':'dn'}">${pp(s.returnYtd||0,true)}%</td>
      <td class="${s.return12m>=0?'up':'dn'}">${pp(s.return12m,true)}%</td>
      <td style="${borderL}" class="${(s.vsSpx1d||0)>=0?'up':'dn'}">${pp(s.vsSpx1d||0,true)}%</td>
      <td class="${(s.vsSpxYtd||0)>=0?'up':'dn'}">${pp(s.vsSpxYtd||0,true)}%</td>
      <td class="${(s.vsSpx12m||0)>=0?'up':'dn'}">${pp(s.vsSpx12m||0,true)}%</td>
      <td class="${((s.returnFromLow||0)-(_data.spyFromLow||0))>=0?'up':'dn'}">${pp((s.returnFromLow||0)-(_data.spyFromLow||0),true)}%</td>
      <td style="${borderL};font-weight:600" class="${cYtd>=0?'up':'dn'}">${cYtd>=0?'+':''}${cYtd}%</td>
      <td style="font-weight:600" class="${cLow>=0?'up':'dn'}">${cLow>=0?'+':''}${cLow}%</td>
    </tr>`;
  }).join('');
}

function onSearch(val) {
  searchTicker = val.trim().toUpperCase();
  renderTable(getFilteredStocks());
}

function setSort(col) {
  if (sortCol === col) sortDir *= -1;
  else { sortCol = col; sortDir = -1; }
  renderTable(getFilteredStocks());
}

function onSectorChange(val) {
  filterSector = val;
  renderCurrent();
}
function onLeadersSectorChange(val) {
  leadersSector = val;
  leadersIndustry = 'all';
  renderLeaders();
}
function onLeadersIndustryChange(val) {
  leadersIndustry = val;
  renderLeaders();
}
function onLeadersMaChange(val) {
  leadersMaStatus = val;
  renderLeaders();
}
function onLeadersRsYtdChange(val) {
  leadersRsYtd = val;
  renderLeaders();
}
