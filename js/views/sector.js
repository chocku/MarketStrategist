// ── Tab 2: Sector ─────────────────────────────────────────────────────
function renderSector() {
  const { recentLowDate, spyFromLow, spyReturn1d, spyReturn1w, spyReturnYtd, spyReturn12m } = _data;
  const { secMap, sectors, totalMcap, totalAdjMcYtd, totalAdjMcLow } = computeMaps();

  const topContrib    = [...sectors].sort((a,b) => b.contribYtd     - a.contribYtd)[0];
  const bottomContrib = [...sectors].sort((a,b) => a.contribYtd     - b.contribYtd)[0];
  const topLow        = [...sectors].sort((a,b) => b.contribFromLow - a.contribFromLow)[0];
  const bottomLow     = [...sectors].sort((a,b) => a.contribFromLow - b.contribFromLow)[0];
  const bestBreadth   = [...sectors].sort((a,b) => b.pct - a.pct)[0];
  const weakBreadth   = [...sectors].sort((a,b) => a.pct - b.pct)[0];

  const secCallout = callout(C.blue, [
    `<strong>YTD — Leading sector:</strong> ${topContrib.name} contributed <strong>${cPP(topContrib.contribYtd)}</strong> of SPY's ${cPP(spyReturnYtd)} return`
      + (bottomContrib.contribYtd < -0.15 ? `&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Drag:</strong> ${bottomContrib.name} (${cPP(bottomContrib.contribYtd)})` : ''),
    `<strong>Since ${recentLowDate} low — Leading sector:</strong> ${topLow.name} contributed <strong>${cPP(topLow.contribFromLow)}</strong> of SPY's ${cPP(spyFromLow)} recovery`
      + (bottomLow.contribFromLow < -0.15 ? `&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Drag:</strong> ${bottomLow.name} (${cPP(bottomLow.contribFromLow)})` : ''),
    `<strong>Breadth — Most stocks above both MAs:</strong> ${bestBreadth.name} (${bestBreadth.pct}% of ${bestBreadth.total} stocks)&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Fewest:</strong> ${weakBreadth.name} (${weakBreadth.pct}% of ${weakBreadth.total} stocks)`
  ]);

  document.getElementById('root').innerHTML = tabHdr(
    'Which sectors are leading — and how wide is participation?',
    'Sector returns, breadth (% above both MAs), and SPY contribution. Click any column header to sort.'
  ) + `
    <div class="sec-health">
      ${secCallout}
      <div class="ptitle" style="margin-top:8px">Sector participation — click any column header to sort</div>
      ${buildGroupTable(secMap, totalMcap, totalAdjMcYtd, totalAdjMcLow, spyReturn1d, spyReturn1w, spyReturnYtd, spyFromLow, recentLowDate, breadthSortCol, breadthSortDir, false, 'sortBreadth')}
      <div style="font-size:10px;color:var(--text3);margin-top:8px">Return = mcap-weighted avg · Relative Strength (vs SPY) = sector return minus SPY return · Contrib = beginning-of-year weighted attribution summing to actual SPY · Wt% Above = % of sector market cap above both MAs · ★ = ≥3 stocks at 52W high AND ≥5% of sector</div>
    </div>`;
}

function buildGroupTable(groupMap, totalMcap, totalAdjMcYtd, totalAdjMcLow, spy1d, spy1w, spyReturnYtd, spyFromLow, recentLowDate, sortCol, sortDir, showSectorCol, onSortFn) {
  const rows = Object.entries(groupMap).map(([name, d]) =>
    computeGroupRow(name, d, { totalMcap, totalAdjMcYtd, totalAdjMcLow, spy1d, spy1w, spyReturnYtd, spyFromLow })
  );

  rows.sort((a, b) => {
    const av = a[sortCol] ?? -Infinity;
    const bv = b[sortCol] ?? -Infinity;
    return sortDir * (bv - av);
  });

  const totalBoth      = rows.reduce((s, r) => s + r.both, 0);
  const totalAll       = rows.reduce((s, r) => s + r.total, 0);
  const totalMcapAbove = rows.reduce((s, r) => s + r.mcapAboveBoth, 0);
  const totalWtAbove   = totalMcap > 0 ? totalMcapAbove / totalMcap * 100 : 0;
  const totalNewHighs  = rows.reduce((s, r) => s + r.newHighs, 0);
  const totalNewLows   = rows.reduce((s, r) => s + r.newLows, 0);

  const si = col => sortCol === col ? (sortDir > 0 ? ' ▲' : ' ▼') : '';
  const nameLabel = showSectorCol ? 'Industry' : 'Sector';
  const extraColCount = showSectorCol ? 1 : 0;

  let thead = `
    <thead>
      <tr style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">
        <th colspan="${1 + extraColCount}" style="text-align:left;padding-bottom:2px;border-bottom:none"></th>
        <th colspan="3" style="text-align:center;padding-bottom:2px;border-bottom:none;border-left:0.5px solid var(--border)">Size</th>
        <th colspan="4" style="text-align:center;padding-bottom:2px;border-bottom:none;border-left:0.5px solid var(--border)">Trend Health</th>
        <th colspan="4" style="text-align:center;padding-bottom:2px;border-bottom:none;border-left:0.5px solid var(--border)">Return</th>
        <th colspan="4" style="text-align:center;padding-bottom:2px;border-bottom:none;border-left:0.5px solid var(--border)">Relative Strength (vs SPY)</th>
        <th colspan="2" style="text-align:center;padding-bottom:2px;border-bottom:none;border-left:0.5px solid var(--border)">Contribution</th>
        <th colspan="2" style="text-align:center;padding-bottom:2px;border-bottom:none;border-left:0.5px solid var(--border)">Current 52W</th>
      </tr>
      <tr>
        <th onclick="${onSortFn}('name')" style="cursor:pointer">${nameLabel}${si('name')}</th>`;

  if (showSectorCol) {
    thead += `
        <th onclick="${onSortFn}('sector')" style="cursor:pointer">Sector${si('sector')}</th>`;
  }

  thead += `
        <th onclick="${onSortFn}('total')" style="cursor:pointer;border-left:0.5px solid var(--border)" title="Total stocks">#Stocks${si('total')}</th>
        <th onclick="${onSortFn}('mcap')" style="cursor:pointer" title="Total market cap">Mkt Cap${si('mcap')}</th>
        <th onclick="${onSortFn}('weight')" style="cursor:pointer" title="Weight % in S&amp;P 500">Wt%${si('weight')}</th>
        <th onclick="${onSortFn}('both')" style="cursor:pointer;border-left:0.5px solid var(--border)" title="# stocks above both 50-MA and 200-MA">#Above Both MAs${si('both')}</th>
        <th onclick="${onSortFn}('mcapAboveBoth')" style="cursor:pointer" title="Market cap of stocks above both MAs">Mkt Cap Above MAs${si('mcapAboveBoth')}</th>
        <th onclick="${onSortFn}('wtPctAbove')" style="cursor:pointer" title="% of market cap above both MAs">Wt% Above${si('wtPctAbove')}</th>
        <th style="width:80px">Breadth</th>
        <th onclick="${onSortFn}('ret1d')" style="cursor:pointer;border-left:0.5px solid var(--border)" title="Market-cap weighted 1-day return">1D${si('ret1d')}</th>
        <th onclick="${onSortFn}('ret1w')" style="cursor:pointer" title="Market-cap weighted 1-week return">1W${si('ret1w')}</th>
        <th onclick="${onSortFn}('retYtd')" style="cursor:pointer" title="Market-cap weighted YTD return">YTD${si('retYtd')}</th>
        <th onclick="${onSortFn}('retFromLow')" style="cursor:pointer" title="Market-cap weighted return since recent low">From Low${si('retFromLow')}</th>
        <th onclick="${onSortFn}('rs1d')" style="cursor:pointer;border-left:0.5px solid var(--border)" title="1-day return minus SPY">1D${si('rs1d')}</th>
        <th onclick="${onSortFn}('rs1w')" style="cursor:pointer" title="1-week return minus SPY">1W${si('rs1w')}</th>
        <th onclick="${onSortFn}('rsYtd')" style="cursor:pointer" title="Return minus SPY YTD">YTD${si('rsYtd')}</th>
        <th onclick="${onSortFn}('rsFromLow')" style="cursor:pointer" title="Return minus SPY from-low">From Low${si('rsFromLow')}</th>
        <th onclick="${onSortFn}('contribYtd')" style="cursor:pointer;border-left:0.5px solid var(--border)" title="% pts of SPY YTD return">YTD${si('contribYtd')}</th>
        <th onclick="${onSortFn}('contribFromLow')" style="cursor:pointer" title="% pts of SPY from-low return">From Low${si('contribFromLow')}</th>
        <th onclick="${onSortFn}('newHighs')" style="cursor:pointer;border-left:0.5px solid var(--border)" title="Stocks within 2% of 52W high · ★ = ≥3 stocks &amp; ≥5% of sector">Highs${si('newHighs')}</th>
        <th onclick="${onSortFn}('newLows')" style="cursor:pointer" title="Stocks within 2% of 52W low">Lows${si('newLows')}</th>
      </tr>
    </thead>`;

  const tbody = `<tbody>
    ${rows.map(s => {
      const reg = regime(s.pct);
      const realHighs = s.newHighs >= 3 && (s.newHighs / s.total) >= 0.05;
      const cYtdC  = s.contribYtd     > 0 ? C.green : s.contribYtd     < 0 ? C.red : 'var(--text2)';
      const cLowC  = s.contribFromLow > 0 ? C.green : s.contribFromLow < 0 ? C.red : 'var(--text2)';
      const rsYtdC = s.rsYtd     > 0 ? C.green : s.rsYtd     < 0 ? C.red : 'var(--text2)';
      const rsLowC = s.rsFromLow > 0 ? C.green : s.rsFromLow < 0 ? C.red : 'var(--text2)';
      const nameStyle = showSectorCol ? 'max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600' : 'font-weight:600';
      const sectorCell = showSectorCol ? `<td class="muted" style="font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${s.sector}">${s.sector}</td>` : '';
      return `<tr>
        <td style="${nameStyle}" title="${s.name}">${s.name}</td>
        ${sectorCell}
        <td class="muted" style="border-left:0.5px solid var(--border)">${s.total}</td>
        <td class="muted">${fmtMcap(s.mcap)}</td>
        <td class="muted">${s.weight}%</td>
        <td style="text-align:center;color:var(--text2);border-left:0.5px solid var(--border)">${s.both}</td>
        <td class="muted">${fmtMcap(s.mcapAboveBoth)}</td>
        <td style="font-weight:700;color:${reg.color}">${s.wtPctAbove.toFixed(1)}%</td>
        <td><div style="height:4px;background:var(--bg3);border-radius:2px"><div style="width:${s.pct}%;height:4px;background:${reg.color};border-radius:2px"></div></div></td>
        <td style="color:${s.ret1d>0?C.green:s.ret1d<0?C.red:'var(--text2)'};border-left:0.5px solid var(--border)">${pp(s.ret1d,true)}%</td>
        <td style="color:${s.ret1w>0?C.green:s.ret1w<0?C.red:'var(--text2)'}">${pp(s.ret1w,true)}%</td>
        <td style="color:${s.retYtd>0?C.green:s.retYtd<0?C.red:'var(--text2)'}">${pp(s.retYtd,true)}%</td>
        <td style="color:${s.retFromLow>0?C.green:s.retFromLow<0?C.red:'var(--text2)'}">${pp(s.retFromLow,true)}%</td>
        <td style="color:${s.rs1d>0?C.green:s.rs1d<0?C.red:'var(--text2)'};border-left:0.5px solid var(--border)">${pp(s.rs1d,true)}%</td>
        <td style="color:${s.rs1w>0?C.green:s.rs1w<0?C.red:'var(--text2)'}">${pp(s.rs1w,true)}%</td>
        <td style="color:${rsYtdC}">${pp(s.rsYtd,true)}%</td>
        <td style="color:${rsLowC}">${pp(s.rsFromLow,true)}%</td>
        <td style="font-weight:600;color:${cYtdC};border-left:0.5px solid var(--border)">${s.contribYtd >= 0 ? '+' : ''}${s.contribYtd}%</td>
        <td style="font-weight:600;color:${cLowC}">${s.contribFromLow >= 0 ? '+' : ''}${s.contribFromLow}%</td>
        <td style="color:${realHighs?C.green:s.newHighs>0?'var(--text2)':'var(--text3)'};font-weight:${realHighs?700:400};border-left:0.5px solid var(--border)">${s.newHighs||'—'}${realHighs?' ★':''}</td>
        <td style="color:${s.newLows>0?C.red:'var(--text3)'};font-weight:${s.newLows>0?700:400}">${s.newLows||'—'}</td>
      </tr>`;
    }).join('')}
  </tbody>`;

  const totalBothPct = totalAll > 0 ? Math.round(totalBoth / totalAll * 100) : 0;
  const sectorColTotals = showSectorCol ? `<td class="muted">—</td>` : '';
  const tfoot = `<tfoot>
    <tr style="border-top:1.5px solid var(--border2);background:var(--bg2)">
      <td style="font-weight:700;color:var(--text)">SPY (actual)</td>
      ${sectorColTotals}
      <td class="muted" style="border-left:0.5px solid var(--border)">${totalAll}</td>
      <td class="muted">${fmtMcap(totalMcap)}</td>
      <td class="muted">100%</td>
      <td style="text-align:center;color:var(--text2);border-left:0.5px solid var(--border)">${totalBoth}</td>
      <td class="muted">${fmtMcap(totalMcapAbove)}</td>
      <td style="font-weight:700;color:${regime(totalBothPct).color}">${totalWtAbove.toFixed(1)}%</td>
      <td></td>
      <td style="font-weight:700;color:${spy1d>0?C.green:C.red};border-left:0.5px solid var(--border)">${pp(spy1d,true)}%</td>
      <td style="font-weight:700;color:${spy1w>0?C.green:C.red}">${pp(spy1w,true)}%</td>
      <td style="font-weight:700;color:${spyReturnYtd>0?C.green:C.red}">${pp(spyReturnYtd,true)}%</td>
      <td style="font-weight:700;color:${spyFromLow>0?C.green:C.red}">${pp(spyFromLow,true)}%</td>
      <td style="color:var(--text3);border-left:0.5px solid var(--border)" title="SPY is benchmark">—</td>
      <td style="color:var(--text3)" title="SPY is benchmark">—</td>
      <td style="color:var(--text3)" title="SPY is benchmark">—</td>
      <td style="color:var(--text3)" title="SPY is benchmark">—</td>
      <td style="font-weight:700;color:${spyReturnYtd>=0?C.green:C.red};border-left:0.5px solid var(--border)">${spyReturnYtd>=0?'+':''}${(spyReturnYtd||0).toFixed(2)}%</td>
      <td style="font-weight:700;color:${spyFromLow>=0?C.green:C.red}">${spyFromLow>=0?'+':''}${(spyFromLow||0).toFixed(2)}%</td>
      <td style="color:${totalNewHighs>0?'var(--text2)':'var(--text3)'};border-left:0.5px solid var(--border)">${totalNewHighs||'—'}</td>
      <td style="color:${totalNewLows>0?C.red:'var(--text3)'}">${totalNewLows||'—'}</td>
    </tr>
  </tfoot>`;

  return `<div class="sticky-breadth-wrap"><table>${thead}${tbody}${tfoot}</table></div>`;
}

function sortBreadth(col) {
  if (breadthSortCol === col) breadthSortDir *= -1;
  else { breadthSortCol = col; breadthSortDir = -1; }
  if (chart3) { chart3.destroy(); chart3 = null; }
  renderBreadth();
}
