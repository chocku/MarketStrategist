// ── Tab 3: Industry ───────────────────────────────────────────────────
function renderIndustry() {
  const { recentLowDate, spyFromLow, spyReturn1d, spyReturn1w, spyReturnYtd, spyReturn12m } = _data;
  const { indMap, industries, totalMcap, totalAdjMcYtd, totalAdjMcLow } = computeMaps();

  const topInds2    = [...industries].sort((a,b) => b.contribYtd     - a.contribYtd).slice(0,2);
  const botInds2    = [...industries].sort((a,b) => a.contribYtd     - b.contribYtd).slice(0,2);
  const topLowInds2 = [...industries].sort((a,b) => b.contribFromLow - a.contribFromLow).slice(0,2);
  const botLowInds2 = [...industries].sort((a,b) => a.contribFromLow - b.contribFromLow).slice(0,2);
  const bestIndBr2  = [...industries].filter(i => i.total >= 3).sort((a,b) => b.pct - a.pct).slice(0,2);
  const weakIndBr2  = [...industries].filter(i => i.total >= 3).sort((a,b) => a.pct - b.pct).slice(0,2);

  const indCallout = callout(C.blue, [
    `<strong>YTD leaders:</strong> ${topInds2.map(i=>`${shortInd(i.name)} <strong>${cPP(i.contribYtd)}</strong>`).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Laggards:</strong> ${botInds2.map(i=>`${shortInd(i.name)} <strong>${cPP(i.contribYtd)}</strong>`).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}`,
    `<strong>Since ${recentLowDate} low — leaders:</strong> ${topLowInds2.map(i=>`${shortInd(i.name)} <strong>${cPP(i.contribFromLow)}</strong>`).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Laggards:</strong> ${botLowInds2.map(i=>`${shortInd(i.name)} <strong>${cPP(i.contribFromLow)}</strong>`).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}`,
    `<strong>Broadest participation:</strong> ${bestIndBr2.map(i=>`${shortInd(i.name)} (${i.pct}% of ${i.total} stocks)`).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Narrowest:</strong> ${weakIndBr2.map(i=>`${shortInd(i.name)} (${i.pct}% of ${i.total})`).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}`
  ]);

  document.getElementById('root').innerHTML = tabHdr(
    'Which industries are leading within each sector?',
    'Industry returns, breadth, and contribution to SPY. Use the sector filter to focus on a group. Click any column header to sort.'
  ) + `
    <div class="sec-health">
      ${indCallout}
      <div class="ptitle" style="margin-top:8px">Industry participation — click any column header to sort</div>
      ${buildIndustryTable(indMap, totalMcap, totalAdjMcYtd, totalAdjMcLow, spyReturn1d, spyReturn1w, spyReturnYtd, spyFromLow, recentLowDate)}
      <div style="font-size:10px;color:var(--text3);margin-top:6px">Return = mcap-weighted avg · Relative Strength (vs SPY) = industry return minus SPY return · Contrib = beginning-of-period weighted attribution summing to actual SPY · Wt%↑MA = % of industry market cap above both MAs · ★ = ≥3 stocks at 52W high AND ≥5% of industry</div>
    </div>`;
}

function buildIndustryTable(indMap, totalMcap, totalAdjMcYtd, totalAdjMcLow, spy1d, spy1w, spyReturnYtd, spyFromLow, recentLowDate) {
  const sectors = [...new Set(Object.values(indMap).map(d => d.sector).filter(Boolean))].sort();
  const filteredEntries = industryFilterSector === 'all'
    ? Object.entries(indMap)
    : Object.entries(indMap).filter(([, d]) => d.sector === industryFilterSector);

  const si = col => industryBreadthSortCol === col ? (industryBreadthSortDir > 0 ? ' ▲' : ' ▼') : '';
  const thStyle = (col, extra='') =>
    `cursor:pointer;white-space:normal;line-height:1.3;padding:2px 5px 6px;font-size:9.5px;color:${col===industryBreadthSortCol?'var(--blue)':'var(--text3)'};letter-spacing:0.04em;text-transform:uppercase${extra}`;
  const th = (col, label, extra='') =>
    `<th onclick="sortIndustry('${col}')" style="${thStyle(col,extra)}">${label}${si(col)}</th>`;
  const grp = (colspan, label, borderLeft=false) =>
    `<th colspan="${colspan}" style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em;text-align:center;padding-bottom:2px;border-bottom:none${borderLeft?';border-left:0.5px solid var(--border)':''}">${label}</th>`;

  const rows = filteredEntries.map(([name, d]) =>
    computeGroupRow(name, d, { totalMcap, totalAdjMcYtd, totalAdjMcLow, spy1d, spy1w, spyReturnYtd, spyFromLow })
  ).sort((a, b) => {
    const av = a[industryBreadthSortCol] ?? -Infinity;
    const bv = b[industryBreadthSortCol] ?? -Infinity;
    return industryBreadthSortDir * (bv - av);
  });

  const fs = 'font-size:11px;';

  const sectorFilter = `<div style="display:flex;align-items:center;gap:8px;margin:12px 0 6px">
    <span style="font-size:12px;color:var(--text2)">Sector:</span>
    <select onchange="onIndustryFilter(this.value)" class="ctrl-input" style="width:200px">
      <option value="all"${industryFilterSector==='all'?' selected':''}>All Sectors</option>
      ${sectors.map(s=>`<option value="${s}"${s===industryFilterSector?' selected':''}>${s}</option>`).join('')}
    </select>
    ${industryFilterSector!=='all'?`<span style="font-size:11px;color:var(--text2)">${rows.length} industries</span>`:''}
  </div>`;

  const thead = `<thead>
    <tr style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">
      <th colspan="2" style="border-bottom:none"></th>
      ${grp(3,'Size',true)}
      ${grp(4,'Trend Health',true)}
      ${grp(4,'Return',true)}
      ${grp(4,'Relative Strength (vs SPY)',true)}
      ${grp(2,'Contrib',true)}
      ${grp(2,'52W',true)}
    </tr>
    <tr>
      ${th('name','Industry')}
      ${th('sector','Sector')}
      ${th('total','#',';border-left:0.5px solid var(--border)')}
      ${th('mcap','MCap')}
      ${th('weight','Wt%')}
      ${th('both','Both',';border-left:0.5px solid var(--border)')}
      ${th('mcapAboveBoth','MCap↑MA')}
      ${th('wtPctAbove','Wt%↑MA')}
      <th style="font-size:9.5px;color:var(--text3);padding:2px 5px 6px;text-transform:uppercase;letter-spacing:0.04em">Bar</th>
      ${th('ret1d','1D',';border-left:0.5px solid var(--border)')}
      ${th('ret1w','1W')}
      ${th('retYtd','YTD')}
      ${th('retFromLow','Fr Low')}
      ${th('rs1d','1D',';border-left:0.5px solid var(--border)')}
      ${th('rs1w','1W')}
      ${th('rsYtd','YTD')}
      ${th('rsFromLow','Fr Low')}
      ${th('contribYtd','YTD',';border-left:0.5px solid var(--border)')}
      ${th('contribFromLow','Fr Low')}
      ${th('newHighs','Highs',';border-left:0.5px solid var(--border)')}
      ${th('newLows','Lows')}
    </tr>
  </thead>`;

  const tbody = `<tbody>${rows.map(r => {
    const reg = regime(r.pct);
    const realHighs = r.newHighs >= 3 && (r.newHighs / r.total) >= 0.05;
    const bar = `<div style="width:40px;height:4px;border-radius:2px;background:var(--bg3);overflow:hidden"><div style="width:${r.pct}%;height:100%;background:${reg.color}"></div></div>`;
    return `<tr>
      <td style="${fs}font-weight:600;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.name}">${shortInd(r.name)}</td>
      <td style="${fs}color:var(--text3);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.sector}">${r.sector}</td>
      <td style="${fs}color:var(--text2);border-left:0.5px solid var(--border)">${r.total}</td>
      <td style="${fs}color:var(--text2)">${fmtMcap(r.mcap)}</td>
      <td style="${fs}color:var(--text2)">${r.weight}%</td>
      <td style="${fs}text-align:center;color:var(--text2);border-left:0.5px solid var(--border)">${r.both}</td>
      <td style="${fs}color:var(--text2)">${fmtMcap(r.mcapAboveBoth)}</td>
      <td style="${fs}font-weight:700;color:${reg.color}">${r.wtPctAbove.toFixed(1)}%</td>
      <td>${bar}</td>
      <td style="${fs}color:${cc(r.ret1d)};border-left:0.5px solid var(--border)">${pp(r.ret1d,true)}%</td>
      <td style="${fs}color:${cc(r.ret1w)}">${pp(r.ret1w,true)}%</td>
      <td style="${fs}color:${cc(r.retYtd)}">${pp(r.retYtd,true)}%</td>
      <td style="${fs}color:${cc(r.retFromLow)}">${pp(r.retFromLow,true)}%</td>
      <td style="${fs}color:${cc(r.rs1d)};border-left:0.5px solid var(--border)">${pp(r.rs1d,true)}%</td>
      <td style="${fs}color:${cc(r.rs1w)}">${pp(r.rs1w,true)}%</td>
      <td style="${fs}color:${cc(r.rsYtd)}">${pp(r.rsYtd,true)}%</td>
      <td style="${fs}color:${cc(r.rsFromLow)}">${pp(r.rsFromLow,true)}%</td>
      <td style="${fs}font-weight:600;color:${cc(r.contribYtd)};border-left:0.5px solid var(--border)">${r.contribYtd>=0?'+':''}${r.contribYtd}%</td>
      <td style="${fs}font-weight:600;color:${cc(r.contribFromLow)}">${r.contribFromLow>=0?'+':''}${r.contribFromLow}%</td>
      <td style="${fs}color:${realHighs?C.green:r.newHighs>0?'var(--text2)':'var(--text3)'};font-weight:${realHighs?700:400};border-left:0.5px solid var(--border)">${r.newHighs||'—'}${realHighs?' ★':''}</td>
      <td style="${fs}color:${r.newLows>0?C.red:'var(--text3)'};font-weight:${r.newLows>0?700:400}">${r.newLows||'—'}</td>
    </tr>`;
  }).join('')}</tbody>`;

  return sectorFilter + `<div class="sticky-breadth-wrap" style="margin-top:4px"><table style="width:100%;border-collapse:collapse;min-width:1000px">
    ${thead}${tbody}
  </table></div>`;
}

function sortIndustry(col) {
  if (industryBreadthSortCol === col) industryBreadthSortDir *= -1;
  else { industryBreadthSortCol = col; industryBreadthSortDir = -1; }
  if (chart3) { chart3.destroy(); chart3 = null; }
  renderBreadth();
}

function onIndustryFilter(val) {
  industryFilterSector = val;
  renderBreadth();
}
