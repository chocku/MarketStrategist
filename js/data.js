// ── Data load ─────────────────────────────────────────────────────────
async function init() {
  document.getElementById('sub').textContent = 'Loading...';
  document.getElementById('root').innerHTML = `<div class="loading"><div class="spinner"></div>Fetching data.json...</div>`;
  let d;
  try {
    const r = await fetch('data.json');
    if (!r.ok) throw new Error('data.json not found');
    d = await r.json();
  } catch(e) {
    document.getElementById('root').innerHTML = `
      <div class="err">
        <strong>data.json not found</strong><br><br>
        <strong>Option 1 — View online:</strong><br>
        <a href="https://chocku.github.io/MarketStrategist/" style="color:#4a9eff">chocku.github.io/MarketStrategist</a><br><br>
        <strong>Option 2 — Run locally:</strong><br>
        <code style="background:rgba(255,255,255,0.06);padding:8px 16px;border-radius:6px;font-size:13px">
          double-click run_local.bat
        </code>
      </div>`;
    return;
  }
  _data = d;
  document.getElementById('dataDate').textContent = fmtDate(d.asOf);
  try {
    const nr = await fetch('news_archive.json');
    if (nr.ok) _news = await nr.json();
  } catch(e) { _news = {}; }
  try {
    const bhr = await fetch('breadth_history.json');
    if (bhr.ok) _breadthHistory = await bhr.json();
  } catch(e) { _breadthHistory = []; }
  filterSector = 'all';
  industryFilterSector = 'all';
  leadersSector = 'all';
  leadersIndustry = 'all';
  leadersMaStatus = 'all';
  leadersRsYtd = 'all';
  searchTicker = '';
  // Stale data warning
  const banner = document.getElementById('stale-banner');
  if (d.asOf) {
    const ageDays = (Date.now() - new Date(d.asOf).getTime()) / 86400000;
    if (ageDays > 3) {
      banner.style.display = 'block';
      banner.textContent = `⚠ Data is ${Math.floor(ageDays)} days old (last updated ${fmtDate(d.asOf)}). The daily fetcher may not have run recently.`;
    } else {
      banner.style.display = 'none';
    }
  }
  renderCurrent();
}

// ── Shared computation — builds secMap / indMap from _data ───────────
function computeMaps() {
  const { stocks: allStocks, spyReturnYtd, spyFromLow } = _data;
  const secMap = {};
  const indMap = {};
  const totalMcap = allStocks.reduce((s, st) => s + (st.marketCap || 0), 0);
  let totalAdjMcYtd = 0, totalAdjMcLow = 0;

  allStocks.forEach(s => {
    const sec = s.sector || 'Unknown';
    const ind = s.industry || 'Unknown';
    if (!secMap[sec]) secMap[sec] = {
      total:0, above50:0, above200:0, both:0, newHighs:0, newLows:0,
      mcap:0, mcapRet1d:0, mcapRet1w:0, mcapRetYtd:0, mcapAboveBoth:0,
      adjMcYtd:0, adjMcLow:0, adjRetYtd:0, adjRetLow:0
    };
    if (!indMap[ind]) indMap[ind] = {
      sector: sec,
      total:0, above50:0, above200:0, both:0, newHighs:0, newLows:0,
      mcap:0, mcapRet1d:0, mcapRet1w:0, mcapRetYtd:0, mcapAboveBoth:0,
      adjMcYtd:0, adjMcLow:0, adjRetYtd:0, adjRetLow:0
    };
    const m = secMap[sec], mi = indMap[ind];
    m.total++; mi.total++;
    if (s.above50)  { m.above50++;  mi.above50++; }
    if (s.above200) { m.above200++; mi.above200++; }
    if (s.above50 && s.above200) { m.both++; mi.both++; }
    if (s.newHigh) { m.newHighs++; mi.newHighs++; }
    if (s.newLow)  { m.newLows++;  mi.newLows++; }
    const mc = s.marketCap || 0;
    const rYtd = (s.returnYtd     || 0) / 100;
    const rLow = (s.returnFromLow || 0) / 100;
    m.mcap += mc; mi.mcap += mc;
    m.mcapRet1d  += mc * (s.return1d  || 0); mi.mcapRet1d  += mc * (s.return1d  || 0);
    m.mcapRet1w  += mc * (s.return1w  || 0); mi.mcapRet1w  += mc * (s.return1w  || 0);
    m.mcapRetYtd += mc * (s.returnYtd || 0); mi.mcapRetYtd += mc * (s.returnYtd || 0);
    if (s.above50 && s.above200) { m.mcapAboveBoth += mc; mi.mcapAboveBoth += mc; }
    const adjYtd = mc / (1 + rYtd), adjLow = mc / (1 + rLow);
    m.adjMcYtd  += adjYtd; mi.adjMcYtd  += adjYtd;
    m.adjMcLow  += adjLow; mi.adjMcLow  += adjLow;
    m.adjRetYtd += adjYtd * (s.returnYtd     || 0); mi.adjRetYtd += adjYtd * (s.returnYtd     || 0);
    m.adjRetLow += adjLow * (s.returnFromLow || 0); mi.adjRetLow += adjLow * (s.returnFromLow || 0);
    totalAdjMcYtd += adjYtd;
    totalAdjMcLow += adjLow;
  });

  const sectors = Object.entries(secMap).map(([name, d]) => {
    const wt             = totalMcap > 0 ? d.mcap / totalMcap : 0;
    const retYtd         = d.mcap > 0 ? d.mcapRetYtd / d.mcap : 0;
    const retFromLow     = d.adjMcLow > 0 ? d.adjRetLow / d.adjMcLow : 0;
    const contribYtd     = totalAdjMcYtd > 0 ? d.adjRetYtd / totalAdjMcYtd : 0;
    const contribFromLow = totalAdjMcLow > 0 ? d.adjRetLow / totalAdjMcLow : 0;
    return {
      name, ...d,
      pct:            Math.round(d.both / d.total * 100),
      weight:         +(wt * 100).toFixed(1),
      retYtd:         +retYtd.toFixed(2),
      retFromLow:     +retFromLow.toFixed(2),
      rsYtd:          +(retYtd - (spyReturnYtd || 0)).toFixed(2),
      rsFromLow:      +(retFromLow - (spyFromLow || 0)).toFixed(2),
      contribYtd:     +contribYtd.toFixed(2),
      contribFromLow: +contribFromLow.toFixed(2),
    };
  });

  const industries = Object.entries(indMap).map(([name, d]) => {
    const contribYtd     = totalAdjMcYtd > 0 ? d.adjRetYtd / totalAdjMcYtd : 0;
    const contribFromLow = totalAdjMcLow > 0 ? d.adjRetLow / totalAdjMcLow : 0;
    return {
      name,
      pct:            Math.round(d.both / d.total * 100),
      total:          d.total, both: d.both,
      contribYtd:     +contribYtd.toFixed(2),
      contribFromLow: +contribFromLow.toFixed(2),
      newHighs:       d.newHighs, newLows: d.newLows
    };
  });

  return { secMap, indMap, sectors, industries, totalMcap, totalAdjMcYtd, totalAdjMcLow };
}

// ── Filtered stock list ────────────────────────────────────────────────
function getFilteredStocks() {
  if (!_data) return [];
  let stocks = _data.stocks;
  if (leadersSector   !== 'all') stocks = stocks.filter(s => s.sector   === leadersSector);
  if (leadersIndustry !== 'all') stocks = stocks.filter(s => s.industry === leadersIndustry);
  if (leadersMaStatus !== 'all') stocks = stocks.filter(s => {
    if (leadersMaStatus === 'both')    return s.above50 && s.above200;
    if (leadersMaStatus === '50only')  return s.above50 && !s.above200;
    if (leadersMaStatus === '200only') return !s.above50 && s.above200;
    if (leadersMaStatus === 'below')   return !s.above50 && !s.above200;
    return true;
  });
  if (leadersRsYtd !== 'all') stocks = stocks.filter(s => {
    const v = s.vsSpxYtd || 0;
    if (leadersRsYtd === 'pos')   return v > 0;
    if (leadersRsYtd === 'gt10')  return v > 10;
    if (leadersRsYtd === 'gt25')  return v > 25;
    if (leadersRsYtd === 'neg')   return v < 0;
    return true;
  });
  return stocks;
}

// ── Internals data helper ─────────────────────────────────────────────
function getInternalsData() {
  if (!_breadthHistory || !_breadthHistory.length) return null;
  if (internalsFilterSector === 'all' && internalsFilterIndustry === 'all') {
    return _breadthHistory.map(e => ({
      date:          e.date,
      total:         e.total,
      above50:       e.above50,
      above200:      e.above200,
      both:          e.both,
      newHighs:      e.newHighs,
      newLows:       e.newLows,
      mcapTotal:     e.mcapTotal    || 0,
      mcapAbove50:   e.mcapAbove50  || 0,
      mcapAbove200:  e.mcapAbove200 || 0,
      mcapBoth:      e.mcapBoth     || 0,
      mcapNewHighs:  e.mcapNewHighs || 0,
      mcapNewLows:   e.mcapNewLows  || 0,
    }));
  }
  return _breadthHistory.map(e => {
    let src;
    if (internalsFilterIndustry !== 'all') {
      src = e.industries && e.industries[internalsFilterIndustry];
    } else {
      src = e.sectors && e.sectors[internalsFilterSector];
    }
    if (!src) return { date: e.date, total: 0, above50: 0, above200: 0, both: 0, newHighs: 0, newLows: 0, mcapTotal: 0, mcapAbove50: 0, mcapAbove200: 0, mcapBoth: 0, mcapNewHighs: 0, mcapNewLows: 0 };
    return { date: e.date, total: src.total, above50: src.above50, above200: src.above200, both: src.both, newHighs: src.newHighs, newLows: src.newLows,
             mcapTotal: src.mcapTotal || 0, mcapAbove50: src.mcapAbove50 || 0, mcapAbove200: src.mcapAbove200 || 0, mcapBoth: src.mcapBoth || 0,
             mcapNewHighs: src.mcapNewHighs || 0, mcapNewLows: src.mcapNewLows || 0 };
  });
}

// ── Rotation entry builder ────────────────────────────────────────────
function buildRotationEntry(d) {
  const stocks = d.stocks || [];

  // Per-sector map: weighted return + stocks + per-industry sub-map
  const sectorMap = {};
  stocks.forEach(s => {
    const sec = s.sector || 'Unknown';
    const ind = s.industry || 'Unknown';
    if (!sectorMap[sec]) sectorMap[sec] = { totalW: 0, totalR: 0, stocks: [], indMap: {} };
    const w = s.marketCap || 1;
    sectorMap[sec].totalW += w;
    sectorMap[sec].totalR += s.return1d * w;
    sectorMap[sec].stocks.push(s);
    if (!sectorMap[sec].indMap[ind]) sectorMap[sec].indMap[ind] = { totalW: 0, totalR: 0 };
    sectorMap[sec].indMap[ind].totalW += w;
    sectorMap[sec].indMap[ind].totalR += s.return1d * w;
  });

  // Global industry map (for 52W high/low)
  const indMap = {};
  stocks.forEach(s => {
    const ind = s.industry || 'Unknown';
    if (!indMap[ind]) indMap[ind] = { totalW: 0, totalR: 0, highs: [], lows: [] };
    const w = s.marketCap || 1;
    indMap[ind].totalW += w;
    indMap[ind].totalR += s.return1d * w;
    if (s.newHigh) indMap[ind].highs.push(s);
    if (s.newLow)  indMap[ind].lows.push(s);
  });
  const indArr = Object.entries(indMap).map(([name, v]) => ({
    name, ret: v.totalW ? v.totalR / v.totalW : 0,
    highs: v.highs, lows: v.lows
  }));

  // Sector array with top industry + top 3 stocks inside each sector
  const sectorArr = Object.entries(sectorMap).map(([name, v]) => {
    const ret = v.totalW ? v.totalR / v.totalW : 0;
    const topInd = Object.entries(v.indMap)
      .map(([n, iv]) => ({ name: n, ret: iv.totalW ? iv.totalR / iv.totalW : 0 }))
      .sort((a, b) => b.ret - a.ret)[0] || null;
    const botInd = Object.entries(v.indMap)
      .map(([n, iv]) => ({ name: n, ret: iv.totalW ? iv.totalR / iv.totalW : 0 }))
      .sort((a, b) => a.ret - b.ret)[0] || null;
    return {
      name, ret, topInd, botInd,
      topStocks: rotTop(v.stocks, 'return1d', 3),
      botStocks: rotBottom(v.stocks, 'return1d', 3)
    };
  });

  // 52W high/low: ALL stocks that hit the high/low, sorted by return
  const highInds = [...indArr]
    .filter(i => i.highs.length > 0)
    .sort((a,b) => b.highs.length - a.highs.length)
    .slice(0, 3)
    .map(i => ({ name: i.name, count: i.highs.length, stocks: rotTop(i.highs, 'return1d', i.highs.length) }));

  const lowInds = [...indArr]
    .filter(i => i.lows.length > 0)
    .sort((a,b) => b.lows.length - a.lows.length)
    .slice(0, 3)
    .map(i => ({ name: i.name, count: i.lows.length, stocks: rotBottom(i.lows, 'return1d', i.lows.length) }));

  return {
    date: d.asOf,
    spxReturn1d: d.spxReturn1d || 0,
    topSectors:    rotTop(sectorArr, 'ret'),
    botSectors:    rotBottom(sectorArr, 'ret'),
    topIndustries: rotTop(indArr, 'ret'),
    botIndustries: rotBottom(indArr, 'ret'),
    topStocks:     rotTop(stocks, 'return1d', 5),
    botStocks:     rotBottom(stocks, 'return1d', 5),
    highInds, lowInds
  };
}

// ── Rotation log loader ───────────────────────────────────────────────
async function loadRotationLog() {
  const STORE_KEY = 'rotationLog_v5';
  let log = [];
  try { log = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch(e) {}
  const existingDates = new Set(log.map(e => e.date));

  // Build probe list: today's data.json + up to 30 weekdays back, skip already cached
  const today = new Date();
  const probeUrls = [];
  const todayDate = (_data || {}).asOf;
  if (todayDate && !existingDates.has(todayDate)) probeUrls.push({ url: 'data.json', date: todayDate });

  let newProbes = 0;
  for (let i = 1; i <= 90 && newProbes < 20; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    const iso = d.toISOString().slice(0,10);
    if (!existingDates.has(iso)) { probeUrls.push({ url: `history/data_${iso}.json`, date: iso }); newProbes++; }
  }

  // Fetch with a 3-second timeout so 404s fail fast
  const fetchWithTimeout = async (url) => {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 3000);
    try { return await fetch(url, { signal: ctrl.signal }); }
    catch(e) { return null; }
    finally { clearTimeout(tid); }
  };

  await Promise.all(probeUrls.map(async src => {
    try {
      const r = await fetchWithTimeout(src.url);
      if (!r || !r.ok) return;
      const d = await r.json();
      if (!d.asOf || !d.stocks) return;
      if (!existingDates.has(d.asOf)) { log.push(buildRotationEntry(d)); existingDates.add(d.asOf); }
    } catch(e) {}
  }));

  log.sort((a,b) => b.date.localeCompare(a.date));
  try { localStorage.setItem(STORE_KEY, JSON.stringify(log)); } catch(e) {}
  return log;
}
