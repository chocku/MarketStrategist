// ── Disclaimer ────────────────────────────────────────────────────────
function showDisclaimerIfNeeded() {
  const overlay = document.getElementById('disclaimer-overlay');
  if (localStorage.getItem('disclaimer-accepted') === 'yes') {
    overlay.style.display = 'none';
    init();
  } else {
    overlay.style.display = 'flex';
  }
}
function acceptDisclaimer() {
  localStorage.setItem('disclaimer-accepted', 'yes');
  document.getElementById('disclaimer-overlay').style.display = 'none';
  init();
}

// ── Current date display ──────────────────────────────────────────────
document.getElementById('currentDate').textContent =
  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ── Feedback modal ─────────────────────────────────────────────────────
function openFeedback() {
  document.getElementById('feedback-overlay').style.display = 'flex';
  document.getElementById('feedback-form').style.display = 'block';
  document.getElementById('feedback-success').style.display = 'none';
  document.getElementById('fb-error').style.display = 'none';
  document.getElementById('fb-message').value = '';
}
function closeFeedback() {
  document.getElementById('feedback-overlay').style.display = 'none';
}
async function submitFeedback() {
  const msg = document.getElementById('fb-message').value.trim();
  if (!msg) {
    const err = document.getElementById('fb-error');
    err.textContent = 'Please enter your feedback before sending.';
    err.style.display = 'block';
    return;
  }
  const btn = document.querySelector('#feedback-form .btn:last-of-type');
  btn.textContent = 'Sending…'; btn.disabled = true;
  try {
    const res = await fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({
        name:    document.getElementById('fb-name').value.trim() || 'Anonymous',
        type:    document.getElementById('fb-type').value,
        message: msg,
      }, document.getElementById('fb-email').value.trim() ? { email: document.getElementById('fb-email').value.trim() } : {}))
    });
    if (res.ok) {
      document.getElementById('feedback-form').style.display = 'none';
      document.getElementById('feedback-success').style.display = 'block';
    } else {
      throw new Error('Server error');
    }
  } catch {
    const err = document.getElementById('fb-error');
    err.textContent = 'Could not send — please try again or email feedback directly.';
    err.style.display = 'block';
  }
  btn.textContent = 'Send'; btn.disabled = false;
}
document.getElementById('feedback-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('feedback-overlay')) closeFeedback();
});

// ── Tab switching ─────────────────────────────────────────────────────
function switchTab(tab) {
  if (chart2) { chart2.destroy(); chart2 = null; }
  if (chart3) { chart3.destroy(); chart3 = null; }
  if (chart4) { chart4.destroy(); chart4 = null; }
  if (chart5) { chart5.destroy(); chart5 = null; }
  activeTab = tab;
  ['overview','sector','industry','stock','rotation','news'].forEach(t =>
    document.getElementById('tab-'+t).classList.toggle('active', t === tab)
  );
  renderCurrent();
}

// ── Dispatcher ────────────────────────────────────────────────────────
function renderCurrent() {
  if (!_data) return;
  const { asOf, spyReturn1d, spyReturnYtd, spyReturn12m } = _data;
  const stocks = getFilteredStocks();
  const n = stocks.length;
  const label = filterSector === 'all' ? `${n} stocks` : `${n} stocks · ${filterSector}`;
  document.getElementById('sub').textContent =
    `${label} · ${fmtDate(asOf)} · SPY  1d: ${pp(spyReturn1d??0,true)}%  YTD: ${pp(spyReturnYtd??0,true)}%  12m: ${pp(spyReturn12m,true)}%`;
  if      (activeTab === 'overview')  renderOverview();
  else if (activeTab === 'sector')    renderSector();
  else if (activeTab === 'industry')  renderIndustry();
  else if (activeTab === 'stock')     renderLeaders();
  else if (activeTab === 'rotation')  renderRotation();
  else if (activeTab === 'news')      renderNews();
}

showDisclaimerIfNeeded();
