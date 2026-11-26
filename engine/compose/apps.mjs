// Drafts of app screens from the brief: a dashboard, an admin list, settings, an inbox, an assistant, an agent
// workspace, a desktop work app, a directory and a phone app planned as a flow. The product's records name
// the navigation, the columns and the views; rows are seeded sample data (scripts/sample-data.mjs) labelled
// with the brief's own nouns ("Booking #1040", "Client 03"), never invented customers. Every list ships its
// loading, empty and error states in the brief's words. The markup is the blueprints' own anatomy (dashboard,
// admin, settings, inbox, assistant, agent, workspace, directory, app-phone), so their page styles apply.
//
// Pure functions, no I/O.
import { esc, keepHyphens } from './draft.mjs';
import { motifFor, motifParts } from './bands.mjs';
import { plansFrom } from './model.mjs';
import { readList } from './words.mjs';
import { cap, icon, iconFor, badge, sampleRows, cellHtml, detailJson, statesHtml, sidebar, field, switchRow, segmented, money } from './ui.mjs';

const brand = (ctx) => ctx.product ?? (ctx.facts.kind ? cap(ctx.facts.kind) : 'Workspace');
const chart = (name, data, opts = {}, attrs = '') => `<div data-chart="${name}" data-chart-data="${esc(JSON.stringify(data))}" data-chart-options="${esc(JSON.stringify(opts))}"${attrs}></div>`;
const initials = (s) => String(s).split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/** Weekly counts and a breakdown for a record, from the kit's seeded series. */
function weekly(ctx, n = 12) {
  const s = ctx.sample('series', { points: n, period: 'week', base: 40, growth: 0.03 }) ?? [];
  return { x: s.map((p) => p.x), values: s.map((p) => p.value) };
}

// ---------------------------------------------------------------- dashboard
function dashboard(ctx) {
  const { m, flow, facts } = ctx;
  const rec = m.main, name = brand(ctx);
  const Many = cap(rec.many);
  const rows = sampleRows(rec, 16, ctx);
  const w = weekly(ctx);
  const moneyField = rec.fields.find((f) => f.kind === 'money');
  const statusField = rec.fields.find((f) => f.kind === 'status');
  const last = w.values.at(-1) ?? 0, prev = w.values.at(-2) ?? 0;
  const kpis = [
    { label: `${Many} this week`, value: last, previous: prev, spark: w.values },
    ...(moneyField ? [{ label: `${cap(moneyField.name)} total, this week`, value: Math.round(rows.slice(0, 8).reduce((a, r) => a + Number(r.cells[rec.fields.indexOf(moneyField)].v), 0)), previous: Math.round(rows.slice(8, 16).reduce((a, r) => a + Number(r.cells[rec.fields.indexOf(moneyField)].v), 0)), spark: w.values.map((v) => v * 37), fmt: { prefix: m.sym, compact: true } }] : []),
    ...(statusField ? m.status.list.slice(0, 2).map((s, k) => ({ label: `${s}`, value: rows.filter((r) => r.status === s).length, previous: rows.filter((r) => r.status === s).length + (k ? 1 : -1), spark: w.values.map((v, i) => Math.max(0, Math.round(v / (k ? 9 : 2)) + ((i * (k + 3)) % 4))) })) : []),
    ...m.records.slice(1, 3).map((r, k) => ({ label: `${cap(r.many)} this week`, value: Math.round(last * (k ? 0.4 : 0.7)), previous: Math.round(prev * (k ? 0.42 : 0.66)), spark: w.values.map((v) => Math.round(v * (k ? 0.4 : 0.7))) })),
  ].slice(0, 5);
  const breakdownBy = statusField ?? rec.fields.find((f) => f.kind === 'name' && f !== rec.fields[0]) ?? null;
  const idx = breakdownBy ? rec.fields.indexOf(breakdownBy) : -1;
  const counts = new Map();
  if (idx >= 0) for (const r of rows) counts.set(r.cells[idx].text, (counts.get(r.cells[idx].text) ?? 0) + 1);
  const bars = [...counts].map(([label, value]) => ({ label, value })).slice(0, 6);
  ctx.charts.add('kpi-card'); ctx.charts.add('multi-line-chart'); if (bars.length) ctx.charts.add('horizontal-bar-chart');
  ctx.todo.push(`connect ${name}'s real ${rec.many}: the figures, chart and rows are seeded sample data labelled with your nouns`);
  const th = rec.fields.map((f) => `<th scope="col"${['money', 'count'].includes(f.kind) ? ' data-num' : ''} aria-sort="none"><button type="button" data-sort="${esc(f.name)}"${['money', 'count'].includes(f.kind) ? ' data-type="number"' : ''}>${esc(cap(f.name))}<span data-part="sort" aria-hidden="true"></span></button></th>`).join('');
  const body = `<div class="bp-app">
    ${sidebar(ctx, { current: 0 })}
    <div class="bp-app-main">
      <header class="bp-topbar">
        <div class="lt-search" data-lt="search-input" data-shortcut="k">
          ${icon('search')}<label class="lt-visually-hidden" for="dash-search">${esc(`Search ${m.records.map((r) => r.many).join(', ')}`)}</label>
          <input id="dash-search" type="search" placeholder="${esc(`Search ${m.records.slice(0, 2).map((r) => r.many).join(', ')}…`)}" autocomplete="off" spellcheck="false">
          <button type="button" data-part="clear" aria-label="Clear search" hidden>${icon('x', 14)}</button>
          <kbd data-part="shortcut" aria-hidden="true"><span data-part="mod">⌘</span>K</kbd>
        </div>
        <a class="lt-btn" data-variant="primary" href="#main">${icon('plus')}<span data-part="label">${esc(flow.newOne)}</span></a>
      </header>
      <main id="main" class="bp-dash">
        <div class="bp-dash-head">
          <div><h1 class="lt-h2">Overview</h1><p class="lt-secondary">${esc(`${Many}, last 12 weeks`)}</p></div>
          <a href="#main" class="lt-btn" data-variant="secondary">${icon('download')}<span data-part="label">Export</span></a>
        </div>
        <section class="bp-kpis" aria-labelledby="bp-kpi-h" data-view="ready" data-count="${kpis.length}">
          <h2 id="bp-kpi-h" class="lt-visually-hidden">Key figures</h2>
          ${kpis.map((k) => chart('kpi-card', { label: k.label, value: k.value, previous: k.previous, spark: k.spark }, { size: 'compact', ...(k.fmt ? { format: k.fmt } : {}) }, ' data-chart-slot="kpi"')).join('\n          ')}
        </section>
        <section class="bp-main" aria-label="Charts" data-view="ready"${bars.length ? '' : ' data-one'}>
          <div class="bp-card" data-chart-slot>${chart('multi-line-chart', { x: w.x, series: [{ name: Many, values: w.values }] }, { title: `${Many} per week`, subtitle: 'Sample data until it is connected', height: 300 })}</div>
          ${bars.length ? `<div class="bp-card" data-chart-slot>${chart('horizontal-bar-chart', bars, { title: `${Many} by ${breakdownBy.name.toLowerCase()}`, subtitle: 'Last 16' })}</div>` : ''}
        </section>
        <section class="bp-card bp-accounts" aria-labelledby="t-h" data-view="ready">
          <header class="bp-card-head"><h2 class="bp-card-title" id="t-h">${esc(`Latest ${rec.many}`)}</h2><p class="lt-secondary">${esc(`${rows.length} ${rec.many}`)}</p></header>
          <div class="lt-table-wrap bp-table" data-lt="data-table" tabindex="0" role="region" aria-label="${esc(`${Many} table`)}">
            <table class="lt-table">
              <caption class="lt-visually-hidden">${esc(`${Many}: sample rows until ${name} is connected. Column headers sort the table.`)}</caption>
              <thead><tr>${th}</tr></thead>
              <tbody>${rows.map((r) => `<tr data-row>${r.cells.map(cellHtml).join('')}</tr>`).join('')}</tbody>
            </table>
          </div>
        </section>
        <div class="bp-loading" data-view="loading" aria-busy="true" aria-label="${esc(flow.states.loading.label)}" hidden>
          <div class="bp-kpis bp-skel-kpis">${kpis.map(() => '<span class="lt-skeleton"></span>').join('')}</div>
          <div class="bp-main"><span class="lt-skeleton bp-skel-chart"></span><span class="lt-skeleton bp-skel-chart"></span></div>
        </div>
        ${statesHtml(flow, { cls: 'bp-error', id: 'dash' }).replace(/^<div[\s\S]*?<\/div>\s*/, '')}
      </main>
    </div>
  </div>`;
  return { body, title: `Overview · ${name}`, desc: `${Many} at a glance in ${name}.`, css: 'dashboard' };
}

// ---------------------------------------------------------------- admin list
function admin(ctx) {
  const { m, flow } = ctx;
  const rec = m.main, name = brand(ctx), Many = cap(rec.many);
  const rows = sampleRows(rec, 12, ctx);
  const statuses = m.status.list;
  ctx.todo.push(`connect the real ${rec.many}: the rows are seeded sample data labelled with your nouns`);
  const id0 = rec.fields[0];
  const th = rec.fields.map((f, k) => `<th scope="col"${['money', 'count'].includes(f.kind) ? ' data-num' : ''}>${esc(cap(f.name))}</th>`).join('');
  const tr = rows.map((r) => `        <tr data-row data-status="${esc((r.status ?? '').toLowerCase())}" data-search="${esc(r.search)}">
          <td><label class="lt-check"><input type="checkbox" aria-label="${esc(`Select ${r.title}`)}"><span data-part="box" aria-hidden="true">${icon('check', 12)}</span></label></td>
          <td><button type="button" class="ad-person" data-open-detail="${detailJson(rec, r)}"><span class="ad-avatar" aria-hidden="true">${icon(iconFor(rec.many), 14)}</span><span><strong>${esc(r.cells[0].text)}</strong>${r.cells[1] && r.cells[1].kind !== 'status' ? `<span>${esc(r.cells[1].text)}</span>` : ''}</span></button></td>
          ${r.cells.slice(r.cells[1] && r.cells[1].kind !== 'status' ? 2 : 1).map(cellHtml).join('')}
        </tr>`).join('\n');
  const headCells = rec.fields.slice(rec.fields[1] && rec.fields[1].kind !== 'status' ? 2 : 1).map((f) => `<th scope="col"${['money', 'count'].includes(f.kind) ? ' data-num' : ''}>${esc(cap(f.name))}</th>`).join('');
  const body = `<div class="ad-shell">
    <nav class="ad-side" aria-label="${esc(name)}">
      <a class="ad-brand" href="#main">${esc(name)} <span>Admin</span></a>
      ${(m.records.length ? m.records : [rec]).slice(0, 5).map((r, k) => `<a href="#main"${k === 0 ? ' aria-current="page"' : ''}>${icon(iconFor(r.many), 18)}<span>${esc(cap(r.many))}</span></a>`).join('')}<a href="#main">${icon('gear', 18)}<span>Settings</span></a>
    </nav>
    <main id="main" class="ad-main" data-filter-scope>
      <header class="ad-head">
        <div><h1 class="lt-h2">${esc(Many)}</h1><p class="lt-secondary" data-filter-count data-template="${esc(`{n} ${rec.many} shown`)}">${esc(`${rows.length} ${rec.many} shown`)}</p></div>
        <button type="button" class="lt-btn" data-variant="primary">${icon('plus')}<span data-part="label">${esc(flow.newOne)}</span></button>
      </header>
      <div class="ad-tools" data-view="ready">
        <div class="lt-search ad-search" data-lt="search-input">
          ${icon('search')}<label class="lt-visually-hidden" for="ad-q">${esc(`Search ${rec.many}`)}</label>
          <input id="ad-q" type="search" data-filter="search" placeholder="${esc(`Search ${rec.many}`)}" autocomplete="off" spellcheck="false">
          <button type="button" data-part="clear" aria-label="Clear search" hidden>${icon('x', 14)}</button>
        </div>
        ${statuses.length >= 2 ? segmented('Status', [{ value: 'all', label: 'All' }, ...statuses.slice(0, 4).map((s) => ({ value: s.toLowerCase(), label: s }))], { id: 'ad-status', attrs: ' data-filter="status"' }) : ''}
      </div>
      <div class="lt-bulk ad-table" data-lt="bulk-action-bar" data-view="ready">
        <div class="lt-table-wrap" tabindex="0" role="region" aria-label="${esc(`${Many} table, scrolls horizontally`)}">
        <table data-part="table" class="lt-table">
          <caption class="lt-visually-hidden">${esc(`${Many}: sample rows until ${name} is connected`)}</caption>
          <thead><tr><th scope="col"><label class="lt-check"><input type="checkbox" data-part="all" aria-label="${esc(`Select all ${rec.many} on this page`)}"><span data-part="box" aria-hidden="true">${icon('check', 12)}</span></label></th><th scope="col">${esc(cap(id0.name))}</th>${headCells}</tr></thead>
          <tbody>
${tr}
          </tbody>
        </table>
        </div>
        <p class="ad-nomatch" data-nomatch hidden>${esc(`No ${rec.many} match.`)} <button type="button" class="bp-link" data-filter-reset>Clear the search</button></p>
        <div data-part="bar" role="region" aria-label="Bulk actions" hidden>
          <span data-part="count" aria-live="polite">0 selected</span>
          <span data-part="sep" aria-hidden="true"></span>
          <button type="button" data-action="export">${icon('download')}<span>Export</span></button>
          <button type="button" data-action="archive" data-tone="danger">${icon('trash')}<span>Archive</span></button>
          <button type="button" data-part="clear" aria-label="Clear selection">${icon('x')}</button>
        </div>
      </div>
      ${statesHtml(flow, { cls: 'ad-state', id: 'ad', skeleton: `<table class="lt-table ad-skel"><caption class="lt-visually-hidden">${esc(flow.states.loading.label)}</caption><tbody>${Array.from({ length: 6 }, () => `<tr><td><span class="lt-skeleton" style="width: 16px"></span></td><td><span class="lt-skeleton" style="width: 62%"></span></td><td><span class="lt-skeleton" style="width: 40%"></span></td><td><span class="lt-skeleton" style="width: 50%"></span></td></tr>`).join('')}</tbody></table>` })}
    </main>
  </div>
  <dialog class="lt-drawer" id="detail" aria-labelledby="detail-h">
    <header data-part="head"><h2 id="detail-h" data-detail-title>${esc(cap(rec.one))}</h2><button type="button" data-part="close" aria-label="Close details">${icon('x')}</button></header>
    <div data-part="body"><dl class="ad-dl" data-detail-list></dl></div>
    <footer data-part="foot"><button type="button" class="lt-btn" data-variant="ghost" data-part="close-foot"><span data-part="label">Close</span></button></footer>
  </dialog>`;
  return { body, title: `${Many} · ${name}`, desc: `Every ${rec.one} in ${name}, with search and a status filter.`, css: 'admin' };
}

// ---------------------------------------------------------------- settings
function settings(ctx) {
  const { m, facts } = ctx;
  const name = brand(ctx);
  const recs = m.records.filter((r) => r.fromBrief).slice(0, 3);
  const given = (facts.lists ?? []).find((l) => /^(notifications?|alerts?|emails?)$/.test(l.label))?.items ?? [];
  const notes = given.length ? given.map((g) => [cap(g), null]) : recs.length ? recs.map((r) => [`New ${r.many}`, `When a ${r.one} is added`]) : [];
  if (!notes.length) ctx.todo.push('what people want to be told about (each becomes a switch under Notifications)');
  const plan = plansFrom(facts, { product: ctx.product })[0] ?? null;
  const people = facts.people;
  if (!people.length) ctx.todo.push('the people on the team, with their roles, if the settings manage a team');
  const sections = [
    ['profile', 'Profile', 'user', `How you appear in ${name}.`, `<div class="st-fields lt-form-demo" data-lt="text-field">
              ${field({ id: 'st-name', label: 'Full name', auto: 'name', extra: ' minlength="2"' })}
              ${field({ id: 'st-email', label: 'Email', type: 'email', auto: 'email', help: `${name} writes to this address.` })}
            </div>`],
    notes.length ? ['notifications', 'Notifications', 'bell', 'Choose what reaches you.', `<div class="st-switches">${notes.map(([l, s], k) => switchRow(`n${k}`, l, s, k < 2)).join('')}</div>`] : null,
    people.length ? ['team', 'Team', 'users', `Everyone who can sign in to ${name}.`, `<ul class="st-team">${people.map((p) => `<li><span class="ad-avatar" aria-hidden="true">${esc(initials(p.name))}</span><span><strong>${esc(p.name)}</strong><span>${esc(p.role ?? '')}</span></span></li>`).join('')}</ul>`] : null,
    plan && plan.price ? ['plan', 'Plan', 'card', 'What you pay.', `<dl class="lt-dl"><div><dt>Plan</dt><dd>${esc(`${plan.name === ctx.product ? '' : `${plan.name} · `}${plan.price}${plan.per ? ` a ${plan.per}` : ''}`)}</dd></div></dl>`] : null,
    ['danger', 'Leave', 'trash', 'This cannot be undone.', `<div class="st-danger-row lt-dialog-demo" data-lt="modal-dialog"><div><strong>${esc(`Delete your ${name} account`)}</strong><p>${esc(`Removes your account${recs[0] ? ` and its ${recs[0].many}` : ''}.`)}</p></div><button type="button" class="lt-btn" data-variant="destructive" data-part="open">${icon('trash')}<span data-part="label">Delete account</span></button>
              <dialog class="lt-modal" aria-labelledby="del-h" aria-describedby="del-d"><form method="dialog"><div data-part="body"><span data-part="icon" aria-hidden="true">${icon('alert', 20)}</span><div><h2 id="del-h">${esc(`Delete your ${name} account?`)}</h2><p id="del-d">${esc(`You lose access at once${recs[0] ? `, with your ${recs[0].many}` : ''}.`)}</p></div></div><div data-part="foot"><button type="submit" class="lt-btn" data-variant="ghost" value="cancel"><span data-part="label">Keep my account</span></button><button type="submit" class="lt-btn" data-variant="destructive" value="confirm"><span data-part="label">Delete account</span></button></div></form></dialog>
            </div>`],
  ].filter(Boolean);
  const body = `<div class="st-wrap bp-container">
    <header class="st-head"><h1 class="lt-h2">Settings</h1><p class="lt-secondary">${esc(`Your profile${notes.length ? ', what you hear about' : ''}${people.length ? ' and the team' : ''} in ${name}.`)}</p></header>
    <div class="st-layout">
      <nav class="st-nav" aria-label="Settings sections">
        ${sections.map(([id, label, ic], k) => `<a href="#${id}"${k === 0 ? ' aria-current="true"' : ''}>${icon(ic)}${esc(label)}</a>`).join('\n        ')}
      </nav>
      <main id="main">
        <form class="st-form" id="settings" data-savebar="savebar" novalidate>
${sections.map(([id, label, , lede, inner]) => `          <section class="st-section${id === 'danger' ? ' st-danger' : ''}" id="${id}" aria-labelledby="s-${id}">
            <div class="st-section-head"><h2 id="s-${id}">${esc(label)}</h2><p>${esc(lede)}</p></div>
            ${inner}
          </section>`).join('\n')}
          <div class="st-savebar" id="savebar" role="region" aria-label="Unsaved changes" hidden>
            <span>${icon('info')}You have unsaved changes</span>
            <div class="bp-row"><button type="button" class="lt-btn" data-variant="ghost" data-discard><span data-part="label">Discard</span></button><button type="submit" class="lt-btn" data-variant="primary"><span data-part="label">Save changes</span></button></div>
          </div>
          <p class="st-saved" role="status" data-saved="Saved."></p>
        </form>
      </main>
    </div>
  </div>`;
  return { body, title: `Settings · ${name}`, desc: `Settings for ${name}.`, css: 'settings' };
}

// ---------------------------------------------------------------- inbox
function inbox(ctx) {
  const { m, flow, facts } = ctx;
  const name = brand(ctx);
  // What the conversations are about: the brief's topics ("about bookings, cancellations and payments"), else its records.
  const topics = (facts.lists ?? []).find((l) => /^(about|topics?|conversations?)$/.test(l.label))?.items ?? m.records.filter((r) => r.fromBrief && r.many !== 'conversations').map((r) => r.many);
  const subject = m.records.find((r) => r.many !== 'conversations' && r.fromBrief) ?? null;
  const n = 7;
  const subj = (i) => { const t = topics[i % (topics.length || 1)]; const ref = 1040 - i; return t ? `${cap(subject && t === subject.many ? subject.one : t.replace(/s$/, ''))} #${ref}` : `Conversation #${ref}`; };
  ctx.todo.push('connect the real conversations: the list is seeded sample rows ("Customer 01") labelled with your topics');
  if (!topics.length) ctx.todo.push('what people write in about (for example "conversations about bookings, cancellations and payments")');
  const convs = Array.from({ length: n }, (_, i) => ({ who: `Customer ${String(i + 1).padStart(2, '0')}`, subject: subj(i), when: ['09:41', '09:12', 'Yesterday', 'Yesterday', 'Mon', 'Mon', 'Fri'][i], unread: i < 2 }));
  const views = ['Open', 'Assigned to me', 'Closed'];
  const c0 = convs[0];
  const recFields = subject ? sampleRows(subject, 1, ctx)[0] : null;
  const body = `<div class="ib-shell" data-pane="list" data-filter-scope>
    <nav class="ib-nav" id="ib-nav" aria-label="Views">
      <a class="ib-brand" href="#main">${esc(name)} <span>Inbox</span></a>
      <ul>${views.map((v, k) => `<li><a href="#main"${k === 0 ? ' aria-current="page"' : ''}>${icon(k === 2 ? 'check' : k === 1 ? 'user' : 'inbox')}<span>${esc(v)}</span>${k === 0 ? `<b>${n}</b>` : ''}</a></li>`).join('')}</ul>
      ${topics.length ? `<h2>Topics</h2><ul>${topics.slice(0, 4).map((t) => `<li><a href="#main">${icon('folder')}<span>${esc(cap(t))}</span></a></li>`).join('')}</ul>` : ''}
    </nav>
    <main id="main" class="ib-main">
    <section class="ib-list" aria-labelledby="ib-list-h">
      <header>
        <h1 id="ib-list-h">Open <span>${n}</span></h1>
        <button type="button" class="ib-icon" aria-label="New conversation">${icon('plus')}</button>
      </header>
      <label class="ib-search">${icon('search')}<span class="lt-visually-hidden">Search conversations</span><input type="search" data-filter="search" placeholder="Search people and subjects"></label>
      <ul class="ib-convs" data-view="ready" data-pick-list>${convs.map((c, i) => `<li data-row data-search="${esc(`${c.who} ${c.subject}`.toLowerCase())}"><a href="#main" data-pick="c${i}"${i === 0 ? ' aria-current="true"' : ''}${c.unread ? ' data-unread' : ''}><span class="ib-avatar" aria-hidden="true">${esc(c.who.slice(-2))}</span><span class="ib-who">${esc(c.who)}</span><time>${esc(c.when)}</time><span class="ib-subj">${c.unread ? '<span class="lt-visually-hidden">Unread: </span>' : ''}${esc(c.subject)}</span><span class="ib-snip">${esc(`A question about ${c.subject.toLowerCase()}.`)}</span></a></li>`).join('')}</ul>
      <p class="ib-nomatch" data-nomatch hidden>Nothing matches that search.</p>
      <ul class="ib-convs" data-view="loading" aria-busy="true" aria-label="${esc(flow.states.loading.label)}" hidden>${Array.from({ length: 5 }, () => '<li><a><span class="lt-skeleton" style="width: 36px; height: 36px; border-radius: 50%"></span><span class="lt-skeleton" style="width: 60%"></span></a></li>').join('')}</ul>
      <div class="ib-zero" data-view="error" hidden><p><b>${esc(flow.states.error.title)}</b>${esc(flow.states.error.body)} </p><p><button type="button" class="lt-btn" data-variant="secondary" data-size="sm" data-set-state="ready"><span data-part="label">${esc(flow.states.error.action)}</span></button></p></div>
      <div class="ib-zero" data-view="empty" hidden><p><b>${esc(flow.states.empty.title)}</b>${esc(`New conversations about ${topics.slice(0, 2).join(' and ') || name} land here.`)}</p></div>
    </section>
    <div class="ib-thread">
      <div class="ib-convs-wrap" data-view="ready">${convs.map((c, i) => `<div class="ib-conv" data-picked="c${i}"${i ? ' hidden' : ''}>
        <header class="ib-thread-head">
          <button type="button" class="ib-icon ib-back" data-pane-back aria-label="Back to conversations">${icon('back')}</button>
          <div><h2>${esc(c.subject)}</h2><p>${esc(c.who)}</p></div>
          ${badge(i < 2 ? 'Open' : 'Waiting', { dot: false })}
        </header>
        <div class="ib-scroll">
          <section class="lt-chat" aria-label="${esc(`Conversation with ${c.who}`)}">
            <ol data-part="log" role="log" aria-live="polite">
              <li data-part="group" data-from="them">
                <span data-part="avatar" aria-hidden="true">${esc(c.who.slice(-2))}</span>
                <div data-part="stack">
                  <p data-part="meta"><strong>${esc(c.who)}</strong> <time>${esc(c.when)}</time></p>
                  <p data-part="bubble">${esc(`A question about ${c.subject.toLowerCase()}.`)}</p>
                </div>
              </li>
            </ol>
          </section>
        </div>
        <div class="ib-dock">
          <form class="lt-composer" data-lt="prompt-composer" aria-label="Reply">
            <label for="ib-input-${i}" class="lt-visually-hidden">${esc(`Reply to ${c.who}`)}</label>
            <textarea id="ib-input-${i}" rows="2" placeholder="${esc(`Write a reply to ${c.who}`)}" maxlength="5000"></textarea>
            <div data-part="bar">
              <span data-part="hint"><kbd class="lt-kbd">⌘</kbd><kbd class="lt-kbd">↵</kbd> to send</span>
              <button type="submit" data-part="send" aria-label="Send reply" disabled>${icon('send')}</button>
            </div>
          </form>
        </div>
      </div>`).join('\n      ')}</div>
      <div class="ib-none" data-view="empty loading error" hidden><p>Pick a conversation on the left to read it.</p></div>
    </div>
    </main>
    <aside class="ib-side" id="ib-side" aria-label="Details">
      <header><span class="ib-avatar ib-avatar-lg" aria-hidden="true">${esc(c0.who.slice(-2))}</span><div><h2>${esc(c0.who)}</h2><p>Customer</p></div></header>
      ${recFields ? `<dl class="ib-facts">${subject.fields.map((f, k) => `<div><dt>${esc(cap(f.name))}</dt><dd>${esc(recFields.cells[k].text)}</dd></div>`).join('')}</dl>` : ''}
    </aside>
  </div>`;
  return { body, title: `Inbox · ${name}`, desc: `Conversations with ${name}'s customers.`, css: 'inbox' };
}

// ---------------------------------------------------------------- assistant
function assistant(ctx) {
  const { m, facts } = ctx;
  const name = brand(ctx);
  const about = (facts.lists ?? []).find((l) => /^(about|questions)$/.test(l.label))?.items ?? m.records.filter((r) => r.fromBrief).map((r) => r.many);
  const answers = /\banswers?\s+questions\s+about\s+(.+)$/i.exec(facts.brief ?? '');
  const topics = answers ? readList(answers[1]) : about;
  if (!topics.length) ctx.todo.push('what people ask the assistant about (each becomes a suggestion in the empty state)');
  const asks = topics.slice(0, 3).map((t) => `Summarise my ${t} for this month`);
  const body = `<div class="as-shell">
    <aside class="as-rail" id="as-rail" aria-label="Conversations">
      <div class="as-rail-head"><a class="as-brand" href="#main">${esc(name)} <span>Assistant</span></a></div>
      <button type="button" class="lt-btn as-new" data-variant="secondary">${icon('plus')}<span data-part="label">New chat</span></button>
      <nav class="as-history" aria-label="History"><h2>Today</h2><ul><li><a href="#main" aria-current="page">New chat</a></li></ul></nav>
    </aside>
    <main id="main" class="as-main">
      <header class="as-top"><h1>${esc(`Ask ${name}`)}</h1></header>
      <div class="as-scroll">
        <section class="as-empty" aria-labelledby="as-empty-h">
          <h2 id="as-empty-h">What do you want to know?</h2>
          <p>${esc(topics.length ? `Ask about your ${topics.slice(0, -1).join(', ')}${topics.length > 1 ? ' or ' : ''}${topics.at(-1)}. Each answer says where its numbers came from.` : `Ask ${name} a question. Each answer says where its numbers came from.`)}</p>
          ${asks.length ? `<ul>${asks.map((a) => `<li><button type="button" data-suggest>${esc(a)}</button></li>`).join('')}</ul>` : ''}
        </section>
        <div class="lt-callout" data-tone="negative" data-view="error" role="alert" hidden><span data-part="icon">${icon('alert')}</span><div><strong>The answer did not finish</strong><p>${esc(`${name} lost the connection. Your question is kept below.`)}</p><p><button type="button" class="lt-btn" data-variant="secondary" data-size="sm" data-set-state="ready"><span data-part="label">Try again</span></button></p></div></div>
      </div>
      <div class="as-dock">
        <form class="lt-composer" data-lt="prompt-composer" data-enter="send" aria-label="Message">
          <label for="as-input" class="lt-visually-hidden">Message</label>
          <textarea id="as-input" rows="1" placeholder="${esc(topics.length ? `Ask about your ${topics.slice(0, 2).join(' or ')}` : `Ask ${name}`)}" maxlength="4000"></textarea>
          <div data-part="bar">
            <span data-part="hint">Enter to send, Shift+Enter for a new line</span>
            <button type="submit" data-part="send" aria-label="Send" disabled>${icon('send')}</button>
          </div>
        </form>
        <p class="as-note">${esc(`${name} can be wrong. Check a number at its source before you act on it.`)}</p>
      </div>
    </main>
  </div>`;
  return { body, title: `Assistant · ${name}`, desc: `Ask ${name} about your ${topics.join(', ') || 'work'}.`, css: 'assistant' };
}

// ---------------------------------------------------------------- agent workspace
function agent(ctx) {
  const { facts } = ctx;
  const name = brand(ctx);
  const projects = (facts.lists ?? []).find((l) => /^(projects?|repos?|repositories)$/.test(l.label))?.items ?? [];
  if (!projects.length) ctx.todo.push('the projects sessions are grouped by (the draft shows one, named after the product)');
  const groups = (projects.length ? projects : [name]).slice(0, 3);
  const steps = facts.steps.length ? facts.steps.map(cap) : [];
  if (!steps.length) ctx.todo.push('what a session does, step by step (it becomes the plan shown while it runs)');
  const body = `<div class="ag-shell">
    <aside class="ag-side" aria-label="Sessions">
      <div class="ag-side-top"><a class="ag-brand" href="#main">${esc(name)}</a></div>
      <button type="button" class="lt-btn" data-variant="secondary">${icon('plus')}<span data-part="label">New session</span></button>
      <nav class="ag-sessions ag-groups" aria-label="Sessions by project">
        ${groups.map((g) => `<section aria-label="${esc(cap(g))}"><h2>${esc(cap(g))}</h2><ul><li><a href="#main">${icon('terminal')}<span>${esc(`New session in ${g}`)}</span></a></li></ul></section>`).join('\n        ')}
      </nav>
    </aside>
    <main id="main" class="ag-main">
      <section class="ag-home" aria-labelledby="ag-h">
        <h1 id="ag-h" class="lt-h2">${esc(`What should ${name} do?`)}</h1>
        <form class="lt-composer" data-lt="prompt-composer" aria-label="Describe the task">
          <label for="ag-input" class="lt-visually-hidden">Describe the task</label>
          <textarea id="ag-input" rows="3" placeholder="Describe the change, in a sentence or two" maxlength="4000"></textarea>
          <div data-part="bar"><span data-part="hint">Enter to start</span><button type="submit" data-part="send" aria-label="Start" disabled>${icon('send')}</button></div>
        </form>
        ${steps.length ? `<section class="ag-list" aria-labelledby="ag-plan-h"><h2 id="ag-plan-h">${esc(`How ${name} works through a task`)}</h2><ol class="ag-plan">${steps.map((st, k) => `<li class="ag-planstep"><span class="ag-n">${k + 1}</span><span>${esc(st)}</span></li>`).join('')}</ol></section>` : ''}
      </section>
    </main>
  </div>`;
  return { body, title: `${name}`, desc: `${name}: sessions, a task box and the plan.`, css: 'agent' };
}

// ---------------------------------------------------------------- directory
function directory(ctx) {
  const { facts, m } = ctx;
  const name = brand(ctx);
  const list = (facts.lists ?? []).find((l) => !/^(categories|tags|filters|status|statuses)$/.test(l.label) && l.items.length >= 3);
  const cats = (facts.lists ?? []).find((l) => /^(categories|tags|filters|types|teams)$/.test(l.label))?.items ?? [];
  const what = list && /s$/.test(list.label) && !/^(includes|tracks|lists|about)$/.test(list.label) ? list.label : m.main.many;
  if (!list) ctx.todo.push(`the ${what} in the directory, by name, with one line each`);
  else ctx.todo.push(`one line under each of the ${list.items.length} ${what}: what it is for`);
  if (!cats.length) ctx.todo.push('the categories people filter by');
  const items = list?.items ?? [];
  const tones = ['', 'accent', 'dark'];
  const cards = items.map((it, k) => { const mp = motifParts(motifFor(it, ctx, null, { item: true }) ?? motifFor(`${it} ${what}`, ctx) ?? 'document'); return `<li class="dir-card" data-row data-search="${esc(it.toLowerCase())}"><a href="#main"><figure class="lt-art"${tones[k % 3] ? ` data-tone="${tones[k % 3]}"` : ''}${mp.attr} data-ratio="3/2" data-shot="none">${mp.svg}<figcaption class="lt-visually-hidden">${esc(cap(it))}</figcaption></figure><h2>${keepHyphens(esc(cap(it)))}</h2></a></li>`; }).join('');
  const body = `<header class="dir-top bp-container"><a class="dir-brand" href="#main">${esc(name)}</a></header>
  <main id="main" class="bp-container dir" data-filter-scope>
    <header class="dir-head">
      <h1 class="lt-h1">${keepHyphens(esc(`${cap(what)} in ${name}`))}</h1>
      ${items.length ? `<p class="lt-lede">${esc(`${items.length} ${what}. Search by name.`)}</p>` : ''}
      <div class="lt-search dir-search" data-lt="search-input" data-shortcut="k">
        ${icon('search')}<label class="lt-visually-hidden" for="dir-q">${esc(`Search ${what}`)}</label>
        <input id="dir-q" type="search" data-filter="search" placeholder="${esc(`Search ${what}`)}" autocomplete="off" spellcheck="false">
        <button type="button" data-part="clear" aria-label="Clear search" hidden>${icon('x', 14)}</button>
        <kbd data-part="shortcut" aria-hidden="true"><span data-part="mod">⌘</span>K</kbd>
      </div>
    </header>
    ${cats.length ? `<div class="dir-tools"><div class="dir-pills" role="group" aria-label="Filter by category"><button type="button" aria-pressed="true">All</button>${cats.map((c) => `<button type="button" aria-pressed="false">${esc(cap(c))}</button>`).join('')}</div></div>` : ''}
    <ul class="dir-grid" data-cols="${items.length % 3 === 0 || items.length === 5 ? 3 : items.length % 4 === 0 ? 4 : 2}">${cards}</ul>
    <section class="lt-empty dir-empty" data-nomatch aria-labelledby="empty-h" hidden>
      <span data-part="icon" aria-hidden="true">${icon('search', 24)}</span>
      <h3 id="empty-h">${esc(`No ${what} match that search`)}</h3>
      <p>Try a shorter word.</p>
      <div data-part="actions"><button type="button" class="lt-btn" data-variant="secondary" data-filter-reset><span data-part="label">Clear the search</span></button></div>
    </section>
  </main>`;
  return { body, title: `${cap(what)} · ${name}`, desc: `${cap(what)} in ${name}.`, css: 'directory' };
}

// ---------------------------------------------------------------- desktop work app
function workspace(ctx) {
  const { m, flow } = ctx;
  const rec = m.main, name = brand(ctx), Many = cap(rec.many);
  const rows = sampleRows(rec, 14, ctx, { named: true });
  ctx.todo.push(`connect the real ${rec.many}: the rows are made-up samples in your nouns, marked data-sample`);
  const th = rec.fields.map((f) => `<th scope="col"${['money', 'count'].includes(f.kind) ? ' data-num' : ''} aria-sort="none"><button type="button" data-sort="${esc(f.name)}"${['money', 'count'].includes(f.kind) ? ' data-type="number"' : ''}>${esc(cap(f.name))}<span data-part="sort" aria-hidden="true"></span></button></th>`).join('');
  const first = rows[0];
  const body = `<div class="ws" id="ws" data-filter-scope>
    <aside class="lt-sidebar" data-lt="app-sidebar" aria-label="Views">
      <div data-part="head"><span data-part="ws" aria-hidden="true">${esc(name[0])}</span><span data-part="ws-name">${esc(name)}</span><button type="button" data-part="collapse" aria-expanded="true" aria-label="Collapse sidebar">${icon('back')}</button></div>
      <nav aria-label="Saved views">
        <ul>
          <li><a href="#main" data-filter-view="all" aria-current="page">${icon(iconFor(rec.many), 18)}<span>${esc(`All ${rec.many}`)}</span><em data-part="count">${rows.length}</em></a></li>
          ${m.status.list.slice(0, 4).map((s) => `<li><a href="#main" data-filter-view="${esc(s.toLowerCase())}">${icon('folder', 18)}<span>${esc(s)}</span><em data-part="count">${rows.filter((r) => r.status === s).length}</em></a></li>`).join('\n          ')}
        </ul>
      </nav>
    </aside>
    <div class="lt-resizer ws-r1" data-lt="pane-resizer" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Resize the sidebar" aria-valuemin="200" aria-valuemax="320" aria-valuenow="232" data-var="--lt-sidebar-w" data-edge="start" data-target="#ws"><span data-part="grip"></span></div>
    <main class="ws-main" id="main">
      <header class="ws-bar"><div class="ws-title"><h1>${esc(Many)}</h1><p>${esc(name)}</p></div><button type="button" class="lt-btn" data-variant="primary">${icon('plus')}<span data-part="label">${esc(flow.newOne)}</span></button></header>
      <div class="ws-filters" role="toolbar" aria-label="Filters">
        <label class="ws-find">${icon('search')}<span class="lt-visually-hidden">${esc(`Filter ${rec.many}`)}</span><input type="search" data-filter="search" placeholder="${esc(`Filter ${rec.many}`)}" autocomplete="off" spellcheck="false"></label>
        <p class="ws-count" role="status" data-filter-count data-template="${esc(`{n} ${rec.many}`)}">${esc(`${rows.length} ${rec.many}`)}</p>
      </div>
      <section class="ws-table-area" aria-label="${esc(Many)}" tabindex="-1">
        <div class="lt-table-wrap ws-table" data-lt="data-table" data-view="ready" role="region" aria-label="${esc(`${Many} table`)}" tabindex="0">
          <table class="lt-table">
            <caption class="lt-visually-hidden">${esc(`${Many}: sample rows until ${name} is connected. Select a row to see it in the inspector.`)}</caption>
            <thead><tr>${th}</tr></thead>
            <tbody data-sample>${rows.map((r, k) => `<tr data-row data-status="${esc((r.status ?? '').toLowerCase())}" data-search="${esc(r.search)}"${k === 0 ? ' aria-selected="true"' : ''}><td><button type="button" class="ws-rowbtn" data-open-detail="${detailJson(rec, r)}">${esc(r.cells[0].text)}</button></td>${r.cells.slice(1).map(cellHtml).join('')}</tr>`).join('')}</tbody>
          </table>
          <div class="ws-none" data-nomatch hidden><p><b>${esc(`No ${rec.many} in this view.`)}</b></p><button type="button" class="lt-btn" data-variant="secondary" data-filter-reset><span data-part="label">${esc(`Show all ${rec.many}`)}</span></button></div>
        </div>
        ${statesHtml(flow, { cls: 'ws-state', id: 'ws' }).replace('<div class="ws-state" data-view="loading"', '<div class="ws-table ws-skel" data-view="loading"')}
      </section>
    </main>
    <div class="lt-resizer ws-r2" data-lt="pane-resizer" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Resize the inspector" aria-controls="ws-inspector" aria-valuemin="300" aria-valuemax="520" aria-valuenow="368" data-var="--inspector-w" data-edge="end" data-target="#ws"><span data-part="grip"></span></div>
    <aside class="ws-inspector" id="ws-inspector" aria-labelledby="ws-i-h" data-inspector>
      <div data-view="ready" class="ws-i">
        <header class="ws-i-head">
          <button type="button" class="lt-btn ws-i-back" data-variant="ghost" data-pane-back>${icon('back')}<span data-part="label">${esc(Many)}</span></button>
          <h2 id="ws-i-h" tabindex="-1" data-detail-title>${esc(first.title)}</h2>
        </header>
        <dl class="ws-crew" data-detail-list>${rec.fields.slice(1).map((f, k) => `<div><dt>${esc(cap(f.name))}</dt><dd>${esc(first.cells[k + 1].text)}</dd></div>`).join('')}</dl>
      </div>
      <div data-view="empty error loading" class="ws-i ws-i-none" hidden><p>Nothing selected.</p></div>
    </aside>
  </div>`;
  return { body, title: `${Many} · ${name}`, desc: `${Many} in ${name}: saved views, a table and an inspector.`, css: 'workspace' };
}

// ---------------------------------------------------------------- phone app, planned as a flow
function phoneApp(ctx) {
  const { m, flow, facts } = ctx;
  const rec = m.main, name = brand(ctx), Many = cap(rec.many);
  const rows = sampleRows(rec, 5, ctx);
  const w = weekly(ctx, 7);
  ctx.todo.push(`connect the real ${rec.many}: the rows and the week's figure are seeded sample data labelled with your nouns`);
  const tabs = [['home', Many, iconFor(rec.many)], ...m.records.slice(1, 2).map((r) => ['home', cap(r.many), iconFor(r.many)]), ['settings', 'Settings', 'gear']];
  const tabBar = (cur) => `<nav class="lt-bottom-nav ap-tabs" data-lt="bottom-nav" aria-label="Tabs"><span data-part="pill" aria-hidden="true"></span>${tabs.map(([id, label, ic], k) => `<a href="#screen-${id}"${label === cur ? ' aria-current="page"' : ''}>${icon(ic, 22)}<span>${esc(label)}</span></a>`).join('')}</nav>`;
  const status = '<div class="ap-status" aria-hidden="true"><span>9:41</span><span class="ap-status-icons"><i></i><i></i><i></i></span></div>';
  const bar = (id, title, back = null) => `<header class="lt-appbar" data-lt="mobile-app-bar" data-size="large"><div data-part="row">${back ? `<button type="button" data-part="back" data-go="${back[0]}" aria-label="${esc(`Back to ${back[1]}`)}">${icon('back', 20)}<span>${esc(back[1])}</span></button>` : '<span></span>'}<p data-part="small" aria-hidden="true">${esc(title)}</p><span></span></div><h2 data-part="large" id="${id}" tabindex="-1">${keepHyphens(esc(title))}</h2></header>`;
  const frame = (id, caption, inner) => `      <figure class="ap-frame" id="screen-${id}" data-screen="${id}">
        <div class="ap-device">
          ${status}
          ${inner}
        </div>
        <figcaption><b>${esc(caption[0])}.</b> ${esc(caption[1])}</figcaption>
      </figure>`;
  const m0 = motifParts(motifFor(`${facts.kind ?? ''} ${rec.many}`, ctx), { small: false });
  const choices = facts.steps.length ? facts.steps : [flow.first];
  const start = frame('start', [flow.screens[0].name, 'Each choice moves straight on.'], `<section class="ap-screen" aria-labelledby="st-h"><div class="ap-scroll ap-start">
            <figure class="lt-art ap-cover" data-tone="dark"${m0.attr} data-ratio="3/2" data-shot="${esc(`A photograph of ${name} in use, 4:3`)}">${m0.svg}<p data-part="name">${esc(name)}</p>${facts.kind ? `<p data-part="fact">${esc(cap(facts.kind))}</p>` : ''}<figcaption class="lt-visually-hidden">${esc(name)}</figcaption></figure>
            <h2 id="st-h" class="ap-title" tabindex="-1">${keepHyphens(esc(facts.claims[0] ? cap(facts.claims[0]) : `${name}, on your phone`))}</h2>
            <ul class="ap-choices" aria-label="How it works">${choices.slice(0, 3).map((c, k) => `<li><button type="button" data-go="home"><span><b>${esc(cap(c))}</b><small>${esc(`Step ${k + 1} of ${Math.min(choices.length, 3)}`)}</small></span>${icon('next')}</button></li>`).join('')}</ul>
          </div></section>`);
  const big = w.values.at(-1) ?? 0;
  const list = `<div class="lt-swiperow ap-rows" data-lt="swipe-row"><ul data-part="list" aria-label="${esc(Many)}">${rows.map((r) => `<li data-part="row" data-id="${esc(r.cells[0].v)}"><div data-part="content"><a data-part="main" href="#screen-detail" data-go="detail"><b data-part="lead">${esc(r.cells.find((c) => c.kind === 'time' || c.kind === 'date')?.text ?? '')}</b><span data-part="title">${esc(r.title)}</span><span data-part="sub">${r.status ? badge(r.status) : ''}</span></a></div></li>`).join('')}</ul></div>`;
  const home = frame('home', [Many, `The first useful screen: the ${rec.many}, and ${flow.newOne} in reach of a thumb.`], `<section class="ap-screen" aria-labelledby="home-h"><div class="ap-scroll">
            ${bar('home-h', Many)}
            <div class="ap-body">
              <div data-view="ready" class="ap-today">
                <a class="ap-next" href="#screen-detail" data-go="detail"><span class="ap-next-when">${esc(`${Many} this week`)}</span><b class="ap-next-time" data-count>${big}</b><span class="ap-next-route">${esc(`${w.values.reduce((a, b) => a + b, 0)} in the last 7 weeks`)}</span></a>
                <h3 class="ap-section">${esc(`Latest ${rec.many}`)}</h3>
                ${list}
              </div>
              ${statesHtml(flow, { cls: 'ap-state', headingTag: 'h3', id: 'ap', skeleton: '<div class="ap-next ap-skel"><span class="lt-skeleton" style="width: 52%"></span><span class="lt-skeleton ap-skel-time"></span></div><ul class="ap-skels"><li><span class="lt-skeleton ap-skel-lead"></span><span class="lt-skeleton" style="width: 60%"></span></li><li><span class="lt-skeleton ap-skel-lead"></span><span class="lt-skeleton" style="width: 50%"></span></li></ul>' }).replace('class="ap-state" data-view="loading"', 'class="ap-today" data-view="loading"')}
            </div>
          </div>
          <div class="ap-actionbar"><button type="button" class="lt-btn" data-variant="primary" data-size="lg" aria-haspopup="dialog" aria-controls="ap-sheet"><span data-part="label">${esc(flow.newOne)}</span></button></div>
          ${tabBar(Many)}</section>
          <div class="ap-sheet-root" data-lt="bottom-sheet"><dialog class="lt-sheet ap-sheet" id="ap-sheet" data-sheet data-detents="medium large" aria-labelledby="ap-sheet-h"><button type="button" data-part="grab" aria-label="Make the sheet bigger" aria-expanded="false"><span></span></button><div class="ap-sheet-head"><h2 id="ap-sheet-h">${esc(flow.newOne)}</h2><button type="button" class="lt-btn" data-variant="ghost" data-part="cancel"><span data-part="label">Close</span></button></div><form class="ap-form lt-form-demo" data-lt="text-field" data-say-form="${esc(`${cap(rec.one)} added.`)}" data-say-to="[data-toast]" novalidate>${rec.fields.filter((f) => !['ref', 'status'].includes(f.kind)).slice(0, 4).map((f, k) => field({ id: `ap-f${k}`, label: cap(f.name), type: f.kind === 'date' ? 'date' : f.kind === 'money' || f.kind === 'count' ? 'text' : 'text', mode: f.kind === 'money' || f.kind === 'count' ? 'decimal' : '', required: k === 0 })).join('')}<button type="submit" class="lt-btn" data-variant="primary" data-size="lg"><span data-part="label">${esc(`Save ${rec.one}`)}</span></button></form></dialog></div>`);
  const r0 = rows[0];
  const detail = frame('detail', [`One ${rec.one}`, 'Everything about it, and what can happen next.'], `<section class="ap-screen" aria-labelledby="det-h"><div class="ap-scroll">
            ${bar('det-h', r0.title, ['home', Many])}
            <div class="ap-body">
              <dl class="ap-facts">${rec.fields.slice(1).map((f, k) => `<div><dt>${esc(cap(f.name))}</dt><dd>${f.kind === 'status' ? badge(r0.cells[k + 1].text) : esc(r0.cells[k + 1].text)}</dd></div>`).join('')}</dl>
            </div>
          </div>
          <div class="ap-actionbar"><p><b>${esc(r0.status ?? r0.title)}</b><span>${esc(cap(rec.one))}</span></p><button type="button" class="lt-btn" data-variant="primary" data-size="lg" data-say="${esc(`${cap(rec.one)} updated.`)}"><span data-part="label">${esc(m.status.list[1] ? `Mark ${m.status.list[1].toLowerCase()}` : 'Save')}</span></button></div></section>`);
  const notes = m.records.filter((r) => r.fromBrief).slice(0, 2);
  const settingsScreen = frame('settings', ['Settings', 'Each switch acts the moment it moves.'], `<section class="ap-screen" aria-labelledby="set-h"><div class="ap-scroll">
            ${bar('set-h', 'Settings')}
            <div class="ap-body ap-settings">
              <section aria-labelledby="ap-s1"><h3 id="ap-s1">Notifications</h3><ul class="ap-group">${(notes.length ? notes : [rec]).map((r, k) => `<li class="ap-row">${switchRow(`ap-n${k}`, `New ${r.many}`, null, true)}</li>`).join('')}</ul></section>
              <section aria-labelledby="ap-s3"><h3 id="ap-s3">Appearance</h3><ul class="ap-group"><li class="ap-row ap-row-col">${segmented('Appearance', [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }])}</li></ul></section>
              <section aria-labelledby="ap-s4"><h3 id="ap-s4">Account</h3><ul class="ap-group"><li><button type="button" class="ap-row" data-tone="danger" data-go="start"><span>Sign out</span></button></li></ul></section>
            </div>
          </div>
          ${tabBar('Settings')}</section>`);
  const body = `<main id="main" class="ap">
    <header class="ap-head">
      <h1>${esc(`${name}, on a phone`)}</h1>
      <p>${esc(`${flow.screens.length} screens: ${flow.screens.map((s) => s.name.toLowerCase()).join(', ')}.`)}</p>
      <div class="ap-pager">
        <button type="button" class="lt-btn" data-variant="secondary" data-icon-only data-screens-prev aria-label="Previous screen">${icon('back')}</button>
        <button type="button" class="lt-btn" data-variant="secondary" data-icon-only data-screens-next aria-label="Next screen">${icon('next')}</button>
      </div>
    </header>
    <div class="ap-rail" data-screens data-state-screen="home" role="region" aria-label="App screens" tabindex="0">
${[start, home, detail, settingsScreen].join('\n')}
    </div>
  </main>
  <p class="ap-toast" role="status" data-toast></p>`;
  return { body, title: `${name} · phone app`, desc: `${name} on a phone: ${flow.screens.map((s) => s.name.toLowerCase()).join(', ')}.`, css: 'app-phone', htmlData: ' data-app' };
}

export const APP_PAGES = { dashboard, 'admin-table': admin, settings, inbox, 'ai-chat': assistant, 'agent-app': agent, directory, workspace, 'mobile-app': phoneApp, 'app-phone': phoneApp };
export { money };
