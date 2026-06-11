// ── Helpers ────────────────────────────────────────────────────────────
function regime(p) {
  if (p < 20) return { label:'Capitulation',        color:'#f04f4f', signal:'Stay in cash — deeply oversold' };
  if (p < 40) return { label:'Bear market',          color:'#f0a020', signal:'Avoid new longs' };
  if (p < 60) return { label:'Neutral / transition', color:'#f0d040', signal:'Selective — top RS stocks only' };
  if (p < 80) return { label:'Healthy bull',         color:'#22c87a', signal:'Safe to be long' };
  return             { label:'Overbought',            color:'#4a9eff', signal:'Watch for reversal' };
}
function maBadge(a,b) {
  if (a&&b) return `<span class="badge bg">Both MAs</span>`;
  if (a)    return `<span class="badge ba">50-MA only</span>`;
  if (b)    return `<span class="badge ba">200-MA only</span>`;
  return          `<span class="badge br">Below both</span>`;
}
function pct(a,b)            { return Math.round(a/b*100); }
function pp(n, sign=false)   { const s=n.toFixed(1); return sign&&n>0?'+'+s:s; }
function cPP(n)              { const s=pp(n,true)+'%'; return `<span style="color:${n>0?C.green:n<0?C.red:'var(--text2)'}">${s}</span>`; }
function fmtDate(s)          { return s ? new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'; }
function vsPct(price, ma)    { return pp((price-ma)/ma*100, true)+'%'; }
function fmtMcap(v) {
  if (!v) return '—';
  if (v >= 1e12) return '$'+(v/1e12).toFixed(1)+'T';
  if (v >= 1e9)  return '$'+(v/1e9).toFixed(0)+'B';
  return '$'+(v/1e6).toFixed(0)+'M';
}

function highlight(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

// ── Tab header helper ─────────────────────────────────────────────────
function tabHdr(question, why) {
  return `<div class="tab-header">
    <div class="th-question">${question}</div>
    <div class="th-why">${why}</div>
  </div>`;
}

// ── Key takeaways callout box ─────────────────────────────────────────
function callout(color, bullets) {
  const items = bullets.map(b => `<li style="margin-bottom:7px">${b}</li>`).join('');
  return `<div style="margin-top:12px;padding:12px 16px;border-left:3px solid ${color};background:${color}12;border-radius:0 6px 6px 0;color:var(--text)">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${color};margin-bottom:9px">Key Takeaways</div>
    <ul style="margin:0;padding-left:18px;font-size:12.5px;line-height:1.7">${items}</ul>
  </div>`;
}

// ── Shared row computation helper ─────────────────────────────────────
function computeGroupRow(name, d, { totalMcap, totalAdjMcYtd, totalAdjMcLow, spy1d, spy1w, spyReturnYtd, spyFromLow }) {
  const wt             = totalMcap > 0 ? d.mcap / totalMcap : 0;
  const ret1d          = d.mcap > 0 ? d.mcapRet1d  / d.mcap : 0;
  const ret1w          = d.mcap > 0 ? d.mcapRet1w  / d.mcap : 0;
  const retYtd         = d.mcap > 0 ? d.mcapRetYtd / d.mcap : 0;
  const retFromLow     = d.adjMcLow > 0 ? d.adjRetLow / d.adjMcLow : 0;
  const contribYtd     = totalAdjMcYtd > 0 ? d.adjRetYtd / totalAdjMcYtd : 0;
  const contribFromLow = totalAdjMcLow > 0 ? d.adjRetLow / totalAdjMcLow : 0;
  const wtPctAbove     = d.mcap > 0 ? d.mcapAboveBoth / d.mcap * 100 : 0;
  return {
    name, sector: d.sector || '',
    total: d.total, both: d.both,
    pct:            Math.round(d.both / d.total * 100),
    weight:         +(wt * 100).toFixed(1),
    mcap:           d.mcap,
    mcapAboveBoth:  d.mcapAboveBoth,
    wtPctAbove:     +wtPctAbove.toFixed(1),
    ret1d:          +ret1d.toFixed(2),
    ret1w:          +ret1w.toFixed(2),
    retYtd:         +retYtd.toFixed(2),
    retFromLow:     +retFromLow.toFixed(2),
    rs1d:           +(ret1d       - (spy1d        || 0)).toFixed(2),
    rs1w:           +(ret1w       - (spy1w        || 0)).toFixed(2),
    rsYtd:          +(retYtd      - (spyReturnYtd || 0)).toFixed(2),
    rsFromLow:      +(retFromLow  - (spyFromLow   || 0)).toFixed(2),
    contribYtd:     +contribYtd.toFixed(2),
    contribFromLow: +contribFromLow.toFixed(2),
    newHighs:       d.newHighs,
    newLows:        d.newLows,
  };
}
