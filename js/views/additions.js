// ── Tab: Index Additions ───────────────────────────────────────────────
let additionsIndexFilter = [];   // [] = all
let additionsStatusFilter = 'all';
let additionsWindow = 'all';
let additionsSortCol = null;
let additionsSortDir = -1;

function renderAdditions() {
  if (!_additions) {
    document.getElementById('root').innerHTML = `<div class="loading"><div class="spinner"></div>Loading index additions...</div>`;
    return;
  }

  const { last_updated, additions: raw } = _additions;
  const today = new Date();

  // ── Filtering ─────────────────────────────────────────────────────────
  let rows = raw.slice();

  // Index filter
  if (additionsIndexFilter.length > 0) {
    rows = rows.filter(r => additionsIndexFilter.includes(r.index));
  }

  // Status filter
  if (additionsStatusFilter !== 'all') {
    rows = rows.filter(r => r.status === additionsStatusFilter);
  }

  // Time window filter — applies only to rows with an announcement_date
  if (additionsWindow !== 'all') {
    const cutoffDays = additionsWindow === '90d' ? 90 : 365;
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - cutoffDays);
    rows = rows.filter(r => {
      if (!r.announcement_date) return true; // keep rumored rows regardless
      return new Date(r.announcement_date) >= cutoff;
    });
  }

  // ── Sorting ────────────────────────────────────────────────────────────
  const col = additionsSortCol;
  rows.sort((a, b) => {
    // Always pin upcoming (future effective date or null effective) to top, sorted asc by eff date
    const aUpcoming = !a.effective_date || new Date(a.effective_date) > today;
    const bUpcoming = !b.effective_date || new Date(b.effective_date) > today;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    if (aUpcoming && bUpcoming) {
      // Both upcoming: sort ascending by effective_date (nulls last)
      if (!a.effective_date && !b.effective_date) return 0;
      if (!a.effective_date) return 1;
      if (!b.effective_date) return -1;
      return a.effective_date.localeCompare(b.effective_date);
    }

    // Both past: apply user sort or default (newest announcement first)
    if (!col) {
      const da = a.announcement_date || '';
      const db = b.announcement_date || '';
      return db.localeCompare(da);
    }
    let av = a[col], bv = b[col];
    if (av === null || av === undefined) av = col.includes('date') ? '' : -Infinity;
    if (bv === null || bv === undefined) bv = col.includes('date') ? '' : -Infinity;
    if (typeof av === 'string') return additionsSortDir * av.localeCompare(bv);
    return additionsSortDir * (av - bv);
  });

  // ── Helpers ────────────────────────────────────────────────────────────
  function daysSince(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T12:00:00');
    if (d > today) return null;
    return Math.floor((today - d) / 86400000);
  }

  function statusBadge(s) {
    const cfg = {
      rumored:   { color:'#f0a020', bg:'rgba(240,160,32,0.15)',  label:'Rumored'   },
      confirmed: { color:'#4a9eff', bg:'rgba(74,158,255,0.15)',  label:'Confirmed' },
      effective: { color:'#22c87a', bg:'rgba(34,200,122,0.15)',  label:'Effective' },
    };
    const c = cfg[s] || { color:'var(--text3)', bg:'rgba(255,255,255,0.05)', label: s };
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.05em;background:${c.bg};color:${c.color};border:0.5px solid ${c.color}40;white-space:nowrap">${c.label}</span>`;
  }

  function returnCell(row) {
    if (row.status !== 'effective' || row.return_pct_announcement === null) {
      return `<span style="color:var(--text3)">—</span>`;
    }
    const v = row.return_pct_announcement;
    const color = v > 0 ? C.green : v < 0 ? C.red : 'var(--text2)';
    return `<span style="color:${color};font-weight:600">${v > 0 ? '+' : ''}${v.toFixed(1)}%</span>`;
  }

  function thBtn(label, colKey) {
    const active = additionsSortCol === colKey;
    const arrow = active ? (additionsSortDir === 1 ? ' ↑' : ' ↓') : '';
    return `<th class="sortable${active?' sort-active':''}" onclick="additionsSort('${colKey}')" style="cursor:pointer;white-space:nowrap;user-select:none">${label}${arrow}</th>`;
  }

  // ── Available indices ─────────────────────────────────────────────────
  const allIndices = [...new Set(raw.map(r => r.index))].sort();

  // ── Index filter pills ────────────────────────────────────────────────
  const indexPills = allIndices.map(idx => {
    const active = additionsIndexFilter.includes(idx);
    return `<button class="news-tf${active?' active':''}"
      style="${active ? 'background:rgba(74,158,255,0.18);color:#4a9eff;border-color:rgba(74,158,255,0.4)' : ''}"
      onclick="additionsToggleIndex('${idx}')">${idx}</button>`;
  }).join('');

  // ── Status filter buttons ─────────────────────────────────────────────
  const statusOpts = [
    { v:'all',       l:'All' },
    { v:'effective', l:'Effective' },
    { v:'confirmed', l:'Confirmed' },
    { v:'rumored',   l:'Rumored'   },
  ];
  const statusBtns = statusOpts.map(o => {
    const active = additionsStatusFilter === o.v;
    return `<button class="news-tf${active?' active':''}"
      style="${active ? 'background:rgba(255,255,255,0.1);color:var(--text);border-color:rgba(255,255,255,0.25)' : ''}"
      onclick="additionsStatusFilter='${o.v}';renderAdditions()">${o.l}</button>`;
  }).join('');

  // ── Time window buttons ───────────────────────────────────────────────
  const windowOpts = [{ v:'90d', l:'90 Days' }, { v:'12m', l:'12 Months' }, { v:'all', l:'All Time' }];
  const windowBtns = windowOpts.map(o => {
    const active = additionsWindow === o.v;
    return `<button class="news-tf${active?' active':''}"
      style="${active ? 'background:rgba(255,255,255,0.1);color:var(--text);border-color:rgba(255,255,255,0.25)' : ''}"
      onclick="additionsWindow='${o.v}';renderAdditions()">${o.l}</button>`;
  }).join('');

  // ── Table rows ────────────────────────────────────────────────────────
  const tableRows = rows.map(r => {
    const ds = r.effective_date ? daysSince(r.effective_date) : null;
    const isUpcoming = !r.effective_date || new Date(r.effective_date) > today;
    const rowStyle = isUpcoming ? 'background:rgba(74,158,255,0.04)' : '';
    const tvUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(r.ticker)}`;
    return `<tr style="${rowStyle}">
      <td style="text-align:center">${statusBadge(r.status)}</td>
      <td><a href="${tvUrl}" target="_blank" rel="noopener" style="color:#4a9eff;font-weight:700;text-decoration:none;font-family:monospace">${r.ticker}</a></td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.company}">${r.company}</td>
      <td><span style="font-size:11px;color:var(--text2)">${r.index}</span></td>
      <td><span style="font-size:11px;color:var(--text2)">${r.sector}</span></td>
      <td style="text-align:right;color:var(--text2)">${r.market_cap_at_addition ? fmtMcap(r.market_cap_at_addition) : '<span style="color:var(--text3)">—</span>'}</td>
      <td style="text-align:center;color:var(--text2);white-space:nowrap">${r.announcement_date ? fmtDate(r.announcement_date) : '<span style="color:var(--text3)">TBD</span>'}</td>
      <td style="text-align:center;color:var(--text2);white-space:nowrap">${r.effective_date ? fmtDate(r.effective_date) : '<span style="color:var(--text3)">TBD</span>'}</td>
      <td style="text-align:right;color:var(--text2)">${ds !== null ? ds + 'd' : '<span style="color:var(--text3)">—</span>'}</td>
      <td style="text-align:right">${returnCell(r)}</td>
      <td style="text-align:center;color:var(--text3);font-size:11px">${r.price_last_updated ? fmtDate(r.price_last_updated) : '—'}</td>
      <td style="font-size:11px;color:var(--text3);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r.notes||'').replace(/"/g,'&quot;')}">${r.notes || ''}</td>
    </tr>`;
  }).join('');

  const noRows = rows.length === 0
    ? `<tr><td colspan="12" style="text-align:center;padding:32px;color:var(--text3)">No additions match your filters.</td></tr>`
    : tableRows;

  const fmtLastUpdated = last_updated
    ? new Date(last_updated + 'T12:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })
    : '—';

  document.getElementById('root').innerHTML = `
    ${tabHdr('Index Additions', 'Track recent and upcoming additions to major indices — S&amp;P 500, Nasdaq-100, and DJIA.')}

    <div style="margin-bottom:14px;font-size:12px;color:var(--text3)">
      Data last updated: ${fmtLastUpdated}
    </div>

    <div class="news-controls" style="flex-wrap:wrap;gap:10px;margin-bottom:8px">
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
        <span style="font-size:11px;color:var(--text3);margin-right:2px">Index:</span>
        ${indexPills}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
        <span style="font-size:11px;color:var(--text3);margin-right:2px">Status:</span>
        ${statusBtns}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
        <span style="font-size:11px;color:var(--text3);margin-right:2px">Window:</span>
        ${windowBtns}
      </div>
    </div>

    <div style="font-size:11px;color:var(--text3);margin-bottom:10px">${rows.length} row${rows.length !== 1 ? 's' : ''} · Upcoming pinned to top · Click column headers to sort</div>

    <div class="sticky-table-wrap">
      <table class="tpanel" style="font-size:12.5px">
        <thead>
          <tr>
            ${thBtn('Status', 'status')}
            ${thBtn('Ticker', 'ticker')}
            <th>Company</th>
            ${thBtn('Index', 'index')}
            ${thBtn('Sector', 'sector')}
            ${thBtn('Mkt Cap @ Add', 'market_cap_at_addition')}
            ${thBtn('Announced', 'announcement_date')}
            ${thBtn('Effective', 'effective_date')}
            ${thBtn('Days Since', null)}
            ${thBtn('Return % (Ann→)', 'return_pct_announcement')}
            <th>Price Updated</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>${noRows}</tbody>
      </table>
    </div>`;
}

function additionsToggleIndex(idx) {
  const i = additionsIndexFilter.indexOf(idx);
  if (i === -1) additionsIndexFilter.push(idx);
  else additionsIndexFilter.splice(i, 1);
  renderAdditions();
}

function additionsSort(col) {
  if (additionsSortCol === col) {
    additionsSortDir *= -1;
  } else {
    additionsSortCol = col;
    additionsSortDir = col === 'announcement_date' || col === 'effective_date' ? -1 : -1;
  }
  renderAdditions();
}
