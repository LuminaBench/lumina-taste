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

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const plainPrice = (v) => String(v).replace(/\s+(a|per)\s+.*/, '');
const ARROW = '<svg class="lt-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
  return s.length <= 64 ? s : null;
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

function offers(ctx) {
  const items = itemsFrom(ctx.facts);
  if (items.length < 2) return null;
  const tones = ['', ' data-tone="accent"', ' data-tone="ink"', ''];
  const li = items.slice(0, 4).map((it, k) => `    <li><article>
      <figure class="lt-art"${tones[k]}${it.price ? ' data-variant="figure"' : ''} data-shot="${esc(`A photograph of the ${it.name}${ctx.facts.place ? ` in ${ctx.facts.place}` : ''}, same light and ratio as the others, 4:5`)}">${it.price ? `${it.from ? '<p data-part="index">From</p>' : ''}<p data-part="figure"${figureStyle(it.price)}>${esc(it.price)}</p>` : `<p data-part="name">${esc(keepHyphens(cap(it.name)))}</p>`}${it.meta ? `<p data-part="fact">${esc(it.meta)}</p>` : ''}<figcaption class="lt-visually-hidden">${esc(`${cap(it.name)}${it.price ? `, ${it.from ? 'from ' : ''}${it.price}` : ''}`)}</figcaption></figure>
      <h3>${esc(keepHyphens(cap(it.name)))}</h3>${it.per ? `\n      <p>${esc(cap(it.per))}</p>` : ''}
    </article></li>`).join('\n');
  return { slug: 'range', label: 'Prices', html: `<section class="lt-offers" aria-labelledby="h-range">
  <header><h2 id="h-range">${esc(keepHyphens(listName(items.slice(0, 4)) ?? 'What it costs'))}</h2></header>
  <ul>
${li}
  </ul>
</section>` };
}

function tiles(ctx) {
  const items = itemsFrom(ctx.facts);
  if (items.length < 2) return null;
  const n = items.length;
  const art = items.map((it, k) => {
    // Spans that fill whole rows of three: 4 → wide, one, one, wide; 5 → wide then four; 2, 3 and 6 sit evenly.
    const span = (n === 4 && (k === 0 || k === 3)) || (n === 5 && k === 0) ? ' data-span="wide"' : '';
    // A long price ("£48,000") is set a step smaller so it never runs out of a narrow tile.
    const long = it.price && it.price.length > 5 ? ' style="font-size: clamp(2rem, 0.8rem + 4.2cqi, 3.75rem)"' : '';
    const fig = it.price ? `<p data-part="figure"${long}>${it.from ? '<small>from</small>' : ''}${esc(it.price)}</p>` : '';
    return `    <article${span}>${it.meta ? `<span class="lt-eyebrow">${esc(it.meta)}</span>` : ''}<h3>${esc(keepHyphens(cap(it.name)))}</h3>${it.per ? `<p>${esc(cap(it.per))}</p>` : ''}${fig}</article>`;
  }).join('\n');
  return { id: 'bento-grid', slug: 'prices', label: 'Prices', html: `<section class="lt-section" aria-labelledby="h-prices">
  <header><h2 id="h-prices">${esc(keepHyphens(listName(items) ?? 'What it costs'))}</h2></header>
  <div class="lt-bento" aria-label="What it costs">
${art}
  </div>
</section>` };
}

function steps(ctx) {
  const st = ctx.facts.steps;
  if (st.length < 3) return null;
  const items = st.slice(0, 5).map((s, k) => {
    const m = /\b(\d+)\s+(minutes?|hours?|days?|weeks?)\b/.exec(s);
    return `<li><span data-part="n">${k + 1}</span><h3>${esc(keepHyphens(cap(s)))}</h3>${m ? `<p>${esc(`${m[1]} ${m[2]}`)}</p>` : ''}</li>`;
  }).join('');
  return { id: 'how-it-works', slug: 'how', label: 'How it works', html: `<section class="lt-how-it-works" aria-labelledby="h-how">
  <header><h2 id="h-how">${esc(`${['', '', 'Two', 'Three', 'Four', 'Five'][Math.min(st.length, 5)]} steps`)}${ctx.product ? ` with ${esc(ctx.product)}` : ''}</h2></header>
  <ol>${items}</ol>
</section>` };
}

function people(ctx) {
  const ppl = ctx.facts.people;
  if (!ppl.length) return null;
  const li = ppl.map((p) => `<li><strong>${esc(p.name)}</strong><span>${esc(p.role ?? '')}</span></li>`).join('');
  return { slug: 'people', label: 'People', html: `<section class="lt-team-grid" data-variant="list" aria-labelledby="h-people">
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
    <div><h2 id="h-${slug}">${esc(keepHyphens(heading))}</h2>${lede ? `<p data-part="lede">${esc(lede)}</p>` : ''}</div>
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
  const heading = said ? cap(said) : service && ctx.action && product ? `${ctx.action} ${/^(give|donate)/i.test(ctx.action) ? 'to' : /^get/i.test(ctx.action) ? 'from' : 'with'} ${product}` : (other ?? price) ? ((p) => `${p.what ? `${cap(p.what.replace(/^fixed[-\s](?:fee|price)\s+/i, ''))}, ` : product ? `${product}, ` : ''}${p.from ? 'from ' : ''}${p.value}`)(other ?? price) : price ? `${price.what ? `${cap(price.what.replace(/^fixed[-\s](?:fee|price)\s+/i, ''))}, ` : product ? `${product}, ` : ''}${price.from ? 'from ' : ''}${price.value}` : ctx.action && product ? `${ctx.action} ${/^(give|donate)/i.test(ctx.action) ? 'to' : /^get/i.test(ctx.action) ? 'from' : 'with'} ${product}` : null;
  if (!heading) return null;
  const lede = facts.claims.length ? `${product ?? 'It'} ${facts.claims[0]}.` : hero.lede && !hero.lede.includes(heading) ? hero.lede : null;
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
  <div data-part="actions">${facts.phone ? `<a href="tel:${esc(facts.phone.replace(/[^\d+]/g, ''))}">${esc(facts.phone)}</a>` : ''}<a class="lt-btn" data-variant="primary" data-size="sm" href="${esc(action.href)}">${esc(action.label)}</a></div>
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
