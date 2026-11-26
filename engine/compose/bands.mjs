// Bands from the subject. Below the first screen, a composed draft is built band by band from the brief's
// own facts: the things it sells with their prices, the steps, the people, the address and hours, the claims,
// the figures. A band the brief has nothing for is left out, and what it would need goes on the draft's one
// TODO list; nothing from a sample business is ever carried over. Each renderer writes the kit's own markup
// (offer-cards, bento-grid, how-it-works, team-grid, visit-info, cta-band, scroll-statement, stats-band), so
// the components style it and the critic reads it like any other page.
//
// Pure functions, no I/O: compose.mjs passes in the facts and a reader for the kit's snippets.
import { esc, figureHtml, figureStyle, keepHyphens, setFacts, applyMediaIdea } from './draft.mjs';
import { imperative } from './words.mjs';
import { rankMotifs, motifSvg, pickScene, sceneSvg } from '../../scripts/lib/image-motifs.mjs';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
/** The last two words of a short heading stay together, so it never ends on one word alone. */
const tie = (html) => String(html).replace(/ ([^ <>]+)$/, '&nbsp;$1');
const plainPrice = (v) => String(v).replace(/\s+(a|per)\s+.*/, '');
const ARROW = '<svg class="lt-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * The subject's own drawing for a panel, from the art panel's motif table: the best match for the thing's
 * name (and the business's kind), never the same as the panel before it. Null when nothing fits.
 */
const PROCESS = new Set(['document', 'calendar', 'envelope', 'coins', 'chat']);
export function motifFor(text, ctx, avoid = null, { item = false } = {}) {
  // The page's own words, not the request's: "home page", "website", phone numbers and "tool" in "invoicing
  // tool" would otherwise draw a house, a phone and a spanner. Plurals are read as their singular (loaves → loaf).
  const plain = (t) => String(t ?? '').replace(/\b(home ?page|web ?site|landing page|phone|tel|tool|tools)\b/gi, ' ').replace(/\d[\d\s]{5,}/g, ' ').replace(/\b(\w+?)ves\b/g, '$1f').replace(/\b(\w{4,})s\b/g, '$1');
  const subject = `${ctx.facts.kind ?? ''} ${ctx.facts.offers.join(' ')} ${ctx.facts.claims.join(' ')} ${ctx.facts.prices.map((p) => p.what ?? '').join(' ')}`;
  // Only drawings of the subject's own world: a step's words pick among them ("quote" → the document), but
  // never bring in another ("start date" is not a startup's phone).
  // The subject's domain lends its own drawings too (a dentist's page may also draw the stethoscope), so a page
  // has more than one to choose from.
  const world = [...new Set([...rankMotifs(plain(subject)), ...rankMotifs(ctx.domainWords ?? '').slice(0, 3)])];
  const own = rankMotifs(plain(text));
  // Drawings of a process (a quote, a date, a message, a payment) fit any subject's steps.
  const ownFit = world.length ? own.filter((m) => world.includes(m) || PROCESS.has(m)) : own;
  // One drawing per page where the subject offers another that fits; never the same as the neighbour's. A
  // thing's own drawing may come back on a later panel only when nothing else fits that thing.
  const used = (ctx.usedMotifs ??= new Set());
  const fresh = (list) => list.find((m) => m !== avoid && !used.has(m));
  const anyOf = (list) => list.find((m) => m !== avoid);
  const pick = item ? (fresh(ownFit) ?? anyOf(ownFit) ?? null) : (fresh(ownFit) ?? fresh(world) ?? anyOf(ownFit) ?? anyOf(world) ?? null);
  if (pick) used.add(pick);
  return pick;
}
/**
 * The page's one scene: two or three of the subject's own drawings on one ground, for the first screen's art
 * panel of a page that is not about software. Its drawings count as used, so the motifs further down the page
 * are others. One per page (ctx.scene remembers it); null when the subject has no drawing.
 */
export function sceneFor(text, ctx) {
  if (ctx.scene) return null;
  const plain = String(text ?? '').replace(/\b(home ?page|web ?site|landing page|phone|tel|tool|tools)\b/gi, ' ').replace(/\d[\d\s]{5,}/g, ' ').replace(/\b(\w+?)ves\b/g, '$1f').replace(/\b(\w{4,})s\b/g, '$1');
  const names = pickScene(plain) ?? pickScene(`${plain} ${ctx.domainWords ?? ''}`);
  if (!names?.length) return null;
  ctx.scene = names;
  for (const n of names) (ctx.usedMotifs ??= new Set()).add(n);
  return names;
}
/** The attributes and first child that put a scene in an art panel. */
export const sceneParts = (names) => (names?.length ? { attr: ` data-scene="${names.join(' ')}"`, svg: sceneSvg(names) } : { attr: '', svg: '' });
/** The attributes and first child that put a motif in an art panel. */
export const motifParts = (name, { small = false } = {}) => (name ? { attr: ` data-motif="${name}"`, svg: small ? motifSvg(name).replace('<svg data-part="motif"', '<svg data-part="motif" style="height: 40%; top: 8%"') : motifSvg(name) } : { attr: '', svg: '' });

/** Is the brief about software (so its picture is the product working on a screen)? */
export const isSoftware = (ctx) => ['landing', 'dev-landing'].includes(ctx.typeId);
const wantsPhone = (ctx) => /\b(app|mobile|phone|iphone|android)\b/i.test(ctx.facts.brief ?? '');

/** The product's sections, named from the brief's own nouns: "add a client, send the invoice" → Clients, Invoices. */
function screenNav(ctx) {
  const nouns = [];
  for (const s of [...ctx.facts.steps, ...ctx.facts.claims]) {
    const w = s.replace(/\b(on|in|within|for|by|with)\b.*$/, '').trim().split(/\s+/).pop()?.toLowerCase();
    if (!w || /^(paid|done|it|them|up|out|in)$/.test(w) || w.length < 4) continue;
    const plural = /s$/.test(w) ? w : /(ch|sh|x)$/.test(w) ? `${w}es` : `${w}s`;
    const label = cap(plural);
    if (!nouns.includes(label)) nouns.push(label);
  }
  return nouns.slice(0, 4);
}
const BADGE = ['positive', 'accent', ''];
/**
 * A live kit screen of the product, from the brief's own words and figures: its name, the sections its steps
 * name, the figures it states, the steps as the work in progress and the one action. Nothing invented: no
 * customers, no amounts. Drawn as `data-app="desktop"` (or "phone") inside a device frame, inert.
 */
export function productScreen(ctx, { kind = null, current = 0, stepsOnly = false } = {}) {
  const { facts, product } = ctx;
  const phone = kind ? kind === 'phone' : wantsPhone(ctx);
  const nav = screenNav(ctx);
  const page = nav[Math.min(current, nav.length - 1)] ?? cap(facts.kind ?? 'Overview');
  const steps = facts.steps.length ? facts.steps : facts.claims.map((c) => imperative(c));
  const action = steps[current] ? cap(steps[current]) : ctx.action ?? 'Start';
  const figs = ctx.figures.slice(0, 3);
  const rows = steps.slice(0, 4).map((st, k) => ({ name: cap(st), state: k < current ? 'Done' : k === current ? 'Now' : 'Next', tone: k < current ? 'positive' : k === current ? 'accent' : '' }));
  const badge = (r) => `<span class="lt-badge"${r.tone ? ` data-tone="${r.tone}"` : ''}>${esc(r.state)}</span>`;
  const label = `${product ?? 'The product'}${page ? `, ${page.toLowerCase()}` : ''}: ${rows.map((r) => `${r.name} (${r.state.toLowerCase()})`).join(', ') || action}`;
  if (phone) {
    const big = figs[0];
    return { kind: 'phone', label, html: `<div data-app="phone" inert>
          <p data-a="status"><span>9:41</span></p>
          <div data-a="head"><p data-a="title">${esc(page)}</p></div>
          <div data-a="body">
            ${big && !stepsOnly ? `<div data-a="hero"><p data-a="label">${esc(cap(big.label))}</p><p data-a="big">${figureHtml(big.value)}</p></div>` : ''}
            ${rows.length ? `<ul data-a="list">${rows.map((r, k) => `<li${k === current ? ' data-mark' : ''}><span><b>${esc(r.name)}</b><small>Step ${k + 1}</small></span><span>${badge(r)}</span></li>`).join('')}</ul>` : ''}
          </div>
          <div data-a="cta"><span class="lt-btn" data-variant="primary"><span data-part="label">${esc(action)}</span></span></div>
          ${nav.length >= 2 ? `<nav class="lt-bottom-nav" aria-label="Sections">${nav.slice(0, 4).map((n, k) => `<a${k === Math.min(current, nav.length - 1) ? ' aria-current="page"' : ''}><span>${esc(n)}</span></a>`).join('')}</nav>` : ''}
        </div>` };
  }
  return { kind: 'laptop', label, html: `<div data-app="desktop" inert>
          <aside data-a="side">
            <p data-a="brand">${esc(product ?? 'Overview')}</p>
            ${(nav.length ? nav : ['Overview']).map((n, k) => `<p data-a="nav"${k === Math.min(current, nav.length - 1) ? ' aria-current="page"' : ''}>${esc(n)}</p>`).join('\n            ')}
          </aside>
          <div data-a="main">
            <div data-a="top">
              <div><p data-a="h">${esc(page)}</p><p data-a="sub">${esc(cap(facts.kind ?? product ?? ''))}</p></div>
              <span class="lt-btn" data-variant="primary"><span data-part="label">${esc(action)}</span></span>
            </div>
            ${figs.length ? `<div data-a="kpis">${figs.map((f) => `<p data-a="kpi"><span>${esc(cap(f.label))}</span><b>${esc(f.value)}</b></p>`).join('')}</div>` : ''}
            ${rows.length ? `<table data-a="table"><thead><tr><th>Step</th><th>What</th><th>Status</th></tr></thead><tbody>${rows.map((r, k) => `<tr${k === current ? ' data-mark' : ''}><td>${k + 1}</td><td>${esc(r.name)}</td><td>${badge(r)}</td></tr>`).join('')}</tbody></table>` : ''}
            ${!stepsOnly && (facts.claims.length || facts.offers.length) ? `<div data-a="card"><p data-a="card-h"><b>${esc(product ?? 'It')} does this for you</b><span>${esc(`${facts.claims.length + facts.offers.length} things`)}</span></p><ul data-a="list">${[...facts.claims, ...facts.offers].slice(0, 5).map((c) => `<li><span><b>${esc(cap(c))}</b>${facts.audience ? `<small>${esc(`For ${facts.audience}`)}</small>` : ''}</span><span><span class="lt-badge" data-tone="positive">On</span></span></li>`).join('')}</ul></div>` : ''}
          </div>
        </div>` };
}
/** The product screen inside a device frame. */
export function deviceFigure(ctx, opts = {}) {
  const sc = productScreen(ctx, opts);
  // A device shot is a picture of the product, so the critic leaves its own corners and type alone (as the kit's own shots do).
  return `<figure class="lt-device" data-kind="${sc.kind}" data-audit-ignore>
      <div data-part="screen">
        ${sc.html}
      </div>
      <figcaption class="lt-visually-hidden">${esc(sc.label)}</figcaption>
    </figure>`;
}

/** The first screen's picture when the bold idea is not there: the product for software, else the subject's motif. */
export function heroPicture(ctx) {
  if (isSoftware(ctx)) return deviceFigure(ctx);
  const subject = `${ctx.facts.kind ?? ''} ${ctx.facts.offers.join(' ')}`;
  const sc = sceneFor(subject, ctx);
  const m = sc ? sceneParts(sc) : motifParts(motifFor(subject, ctx));
  const name = ctx.product ?? cap(ctx.facts.kind ?? '');
  const fact = [ctx.facts.kind && ctx.product ? cap(ctx.facts.kind) : null, ctx.facts.place].filter(Boolean).join(' · ');
  return `<figure class="lt-art"${m.attr} data-tone="dark" data-frame data-ratio="5/4" data-shot="${esc(`A photograph of ${ctx.facts.kind ? `the ${ctx.facts.kind}` : 'the place'}${ctx.facts.place ? ` in ${ctx.facts.place}` : ''}, real light, 5:4`)}">
          ${m.svg}<p data-part="name">${keepHyphens(esc(name))}</p>${fact ? `<p data-part="fact">${esc(fact)}</p>` : ''}
          <figcaption class="lt-visually-hidden">${esc(name)}</figcaption>
        </figure>`;
}

/** A thin brief still gets one picture: the subject's drawing large, with its name and where it is. */
export function pictureBand(ctx) {
  // The head noun of the brief's main count names the thing ("food parcels" → a parcel), else its kind.
  const head = (ctx.facts.counts[0]?.what ?? '').split(' ').pop();
  // A different drawing from the first screen's where the subject has one; else the same one on another ground.
  const m = motifParts(motifFor(`${head} ${ctx.facts.kind ?? ''}`, ctx, ctx.heroMotif) ?? ctx.heroMotif, { small: true });
  if (!m.attr) return null;
  const name = ctx.facts.kind ? cap(ctx.facts.kind) : ctx.product;
  return { id: 'media-band', slug: 'picture', label: name ?? 'Picture', html: `<section class="lt-section" aria-labelledby="h-picture">
  <header><h2 id="h-picture">${keepHyphens(esc(`${name ?? ''}${ctx.facts.place ? ` in ${ctx.facts.place}` : ''}`))}</h2></header>
  <figure class="lt-art"${m.attr} data-pattern="floor" data-ratio="16/9" data-zoom data-shot="${esc(`A wide photograph of ${ctx.product ?? 'the place'} at work${ctx.facts.place ? ` in ${ctx.facts.place}` : ''}, 16:9`)}">
    ${m.svg}<p data-part="name">${esc(ctx.product ?? name ?? '')}</p>${ctx.facts.place ? `<p data-part="fact">${esc(ctx.facts.place)}</p>` : ''}
    <figcaption class="lt-visually-hidden">${esc(`${ctx.product ?? name}${ctx.facts.place ? `, ${ctx.facts.place}` : ''}`)}</figcaption>
  </figure>
</section>` };
}

/** What the brief sells or does, each with its price (or "Free", or a fixed-price quote) and how long it takes. */
export function itemsFrom(facts) {
  const items = [];
  const fixedQuote = /\bfixed[-\s]price quotes?\b/i.test(facts.brief ?? '');
  for (const p of facts.prices.filter((x) => x.what)) {
    const d = facts.durations.find((x) => x.what === p.what);
    items.push({ name: p.what.replace(/^fixed[-\s](?:fee|price)\s+/i, ''), price: plainPrice(p.value), from: p.from, per: /\s(a|per)\s/.test(p.value) ? p.value.replace(/^\S+\s+/, '') : null, meta: d ? d.value : /^fixed/i.test(p.what) ? 'Fixed fee' : null });
  }
  for (const d of facts.durations.filter((x) => x.phrase && /^free\b/i.test(x.phrase) && x.what)) items.push({ name: d.what, price: 'Free', meta: d.value });
  for (const o of facts.offers) {
    const singular = o.replace(/s$/, '');
    if (items.some((i) => i.name.toLowerCase().includes(singular.toLowerCase()) || singular.toLowerCase().includes(i.name.toLowerCase()))) continue;
    items.push({ name: o, price: null, meta: fixedQuote ? 'Fixed-price quote' : null });
  }
  return items.slice(0, 6);
}

const listName = (items) => {
  const names = items.map((i, k) => (k ? i.name : cap(i.name)));
  const s = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return s.length <= 44 ? s : null;
};

/** What each band asks for when the brief has nothing to fill it with. */
export const ASK = {
  'offer-cards': 'two to four things you sell, each with its price',
  'bento-grid': 'your services or ways to help, each with its price or what it takes',
  'service-list': 'four or more services or sessions, each with its price or time',
  'how-it-works': 'the three steps from first contact to the job done',
  'stack-cards': 'the three steps from first contact to the job done',
  'sticky-story': 'the three steps someone goes through, each with a real screen',
  'team-grid': 'the people, with their names and roles',
  'visit-info': 'the full address, phone number and opening hours',
  'booking-bar': 'what people book (a table, a class, a tour), its price and when it runs',
  'faq-section': 'the four questions people ask before they get in touch, with one-line answers',
  'scroll-statement': 'one sentence on how you work that a competitor could not say',
  'stats-band': 'three or four real figures, each with its period',
  'media-band': 'one figure worth setting huge (a time, a count, a price) and a real screen or photograph',
  'feature-split': 'each thing the product does, shown as a real screen',
  'feature-grid': 'each thing the product does, shown as a real screen',
  'pricing-tiers': 'the tickets or plans, each with its price and what it includes',
  'project-grid': 'the work itself: four to eight projects with a photograph each',
  'contact-section': 'an email address or phone number people can use',
  'description-list': 'the plain facts people check (materials, sizes, care, delivery)',
  'newsletter-signup': 'what the newsletter sends, and how often',
  'comparison-table': 'what differs between the plans, line by line',
  'terminal-window': 'the real install command and its output',
  'code-block': 'a real request and its response',
  'api-endpoint': 'the real endpoints',
  'integrations-grid': 'the tools it connects to',
  'blog-grid': 'three real posts',
};

/**
 * One band of the page from the facts, or null with what it would need.
 * @param {{ id: string | null, role?: string, copy?: string }} section
 * @param {any} ctx { facts, figures, product, hero, idea, action, hours, used: Set, typeId, snippet(id) }
 * @returns {{ html: string, slug: string, label: string, id: string } | { todo: string }}
 */
export function renderBand(section, ctx) {
  const { facts, product } = ctx;
  const id = section.id;
  const fn = RENDER[id];
  const out = fn ? fn(ctx, section) : null;
  if (out) return { id: out.id ?? id, ...out };
  return { todo: `${section.role ?? id}: ${ASK[id] ?? (section.copy ? section.copy.split('. ')[0].replace(/\.$/, '').toLowerCase() : 'its real content')}` };
}

const RENDER = {
  'offer-cards': (ctx) => offers(ctx),
  'bento-grid': (ctx) => tiles(ctx),
  'service-list': (ctx) => (itemsFrom(ctx.facts).length >= 4 ? tiles(ctx) : null),
  'how-it-works': (ctx) => steps(ctx),
  'stack-cards': (ctx) => steps(ctx),
  'sticky-story': (ctx) => steps(ctx),
  'team-grid': (ctx) => people(ctx),
  'visit-info': (ctx) => visit(ctx),
  'booking-bar': (ctx) => booking(ctx),
  'cta-band': (ctx) => close(ctx),
  'scroll-statement': (ctx) => statement(ctx),
  'stats-band': (ctx) => stats(ctx),
  'media-band': (ctx) => media(ctx),
};

/** An art panel for one thing: its drawing, its price set large (or its name), one fact. */
function thingPanel(it, ctx, tone, motif, ratio = null) {
  // Beside a price set large the drawing is smaller and stays in its corner, clear of the figure.
  const m = motifParts(motif, { small: !!it.price });
  return `<figure class="lt-art"${tone}${m.attr}${it.price ? ' data-variant="figure"' : ''}${ratio ? ` data-ratio="${ratio}"` : ''} data-shot="${esc(`A photograph of the ${it.name}${ctx.facts.place ? ` in ${ctx.facts.place}` : ''}, same light and ratio as the others, 4:5`)}">${m.svg}${it.price ? `${it.from ? '<p data-part="index">From</p>' : ''}<p data-part="figure"${figureStyle(it.price)}>${esc(it.price)}</p>` : `<p data-part="name">${keepHyphens(esc(cap(it.name)))}</p>`}${it.meta ? `<p data-part="fact">${esc(it.meta)}</p>` : ''}<figcaption class="lt-visually-hidden">${esc(`${cap(it.name)}${it.price ? `, ${it.from ? 'from ' : ''}${it.price}` : ''}`)}</figcaption></figure>`;
}
/** Each thing's drawing, never the same as its neighbour's. */
function motifsFor(items, ctx) {
  const out = [];
  for (const it of items) {
    const prev = out[out.length - 1] ?? null;
    // A drawing that fits the thing, different from its neighbour's; none rather than one that does not fit.
    const m = motifFor(it.name, ctx, prev, { item: true });
    out.push(m);
  }
  return out;
}
function offers(ctx) {
  const items = itemsFrom(ctx.facts);
  if (items.length < 2) return null;
  const tones = ['', ' data-tone="accent"', ' data-tone="dark"', ''];
  const motifs = motifsFor(items.slice(0, 4), ctx);
  const li = items.slice(0, 4).map((it, k) => `    <li><article>
      ${thingPanel(it, ctx, tones[k], motifs[k])}
      <h3>${tie(keepHyphens(esc(cap(it.name))))}</h3>${it.per ? `\n      <p>${esc(cap(it.per))}</p>` : ''}
    </article></li>`).join('\n');
  return { slug: 'range', label: 'Prices', html: `<section class="lt-offers" aria-labelledby="h-range">
  <header><h2 id="h-range">${keepHyphens(esc(listName(items.slice(0, 4)) ?? 'What it costs'))}</h2></header>
  <ul>
${li}
  </ul>
</section>` };
}

/** Five or more things people browse: a sideways rail of panels (a moment: it pins on wide screens). */
export function sideScroll(ctx) {
  const items = itemsFrom(ctx.facts);
  if (items.length < 5) return null;
  const tones = ['', ' data-tone="accent"', ' data-tone="dark"'];
  const motifs = motifsFor(items, ctx);
  return { id: 'side-scroll', slug: 'range', label: 'Prices', html: `<section class="lt-side-scroll" data-lt="side-scroll" aria-labelledby="h-range">
  <div data-part="pin">
    <header><h2 id="h-range">${keepHyphens(esc(listName(items) ?? 'What it costs'))}</h2></header>
    <ul data-part="track" tabindex="0" aria-label="${esc(`${items.length} things, scroll sideways`)}">
${items.map((it, k) => `      <li>${thingPanel(it, ctx, tones[k % 3], motifs[k], '4/5')}<p data-part="caption"><b>${esc(cap(it.name))}</b>${it.meta ? `<span>${esc(it.meta)}</span>` : ''}</p></li>`).join('\n')}
    </ul>
    <div data-part="progress" aria-hidden="true"><span></span></div>
  </div>
</section>` };
}

function tiles(ctx) {
  // Tiles carry a price each; things without one are named in a line under them, not left as empty tiles.
  const all = itemsFrom(ctx.facts);
  const items = all.filter((i) => i.price);
  const loose = all.filter((i) => !i.price);
  if (items.length < 2) return all.length >= 2 ? offers(ctx) : null;
  const n = items.length;
  const art = items.map((it, k) => {
    // Spans that fill whole rows of three: 4 → wide, one, one, wide; 5 → wide then four; 2, 3 and 6 sit evenly.
    const span = (n === 4 && (k === 0 || k === 3)) || (n === 5 && k === 0) ? ' data-span="wide"' : '';
    // A long price ("£48,000") is set a step smaller so it never runs out of a narrow tile.
    const long = it.price && it.price.length > 5 ? ' style="font-size: clamp(2rem, 0.8rem + 4.2cqi, 3.75rem)"' : '';
    const fig = it.price ? `<p data-part="figure"${long}>${it.from ? '<small>from</small>' : ''}${esc(it.price)}</p>` : '';
    return `    <article${span}>${it.meta ? `<span class="lt-eyebrow">${esc(it.meta)}</span>` : ''}<h3>${keepHyphens(esc(cap(it.name)))}</h3>${it.per ? `<p>${esc(cap(it.per))}</p>` : ''}${fig}</article>`;
  }).join('\n');
  return { id: 'bento-grid', slug: 'prices', label: 'Prices', html: `<section class="lt-section" aria-labelledby="h-prices">
  <header><h2 id="h-prices">${keepHyphens(esc(listName(items) ?? 'What it costs'))}</h2></header>
  <div class="lt-bento" aria-label="What it costs">
${art}
  </div>${loose.length ? `\n  <p class="lt-prose">${esc(`Also: ${loose.map((i, k) => (k ? i.name : cap(i.name))).join(' and ')}${loose[0].meta ? `, on a ${loose[0].meta.toLowerCase()}` : ''}.`)}</p>` : ''}
</section>` };
}

/** Steps for a product: a phone whose screen moves on with each step (a moment: it pins). A phone, not the
 *  hero's laptop: it reads at full size on a 390px screen, where a laptop's screen would be a thumbnail. */
export function pinnedSteps(ctx) {
  const st = ctx.facts.steps;
  if (st.length < 3 || !isSoftware(ctx)) return null;
  const li = st.slice(0, 4).map((step, k) => `    <li${k === 0 ? ' data-active' : ''}>
      <div data-part="text"><h3>${keepHyphens(esc(cap(step)))}</h3></div>
      <figure data-part="visual">
        ${deviceFigure(ctx, { kind: 'phone', current: k, stepsOnly: true }).replace(/^<figure class="lt-device"([^>]*)>/, '<div class="lt-device"$1>').replace(/<figcaption[\s\S]*?<\/figcaption>\s*<\/figure>$/, '</div>')}
        <figcaption class="lt-visually-hidden">${esc(`${ctx.product ?? 'The product'}, step ${k + 1}: ${step}`)}</figcaption>
      </figure>
    </li>`).join('\n');
  return { id: 'sticky-story', slug: 'how', label: 'How it works', html: `<section class="lt-story" data-lt="sticky-story" aria-labelledby="h-how" style="--steps: ${Math.min(st.length, 4)}">
  <header><h2 id="h-how">${esc(`${['', '', 'Two', 'Three', 'Four'][Math.min(st.length, 4)]} steps`)}${ctx.product ? ` with ${esc(ctx.product)}` : ''}</h2></header>
  <ol data-part="steps">
${li}
  </ol>
</section>` };
}

/** Steps for a service: one panel each, with the step's own drawing and the fact it carries ("Free", "5 days"). */
function stepPanels(ctx) {
  const st = ctx.facts.steps.slice(0, 4);
  const tones = ['', ' data-tone="accent"', ' data-tone="dark"', ''];
  const out = [];
  const li = st.map((step, k) => {
    const m = motifFor(step, ctx, out[k - 1] ?? null, { item: true }); out.push(m);
    const mp = motifParts(m);
    const fact = /\bfree\b/i.test(step) ? 'Free' : /\b(?:within|in)\s+(\d+\s+\w+)/i.exec(step)?.[1] ?? null;
    return `    <li><article>
      <figure class="lt-art"${tones[k]}${mp.attr}${fact ? ' data-variant="figure"' : ''} data-shot="${esc(`A photograph of ${step}, same light and ratio as the others, 4:5`)}">${mp.svg}${fact ? `<p data-part="figure"${figureStyle(fact)}>${figureHtml(cap(fact))}</p>` : ''}<figcaption class="lt-visually-hidden">${esc(`Step ${k + 1}: ${step}`)}</figcaption></figure>
      <h3>${tie(keepHyphens(esc(cap(step.replace(/^(a|an|the)\s+/i, '')))))}</h3>
    </article></li>`;
  }).join('\n');
  return { id: 'offer-cards', slug: 'how', label: 'How it works', html: `<section class="lt-offers" aria-labelledby="h-how">
  <header><h2 id="h-how">${esc(`${['', '', 'Two', 'Three', 'Four'][st.length]} steps`)}${ctx.product ? ` with ${esc(ctx.product)}` : ''}</h2></header>
  <ul>
${li}
  </ul>
</section>` };
}

function steps(ctx) {
  const st = ctx.facts.steps;
  if (st.length < 3) return null;
  // A service's steps are pictures too: a panel each. (Software gets its screen, as a pinned scene or rows.)
  if (!isSoftware(ctx)) return stepPanels(ctx);
  const items = st.slice(0, 5).map((s, k) => {
    const m = /\b(\d+)\s+(minutes?|hours?|days?|weeks?)\b/.exec(s);
    return `<li><span data-part="n">${k + 1}</span><h3>${keepHyphens(esc(cap(s)))}</h3></li>`;
  }).join('');
  return { id: 'how-it-works', slug: 'how', label: 'How it works', html: `<section class="lt-how-it-works" aria-labelledby="h-how">
  <header><h2 id="h-how">${esc(`${['', '', 'Two', 'Three', 'Four', 'Five'][Math.min(st.length, 5)]} steps`)}${ctx.product ? ` with ${esc(ctx.product)}` : ''}</h2></header>
  <ol>${items}</ol>
</section>` };
}

function people(ctx) {
  const ppl = ctx.facts.people;
  if (!ppl.length) return null;
  // Something to look at without faces: each person's initials in a disc of the palette's own tints.
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const li = ppl.map((p, k) => `<li><span data-part="avatar" data-n="${k % 4}" style="border-radius: 50%" aria-hidden="true">${esc(initials(p.name))}</span><strong>${esc(p.name)}</strong><span>${esc(p.role ?? '')}</span></li>`).join('');
  return { slug: 'people', label: 'People', html: `<section class="lt-team-grid"${ppl.length > 4 ? ' data-variant="list"' : ''} aria-labelledby="h-people">
  <header><h2 id="h-people">${esc(ppl.every((p) => p.role === 'Partner') ? `The ${ppl.length === 2 ? 'two' : ppl.length === 3 ? 'three' : ppl.length} partners` : ppl.every((p) => p.role === 'Owner') ? `Who runs ${ctx.product ?? `the ${ctx.facts.kind ?? 'place'}`}` : 'Who you will deal with')}</h2></header>
  <ul>${li}</ul>
</section>` };
}

function visit(ctx) {
  const { facts, hours, product } = ctx;
  const where = [facts.building, facts.street, [facts.place, facts.postcode].filter(Boolean).join(' ')].filter(Boolean);
  const hasAddress = !!(facts.street || facts.postcode || facts.building);
  const hoursKnown = !!hours || !!facts.days;
  if ([hasAddress, hoursKnown, !!(facts.phone || facts.email)].filter(Boolean).length < 2) return null;
  const links = [facts.phone ? `<a href="tel:${esc(facts.phone.replace(/[^\d+]/g, ''))}">${esc(facts.phone)}</a>` : '', facts.email ? `<a href="mailto:${esc(facts.email)}">${esc(facts.email)}</a>` : ''].join('');
  const table = hours ? `<table><caption class="lt-visually-hidden">Opening hours by day</caption><tbody>${[1, 2, 3, 4, 5, 6, 7].map((d) => `<tr data-day="${d}"><th scope="row">${DAYS[d]}</th>${hours[d] ? `<td>${hours[d]}</td>` : '<td data-closed>Closed</td>'}</tr>`).join('')}</tbody></table>` : '';
  const loose = !hours && facts.days ? `<p>Open ${esc(facts.days)}${facts.times[0] ? `, ${facts.times[0].what === 'hours' ? '' : 'from '}${esc(facts.times[0].value)}` : ''}</p>` : '';
  const street = facts.street ? facts.street.replace(/^\d+\s+/, '') : null;
  return { slug: 'visit', label: 'Find us', html: `<section class="lt-visit"${hours ? ' data-lt="visit-info"' : ''} aria-labelledby="h-visit">
  <header><h2 id="h-visit">${esc(street ? `Find us on ${street}` : facts.place ? `Find us in ${facts.place}` : 'Find us')}</h2></header>
  <div data-part="cols">
    <div data-part="where">
      ${hasAddress ? `<h3>Address</h3>\n      <address>${[product, ...where].filter(Boolean).map(esc).join('<br>')}</address>` : ''}
      ${links ? `<p data-part="links">${links}</p>` : ''}
    </div>
    ${hoursKnown ? `<div data-part="when">
      <h3>Opening hours</h3>
      ${hours ? '<p data-part="now" role="status"></p>' : ''}
      ${table}${loose}
    </div>` : ''}
  </div>
</section>` };
}

function panel(slug, heading, lede, primary, secondary) {
  return `<section class="lt-cta-band" aria-labelledby="h-${slug}">
  <div data-part="panel">
    <div><h2 id="h-${slug}">${keepHyphens(esc(heading))}</h2>${lede ? `<p data-part="lede">${esc(lede)}</p>` : ''}</div>
    <div data-part="cta"><a class="lt-btn" data-variant="primary" data-size="lg" href="${esc(primary.href)}">${esc(primary.label)}</a>${secondary ? `<a class="lt-btn" data-variant="ghost" data-size="lg" href="${esc(secondary.href)}">${esc(secondary.label)}</a>` : ''}</div>
  </div>
</section>`;
}
const contactHref = (facts) => (facts.phone ? `tel:${facts.phone.replace(/[^\d+]/g, '')}` : facts.email ? `mailto:${facts.email}` : '#top');

/** Something to book (a class, a table, a tour), as the page's closing band. */
function booking(ctx) {
  const p = ctx.facts.prices.find((x) => /\b(class|table|tour|session|course|workshop|tasting|lesson|appointment)\b/i.test(x.what ?? ''));
  if (!p) return null;
  const what = p.what.replace(/^(a|an|the)\s+/i, '');
  return { id: 'cta-band', slug: 'book', label: 'Book', html: panel('book', `Book the ${what}`, `${cap(plainPrice(p.value))} a place${ctx.facts.phone ? `. Call ${ctx.facts.phone} to book.` : '.'}`, { label: ctx.action ?? `Book the ${what.split(' ').pop()}`, href: contactHref(ctx.facts) }, null) };
}

/** The close: the thing and its price (or what a gift does) again, beside the one action. */
function close(ctx) {
  const { facts, product, hero } = ctx;
  const said = facts.says[0];
  const price = facts.prices.find((p) => !String(hero.headline ?? '').includes(plainPrice(p.value))) ?? facts.prices[0];
  // A service or a place closes on its action ("Book a first call with Harrow & Finch"); a product on its price.
  const service = ['service-landing', 'venue', 'event', 'about', 'portfolio'].includes(ctx.typeId);
  const other = facts.prices.find((p) => plainPrice(p.value) !== ctx.idea.figure && !String(hero.headline ?? '').includes(plainPrice(p.value)));
  const heading = said ? cap(said) : service && ctx.action && product ? `${ctx.action} ${/^(give|donate)/i.test(ctx.action) ? 'to' : /^get/i.test(ctx.action) ? 'from' : 'with'} ${product}` : (other ?? price) ? ((p) => `${p.what ? `${cap(p.what.replace(/^fixed[-\s](?:fee|price)\s+/i, ''))}, ` : product ? `${product}, ` : ''}${p.from ? 'from ' : ''}${p.value}`)(other ?? price) : price ? `${price.what ? `${cap(price.what.replace(/^fixed[-\s](?:fee|price)\s+/i, ''))}, ` : product ? `${product}, ` : ''}${price.from ? 'from ' : ''}${price.value}` : ctx.action && product ? `${ctx.action} ${/^(give|donate)/i.test(ctx.action) ? 'to' : /^get/i.test(ctx.action) ? 'from' : 'with'} ${product}` : ctx.action ?? null;
  if (!heading) return null;
  // The lede says what happens next when the brief gives the steps; otherwise one true line not yet on screen.
  const lede = facts.steps.length >= 2 ? `${cap(facts.steps.join(', then '))}.` : facts.claims.length ? `${product ?? 'It'} ${facts.claims[0]}.` : hero.lede && !hero.lede.includes(heading) ? hero.lede : null;
  const secondary = facts.phone ? { label: `Call ${facts.phone}`, href: `tel:${facts.phone.replace(/[^\d+]/g, '')}` } : null;
  return { slug: 'start', label: ctx.action ?? 'Start', html: panel('start', heading, lede, { label: ctx.action ?? 'Get in touch', href: facts.phone && !secondary ? contactHref(facts) : facts.email ? `mailto:${facts.email}` : '#top' }, secondary) };
}

function statement(ctx) {
  const claims = ctx.facts.claims.filter((c) => !String(ctx.hero.headline ?? '').toLowerCase().includes(c.slice(0, 18).toLowerCase()) && !String(ctx.hero.lede ?? '').includes(c));
  if (!claims.length) return null;
  const [a, b] = claims;
  return { slug: 'promise', label: 'Our promise', html: `<section class="lt-statement" data-lt="scroll-statement" aria-labelledby="h-promise">
  <h2 id="h-promise">${esc(`${ctx.product ?? 'It'} ${a}.`)}${b ? ` <span data-part="quiet">${esc(cap(b))}.</span>` : ''}</h2>
</section>` };
}

function stats(ctx) {
  const left = ctx.figures.filter((f) => !ctx.used.has(f.value) && !String(ctx.hero.headline ?? '').includes(f.value));
  if (left.length < 3) return null;
  for (const f of left.slice(0, 4)) ctx.used.add(f.value);
  return { slug: 'figures', label: 'In figures', html: `<section class="lt-stats-band" aria-labelledby="h-figures">
  <h2 id="h-figures" class="lt-visually-hidden">${esc(ctx.product ?? 'In figures')} in figures</h2>
  <dl>${left.slice(0, 4).map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>
</section>` };
}

function media(ctx) {
  if (ctx.idea.place !== 'media-band' || !ctx.idea.figure) return null;
  let html = ctx.snippet('media-band');
  const second = ctx.facts.claims[1];
  html = applyMediaIdea(html, ctx.idea, second ? `${cap(second)}.` : null);
  // The figure's panel carries the subject's drawing, so the band is a picture, not a number on a slab.
  const m = motifParts(motifFor(`${ctx.facts.claims.join(' ')} ${ctx.facts.kind ?? ''}`, ctx), { small: true });
  html = html.replace(/<div class="lt-art"([^>]*)>/, (x, a) => `<div class="lt-art"${a}${m.attr}>${m.svg}`);
  ctx.used.add(ctx.idea.figure);
  html = setFacts(html, ctx.figures.filter((f) => !ctx.used.has(f.value) && !String(ctx.hero.headline ?? '').includes(f.value)), { min: 2 });
  return { slug: 'product', label: 'The product', html: html.replace(/\sid="[^"]*"(?=[^>]*>)/, '').replace(/^<section\b/, '<section').replace(/aria-labelledby="[^"]*"/, 'aria-labelledby="lt-mb-title"') };
}

/** The bar: the name, links to the bands that exist, the phone number as text, and the one action. */
export function navBar({ product, links, action, facts }) {
  const li = links.map((l) => `<li><a href="#${l.slug}">${esc(l.label)}</a></li>`).join('');
  return `<header class="lt-nav-simple" data-lt="navbar-simple">
  <a href="#top" data-part="brand"><span data-part="mark" aria-hidden="true"></span>${esc(product ?? 'Home')}</a>
  <nav aria-label="Main"><ul data-part="links">${li}</ul></nav>
  <div data-part="actions">${facts.phone ? `<a data-part="signin" href="tel:${esc(facts.phone.replace(/[^\d+]/g, ''))}">${esc(facts.phone)}</a>` : ''}<a class="lt-btn" data-variant="primary" data-size="sm" href="${esc(action.href)}">${esc(action.label)}</a></div>
  <button type="button" data-part="toggle" aria-expanded="false" aria-controls="lt-ns-panel" aria-label="Menu"><svg class="lt-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  <div id="lt-ns-panel" data-part="panel" hidden><ul>${li}</ul></div>
</header>`;
}

/** The foot: the legal name, the two pages every site has, and where it is. */
export function footer({ product, facts, year }) {
  return `<footer class="lt-footer-min">
  <p>© ${year} ${esc(product ?? 'TODO: legal name')}</p>
  <nav aria-label="Footer"><ul><li><a href="/privacy">Privacy</a></li><li><a href="/terms">Terms</a></li></ul></nav>
  ${facts.place ? `<p data-part="made">${esc(facts.street ? `${facts.street}, ${facts.place}` : facts.place)}</p>` : ''}
</footer>`;
}

export { ARROW, imperative, figureHtml, figureStyle };
