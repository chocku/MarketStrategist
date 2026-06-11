// ── Tab 4: News ───────────────────────────────────────────────────────
function getTagsForItem(item) {
  const text = (item.headline || '') + ' ' + (item.summary || '');
  const tags = NEWS_TAGS.filter(t => t.pat.test(text));
  // detect stock tickers: 1-5 uppercase letters preceded by $ or surrounded by word boundaries with +/- nearby
  const tickerPat = /\b([A-Z]{1,5})\s*(?:\+|-|up|down|surges?|drops?|falls?|gains?|rallies)/g;
  const tickers = [];
  let m;
  while ((m = tickerPat.exec(text)) !== null) {
    const t = m[1];
    if (!['THE','AND','FOR','BUT','NOT','ALL','NEW','ITS','ARE','WAS','HAS','HAD','WITH','FROM'].includes(t))
      tickers.push(t);
  }
  return { tags, tickers: [...new Set(tickers)] };
}

// group dates into Mon-Fri weeks; returns array of week objects [{label, days:[{date,label,dayName}]}]
function groupIntoWeeks(dates) {
  const weeks = [];
  const seen = new Set();
  dates.forEach(d => {
    const dt = new Date(d + 'T12:00:00');
    // find Monday of this week
    const day = dt.getDay(); // 0=Sun, 1=Mon...5=Fri, 6=Sat
    const monday = new Date(dt);
    monday.setDate(dt.getDate() - (day === 0 ? 6 : day - 1));
    const key = monday.toISOString().slice(0, 10);
    if (!seen.has(key)) {
      seen.add(key);
      const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
      const label = monday.toLocaleDateString('en-US', { month:'short', day:'numeric' }) +
                    ' – ' + friday.toLocaleDateString('en-US', { month:'short', day:'numeric' });
      // build the 5 weekdays Mon-Fri
      const days = Array.from({length:5}, (_, i) => {
        const dd = new Date(monday); dd.setDate(monday.getDate() + i);
        const iso = dd.toISOString().slice(0, 10);
        return {
          date: iso,
          dayName: dd.toLocaleDateString('en-US', { weekday:'short' }),
          dayNum: dd.toLocaleDateString('en-US', { month:'short', day:'numeric' }),
        };
      });
      weeks.push({ key, label, days });
    }
  });
  return weeks.sort((a, b) => b.key.localeCompare(a.key));
}

function renderNews() {
  const dates = Object.keys(_news).sort().reverse();
  if (dates.length === 0) {
    document.getElementById('root').innerHTML = `<div class="news-empty">No news archived yet.<br>The scheduled agent will add headlines each weekday at 4:30 PM ET.</div>`;
    return;
  }
  if (!newsSelectedDate || !_news[newsSelectedDate]) newsSelectedDate = dates[0];

  const weeks = groupIntoWeeks(dates);
  // find which week contains newsSelectedDate
  let weekIdx = weeks.findIndex(w => w.days.some(d => d.date === newsSelectedDate));
  if (weekIdx < 0) weekIdx = 0;
  const currentWeek = weeks[weekIdx];

  // search mode: across ALL dates
  const searchMode = newsSearch.length > 0 || newsTagFilter;
  let items = [];
  if (searchMode) {
    dates.forEach(d => (_news[d] || []).forEach(item => items.push({ ...item, _date: d })));
  } else {
    items = (_news[newsSelectedDate] || []).map(item => ({ ...item, _date: newsSelectedDate }));
  }

  if (newsTagFilter) {
    const tagDef = NEWS_TAGS.find(t => t.id === newsTagFilter);
    items = items.filter(item => tagDef && tagDef.pat.test((item.headline||'') + ' ' + (item.summary||'')));
  }
  if (newsSearch) {
    const q = newsSearch.toLowerCase();
    items = items.filter(item =>
      (item.headline||'').toLowerCase().includes(q) ||
      (item.summary||'').toLowerCase().includes(q) ||
      (item.source||'').toLowerCase().includes(q)
    );
  }

  const tagFilterBtns = NEWS_TAGS.map(t => {
    const active = newsTagFilter === t.id;
    return `<button class="news-tf${active?' active':''}" style="${active?`background:${t.bg};color:${t.color};border-color:${t.color}40`:''}" onclick="newsTagFilter=${active?'null':`'${t.id}'`};renderNews()">${t.label}</button>`;
  }).join('');

  const weekNav = `
    <div class="news-week-nav">
      <button class="news-week-arrow" onclick="newsGoWeek(${weekIdx+1})" ${weekIdx >= weeks.length-1 ? 'disabled' : ''}>‹</button>
      <div class="news-week-label">${currentWeek.label}</div>
      <button class="news-week-arrow" onclick="newsGoWeek(${weekIdx-1})" ${weekIdx <= 0 ? 'disabled' : ''}>›</button>
    </div>`;

  const dayBar = searchMode ? '' : `
    <div class="news-day-bar">
      ${currentWeek.days.map(d => {
        const hasData = !!_news[d.date];
        const active = d.date === newsSelectedDate;
        return `<button class="news-day-btn${active?' active':''}${hasData?' has-data':''}"
          onclick="newsSelectedDate='${d.date}';renderNews()">
          <div class="ndb-name">${d.dayName}</div>
          <div class="ndb-date">${d.dayNum}</div>
        </button>`;
      }).join('')}
    </div>`;

  const cards = items.length === 0
    ? `<div class="news-noresults">No headlines match your search.</div>`
    : items.map((item, i) => {
        const { tags, tickers } = getTagsForItem(item);
        const tagHtml = [
          ...tags.map(t => `<span class="news-tag" style="background:${t.bg};color:${t.color}">${t.label}</span>`),
          ...tickers.map(t => `<span class="news-tag" style="background:rgba(255,255,255,0.06);color:var(--text2)">$${t}</span>`)
        ].join('');
        const dateLabel = searchMode ? `<span style="font-size:10px;color:var(--text3);margin-left:auto">${new Date(item._date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>` : '';
        return `<div class="news-card">
          <div class="news-card-top">
            <div class="news-num">#${i+1}</div>
            ${tagHtml ? `<div class="news-tags">${tagHtml}</div>` : ''}
            ${dateLabel}
          </div>
          <div class="news-headline">${highlight(item.headline||'', newsSearch)}</div>
          <div class="news-summary">${highlight(item.summary||'', newsSearch)}</div>
          <div class="news-meta">
            <span class="news-source">${item.source||''}</span>
            ${item.url ? `<a class="news-link" href="${item.url}" target="_blank" rel="noopener">Read more →</a>` : ''}
          </div>
        </div>`;
      }).join('');

  document.getElementById('root').innerHTML = `
    ${tabHdr('What Happened Today?', 'AI-curated top 5 market-moving headlines, archived daily after close.')}
    <div class="news-controls">
      <input id="news-search-input" class="news-search" type="text" placeholder="Search headlines..." value="${newsSearch.replace(/"/g,'&quot;')}"
        oninput="newsSearch=this.value;renderNews()">
      <div class="news-tag-filter">${tagFilterBtns}</div>
    </div>
    ${weekNav}${dayBar}
    <div class="news-grid">${cards}</div>`;
}

function newsGoWeek(idx) {
  const dates = Object.keys(_news).sort().reverse();
  const weeks = groupIntoWeeks(dates);
  if (idx < 0 || idx >= weeks.length) return;
  // pick the most recent day with data in that week
  const week = weeks[idx];
  const dayWithData = week.days.slice().reverse().find(d => _news[d.date]);
  if (dayWithData) newsSelectedDate = dayWithData.date;
  renderNews();
}
