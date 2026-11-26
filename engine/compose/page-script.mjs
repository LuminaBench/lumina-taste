// The behaviour of a drafted page that is not a marketing story (an app screen, a checkout, a status page),
// written next to it as lumina-taste/page.js. Components boot themselves from lumina.js; this script only joins
// them up: page states (?state=loading|empty|error), charts drawn from data in the markup, search and status
// filters over a table, a row's detail in a drawer, a save bar, a running total, steps of a sign-in, a billing
// toggle, uptime bars, and moving between an app's screens. It carries no copy: every message it shows is
// read from the page's own data attributes, so the words stay the brief's.
export const PAGE_SCRIPT = String.raw`// lumina-taste page script for a composed draft. It joins the parts up; the words live in index.html.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Page states: every [data-view] block shows only in its state; ?state= opens one, [data-set-state] switches.
  const applyState = (state) => {
    document.documentElement.dataset.pageState = state;
    for (const el of $$('[data-view]')) el.hidden = !el.dataset.view.split(' ').includes(state);
  };
  const q = new URLSearchParams(location.search);
  const fromUrl = q.get('state');
  applyState(fromUrl && /^[a-z-]+$/.test(fromUrl) ? fromUrl : 'ready');
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-set-state]'); if (b) applyState(b.dataset.setState); });

  // Charts: <div data-chart="kpi-card" data-chart-data="{…}" data-chart-options="{…}">.
  const drawCharts = () => {
    const kit = window.lumina && window.lumina.charts;
    if (!kit) return;
    for (const el of $$('[data-chart]')) {
      const fn = kit[el.dataset.chart];
      if (!fn || el.dataset.drawn) continue;
      try { fn(el, JSON.parse(el.dataset.chartData || 'null'), JSON.parse(el.dataset.chartOptions || '{}')); el.dataset.drawn = '1'; } catch (err) { console.error('[page] chart', el.dataset.chart, err); }
    }
  };
  drawCharts();

  // A table with a search box and a status filter; the count and the "nothing matches" line follow them.
  for (const scope of $$('[data-filter-scope]')) {
    const input = $('input[data-filter="search"]', scope);
    const rows = $$('[data-row]', scope);
    const none = $('[data-nomatch]', scope);
    const count = $('[data-filter-count]', scope);
    let status = 'all';
    const run = () => {
      const term = (input && input.value.trim().toLowerCase()) || '';
      let shown = 0;
      for (const r of rows) { const ok = (status === 'all' || r.dataset.status === status) && (!term || (r.dataset.search || r.textContent.toLowerCase()).includes(term)); r.hidden = !ok; if (ok) shown++; }
      if (none) none.hidden = shown > 0;
      if (count) count.textContent = (count.dataset.template || '{n}').replace('{n}', String(shown));
    };
    if (input) input.addEventListener('input', run);
    for (const f of $$('[data-filter="status"]', scope)) f.addEventListener('lt-change', (e) => { status = String((e.detail && e.detail.value) || 'all'); run(); });
    for (const v of $$('[data-filter-view]', scope)) v.addEventListener('click', (e) => { e.preventDefault(); status = v.dataset.filterView; for (const o of $$('[data-filter-view]', scope)) o.toggleAttribute('aria-current', o === v); run(); });
    const reset = $('[data-filter-reset]', scope);
    if (reset) reset.addEventListener('click', () => { if (input) { input.value = ''; input.focus(); } status = 'all'; run(); });
  }

  // A row's detail in a drawer (or an inspector pane): the row carries its fields as JSON.
  const detail = $('#detail');
  let opener = null;
  const fill = (host, d) => {
    const t = $('[data-detail-title]', host); if (t) t.textContent = d.title || '';
    const dl = $('[data-detail-list]', host);
    if (dl) dl.innerHTML = (d.fields || []).map((f) => '<div><dt></dt><dd></dd></div>').join('');
    if (dl) $$('div', dl).forEach((row, i) => { $('dt', row).textContent = d.fields[i][0]; $('dd', row).textContent = d.fields[i][1]; });
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open-detail]');
    if (!b) return;
    const d = JSON.parse(b.dataset.openDetail || '{}');
    const pane = $('[data-inspector]');
    if (pane) { fill(pane, d); for (const r of $$('[data-row]')) r.toggleAttribute('aria-selected', r.contains(b)); document.documentElement.dataset.pane = 'detail'; return; }
    if (!detail) return;
    opener = b; fill(detail, d);
    if (typeof detail.showModal === 'function') detail.showModal(); else detail.setAttribute('open', '');
  });
  if (detail) {
    const close = () => { detail.close(); if (opener) opener.focus(); };
    for (const b of $$('[data-part="close"], [data-part="close-foot"]', detail)) b.addEventListener('click', close);
    detail.addEventListener('click', (e) => { if (e.target === detail) close(); });
  }
  for (const b of $$('[data-pane-back]')) b.addEventListener('click', () => { const host = b.closest('[data-pane]') || document.documentElement; host.dataset.pane = 'list'; });

  // A save bar that appears after a change, and a quiet line when it is saved.
  for (const form of $$('form[data-savebar]')) {
    const bar = $('#' + form.dataset.savebar);
    const snap = () => JSON.stringify($$('input, select, textarea', form).map((i) => (i.type === 'checkbox' || i.type === 'radio' ? i.checked : i.value)));
    let saved = snap();
    const sync = () => { if (bar) bar.hidden = snap() === saved; };
    form.addEventListener('input', sync); form.addEventListener('change', sync);
    const discard = $('[data-discard]', form);
    if (discard) discard.addEventListener('click', () => { form.reset(); sync(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if ($$('input:invalid', form).length) { $$('input:invalid', form)[0].focus(); return; }
      $$('input', form).forEach((i) => { i.defaultValue = i.value; i.defaultChecked = i.checked; });
      saved = snap(); sync();
      const msg = $('[data-saved]'); if (msg) msg.textContent = msg.dataset.saved;
    });
  }

  // A running total: lines in the summary, a delivery choice, and every place the total is shown.
  const totalForm = $('form[data-total-form]');
  if (totalForm) {
    const sym = totalForm.dataset.currency || '£';
    const money = (n) => sym + n.toFixed(2);
    const sync = () => {
      const sub = $$('[data-line]').reduce((a, el) => a + Number(el.dataset.line), 0);
      const pick = $('input[name="ship"]:checked', totalForm);
      const free = Number(totalForm.dataset.freeOver || 0);
      let ship = pick ? Number(pick.value) : 0;
      if (free && sub >= free && pick && pick.dataset.standard != null) ship = 0;
      for (const el of $$('[data-ship-cost]')) el.textContent = ship ? money(ship) : (el.dataset.free || '0');
      for (const el of $$('[data-total]')) el.textContent = money(sub + ship);
    };
    totalForm.addEventListener('change', sync);
    const card = $('[data-card]', totalForm);
    if (card) card.addEventListener('input', () => { const d = card.value.replace(/\D/g, '').slice(0, 19); card.value = d.replace(/(.{4})(?=.)/g, '$1 '); });
    totalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const bad = $$('input[required]', totalForm).find((i) => !i.value.trim() || !i.checkValidity());
      if (bad) { bad.focus(); bad.dispatchEvent(new Event('blur')); return; }
      const msg = $('[data-sent]'); if (msg) msg.textContent = msg.dataset.sent;
    });
    sync();
  }

  // Steps of a sign-in or a set-up: each form moves to the next step when it is valid.
  const steps = $$('[data-step]');
  if (steps.length) {
    const show = (id) => { for (const s of steps) s.hidden = s.id !== id; const f = $('#' + id + ' input, #' + id + ' h1, #' + id + ' h2'); if (f) f.focus(); };
    for (const s of steps) {
      const f = $('form', s);
      if (f) f.addEventListener('submit', (e) => { e.preventDefault(); if ($$('input:invalid', f).length) { $$('input:invalid', f)[0].focus(); return; } const echo = $('[data-echo]', document); const src = $('input[type="email"]', f); if (echo && src) echo.textContent = src.value; if (s.dataset.next) show(s.dataset.next); });
      const otp = $('[data-lt="otp-input"]', s);
      if (otp) otp.addEventListener('lt-change', (e) => { if (e.detail && e.detail.complete && s.dataset.next) setTimeout(() => show(s.dataset.next), 400); });
    }
    for (const b of $$('[data-goto-step]')) b.addEventListener('click', () => show(b.dataset.gotoStep));
  }

  // Tags (a changelog) and views (a directory): a segmented control or chips show one kind at a time.
  for (const f of $$('[data-tag-filter]')) f.addEventListener('lt-change', (e) => { const v = String((e.detail && e.detail.value) || 'all'); for (const li of $$(f.dataset.tagFilter)) li.hidden = v !== 'all' && !String(li.dataset.tag || '').split(' ').includes(v); });

  // Monthly or yearly: prices and the note under them change together.
  for (const t of $$('[data-billing]')) t.addEventListener('lt-change', (e) => {
    const period = (e.detail && e.detail.value) === 'annual' ? 'annual' : 'monthly';
    for (const d of $$('data[data-monthly]')) d.textContent = d.dataset[period];
    for (const p of $$('[data-per-monthly]')) p.textContent = p.dataset[period === 'annual' ? 'perAnnual' : 'perMonthly'];
    const note = $('[data-billnote]'); if (note) note.textContent = note.dataset[period];
  });

  // Ninety days of uptime from a short list of bad days ("34:down,62:warn"), labelled for screen readers.
  for (const ol of $$('ol[data-days]')) {
    const words = { ok: ol.dataset.ok || 'working', warn: ol.dataset.warn || 'degraded', down: ol.dataset.down || 'outage' };
    const bad = new Map((ol.dataset.days || '').split(',').filter(Boolean).map((p) => p.split(':')).map(([d, s]) => [Number(d), s]));
    const today = new Date();
    ol.innerHTML = Array.from({ length: 90 }, (_, i) => { const s = bad.get(i) || 'ok'; const d = new Date(today.getTime() - (89 - i) * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); return '<li data-s="' + s + '"><span class="lt-visually-hidden">' + d + ': ' + words[s] + '</span></li>'; }).join('');
  }
  for (const form of $$('form[data-subscribe]')) {
    const input = $('input', form); const msg = $('[role="status"]', form);
    form.addEventListener('submit', (e) => { e.preventDefault(); if (!input.value.trim() || !input.checkValidity()) { msg.textContent = form.dataset.bad || ''; input.focus(); return; } msg.textContent = (form.dataset.good || '').replace('{email}', input.value.trim()); form.reset(); });
  }

  // A gallery: thumbnails choose the large picture.
  for (const thumbs of $$('[data-thumbs]')) thumbs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-shot]'); if (!b) return;
    for (const t of $$('button', thumbs)) t.setAttribute('aria-pressed', String(t === b));
    for (const s of $$('[data-stage] > *')) s.hidden = s.dataset.shot !== b.dataset.shot;
  });
  for (const b of $$('[data-say]')) b.addEventListener('click', (e) => { if (b.closest('form') && b.type === 'submit') e.preventDefault(); const t = $(b.dataset.sayTo || '[data-toast]'); if (t) { t.textContent = b.dataset.say; setTimeout(() => { t.textContent = ''; }, 3200); } });
  for (const f of $$('form[data-say-form]')) f.addEventListener('submit', (e) => { e.preventDefault(); const t = $(f.dataset.sayTo || '[data-toast]'); if (t) t.textContent = f.dataset.sayForm; });

  // A list and its reading pane: picking a row opens it; on a phone the pane replaces the list.
  for (const list of $$('[data-pick-list]')) list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    e.preventDefault();
    for (const o of $$('[data-pick]', list)) o.toggleAttribute('aria-current', o === b);
    for (const p of $$('[data-picked]')) p.hidden = p.dataset.picked !== b.dataset.pick;
    (b.closest('[data-pane]') || document.documentElement).dataset.pane = 'thread';
  });

  // An app's screens: side by side on a wide screen, one at a time on a phone. Tabs, [data-go] and ?screen=.
  const rail = $('[data-screens]');
  if (rail) {
    const frames = $$('[data-screen]', rail);
    const order = frames.map((f) => f.dataset.screen);
    const phone = matchMedia('(max-width: 599px)');
    let current = order.includes(q.get('screen')) ? q.get('screen') : (fromUrl && fromUrl !== 'ready' ? (rail.dataset.stateScreen || order[1] || order[0]) : order[0]);
    const mark = (id) => { for (const f of frames) f.toggleAttribute('data-current', f.dataset.screen === id); };
    const show = (id) => {
      const f = frames.find((x) => x.dataset.screen === id); if (!f) return;
      current = id; mark(id);
      if (!phone.matches) f.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', inline: 'start', block: 'nearest' });
      const h = $('h2[tabindex="-1"], h1[tabindex="-1"]', f); if (h) h.focus({ preventScroll: true });
    };
    const sync = () => { if (phone.matches) rail.removeAttribute('tabindex'); else rail.tabIndex = 0; for (const d of $$('.ap-device', rail)) d.toggleAttribute('data-contained', !phone.matches); };
    sync(); mark(current);
    phone.addEventListener('change', () => { sync(); mark(current); });
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('.ap-tabs a');
      const go = e.target.closest('[data-go]');
      if (tab) { e.preventDefault(); show(tab.getAttribute('href').replace('#screen-', '')); }
      else if (go && !e.defaultPrevented) { e.preventDefault(); show(go.dataset.go); }
    }, true);
    const step = (by) => show(order[Math.max(0, Math.min(order.length - 1, order.indexOf(current) + by))]);
    const prev = $('[data-screens-prev]'), next = $('[data-screens-next]');
    if (prev) prev.addEventListener('click', () => step(-1));
    if (next) next.addEventListener('click', () => step(1));
    for (const sheet of $$('dialog[data-sheet]')) {
      const open = $('[aria-controls="' + sheet.id + '"]');
      if (open) open.addEventListener('click', () => { if (typeof sheet.showModal === 'function') sheet.showModal(); });
      for (const c of $$('[data-part="cancel"]', sheet)) c.addEventListener('click', () => sheet.close());
    }
  }
})();
`;
