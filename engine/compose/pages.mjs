// Drafts of the pages that are not a marketing story told band by band: pricing, contact, a product in a
// shop, checkout, docs, a changelog, a status page, sign-in, a 404, a directory and an article. Each keeps
// its blueprint's working anatomy (the same classes, parts, ids and states, so the blueprint's page styles
// and the kit's components apply) and fills it only with the brief's words: its plans and prices, its
// address and hours, its product and options, its basket, its services, its releases. What the brief does
// not give is left out and goes on the draft's TODO list; nothing is carried over from a sample business.
//
// Pure functions, no I/O: compose.mjs passes the facts, the model and a reader for seeded sample data.
import { esc, figureStyle, keepHyphens } from './draft.mjs';
import { plansFrom, basketFrom, servicesFrom, releasesFrom, optionsFrom, featuresFrom, plural } from './model.mjs';
import { motifFor, motifParts, sceneFor, sceneParts, navBar, footer } from './bands.mjs';
import { rankMotifs } from '../../scripts/lib/image-motifs.mjs';
import { cap, icon, field, segmented, iconFor } from './ui.mjs';
import { APP_PAGES } from './apps.mjs';

// Every page's top bar is ink (paper on a dark page): the top never shares its ground's hue.
const INK_BAR = { id: 'ink', variant: null, tone: 'dark' };

const brand = (ctx) => ctx.product ?? (ctx.facts.kind ? cap(ctx.facts.kind) : 'Home');
const tel = (p) => `tel:${String(p).replace(/[^\d+]/g, '')}`;
const year = () => new Date().getFullYear();
/** Short clauses of the brief that state a plain fact: "450 ml", "dishwasher safe", "made by hand in Cornwall". */
export function plainFacts(facts, { skip = [] } = {}) {
  const parts = String(facts.brief ?? '').split(/,(?!\d{3})\s*|;\s*/).slice(1).map((s) => s.trim().replace(/\.$/, ''));
  return parts.filter((p) => p && p.split(/\s+/).length <= 7 && !/[£$€:@]/.test(p) && !/^(?:an?|the)\s+[a-z-]+\s+(?:app|tool|shop|firm|studio|api|platform)\b/i.test(p) && !/\b(phone|email|open|how it works)\b/i.test(p) && !/\d{5,}/.test(p.replace(/\s/g, '')) && !skip.some((s) => s && p.toLowerCase().includes(String(s).toLowerCase()))).map(cap);
}
const deliveryClauses = (facts) => String(facts.brief ?? '').split(/,(?!\d{3})\s*|;\s*/).map((s) => s.trim()).filter((s) => /\b(deliver|delivery|shipping|postage|returns?|refunds?|collect)\b/i.test(s) && !/^(?:checkout|product page)/i.test(s)).map((s) => cap(s.replace(/\.$/, '')));

/** The page's one picture of its subject where there is no photograph: an art panel with the subject's drawing. */
function subjectPanel(ctx, { name, fact = null, ratio = '4/5', tone = '', shot, small = false, extra = '' }) {
  const m = motifParts(motifFor(`${name} ${ctx.facts.kind ?? ''}`, ctx), { small });
  return `<figure class="lt-art"${tone ? ` data-tone="${tone}"` : ''}${m.attr} data-ratio="${ratio}"${extra} data-shot="${esc(shot)}">${m.svg}<p data-part="name">${keepHyphens(esc(name))}</p>${fact ? `<p data-part="fact">${esc(fact)}</p>` : ''}<figcaption class="lt-visually-hidden">${esc(name)}</figcaption></figure>`;
}

// ---------------------------------------------------------------- pricing
function pricing(ctx) {
  const { facts, product } = ctx;
  const plans = plansFrom(facts, { product });
  const name = brand(ctx);
  const trial = /\b(\d+)-day free trial\b/i.exec(facts.brief)?.[0] ?? null;
  if (!plans.length) ctx.todo.push('the plans and their prices, as you charge them (one price is one plan; the draft never adds tiers)');
  if (plans.length >= 2) ctx.todo.push('what differs between the plans, line by line, if people need a comparison table');
  ctx.todo.push('the four questions people ask before they pay, with one-line answers (the questions band is left out until then)');
  const toggle = plans.some((p) => p.annual);
  const featured = plans.length === 1 ? 0 : plans.length === 2 ? 1 : Math.floor(plans.length / 2) - (plans.length % 2 ? 0 : 1) + (plans.length >= 3 ? 0 : 0);
  const per = (p, period) => [p.unit ? `per ${p.unit}` : null, period ? `a ${period === 'annual' ? 'year' : p.per ?? 'month'}` : null].filter(Boolean).join(' / ');
  const action = (p, k) => p.free ? 'Start free' : trial && k === featured ? `Start the ${trial.replace(/^\d+-day\s+/, (d) => d)}`.replace('Start the ', 'Start a ').replace(/free trial$/, 'trial') : ctx.hero.action ?? `Choose ${p.name}`;
  const tier = (p, k) => {
    const price = p.free ? `${ctx.m.sym}0` : p.price;
    const data = p.annual ? `<data data-monthly="${esc(p.price)}" data-annual="${esc(p.annual)}">${esc(p.price)}</data>` : `<data>${esc(price)}</data>`;
    const unit = p.free ? '' : p.annual ? `<span data-per-monthly="${esc(per(p, 'month'))}" data-per-annual="${esc(per(p, 'annual'))}">${esc(per(p, 'month'))}</span>` : p.per || p.unit ? `<span>${esc(per(p, p.per ? 'month' : null).replace('a month', `a ${p.per ?? 'month'}`))}</span>` : '';
    const feats = (p.features ?? []).map(cap);
    return `      <article class="pr-tier"${k === featured && plans.length > 1 ? ' data-featured' : ''}>
        <h2>${esc(p.name)}</h2>
        <p class="pr-price">${data}${unit}</p>
        <a class="lt-btn" data-variant="${k === featured ? 'primary' : 'secondary'}" href="#start"><span data-part="label">${esc(action(p, k))}</span></a>
        ${feats.length ? `<ul>${feats.map((f) => `<li>${icon('check')}${esc(f)}</li>`).join('')}</ul>` : ''}
      </article>`;
  };
  const one = plans.length === 1 ? plans[0] : null;
  const h1 = one && !one.free ? `Everything ${name} does, in one plan` : `${name} pricing`;
  const lede = [plans.length > 1 ? `${['', 'One', 'Two', 'Three', 'Four', 'Five'][plans.length] ?? plans.length} plans${plans.some((p) => p.free) ? ', one of them free' : ''}.` : one ? `${one.price} a ${one.per ?? 'month'}${one.unit ? ` per ${one.unit}` : ''}${one.annual ? `, or ${one.annual} a year` : ''}.` : null, trial ? `${cap(trial)}.` : null].filter(Boolean).join(' ') || null;
  const navAction = plans.length ? action(plans[featured], featured) : ctx.hero.action ?? 'Sign up';
  const contact = facts.email ? `<a class="bp-link" href="mailto:${esc(facts.email)}">${esc(facts.email)}</a>` : facts.phone ? `<a class="bp-link" href="${tel(facts.phone)}">${esc(facts.phone)}</a>` : null;
  const body = `${navBar({ product: name, links: [], action: { label: navAction, href: '#start' }, facts, style: INK_BAR })}
  <main id="main">
    <section class="pr-hero bp-container" id="top">
      <h1 class="lt-h1">${keepHyphens(esc(h1))}</h1>
      ${lede ? `<p class="lt-lede">${esc(lede)}</p>` : ''}
      ${toggle ? segmented('Billing period', [{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Yearly' }], { id: 'billing', attrs: ' data-billing' }) : ''}
    </section>
    ${plans.length ? `<section class="pr-tiers bp-container" aria-label="Plans" data-count="${plans.length}" id="start">
${plans.map(tier).join('\n')}
    </section>` : ''}
    ${toggle ? `<p class="pr-billnote bp-container" aria-live="polite" data-billnote data-monthly="Billed monthly." data-annual="${esc(`${plans.find((p) => p.annual).annual} billed once a year.`)}">Billed monthly.</p>` : ''}
    ${contact ? `<section class="bp-narrow pr-faq" aria-labelledby="ask-h"><h2 class="lt-h3" id="ask-h">Questions before you choose</h2><p class="pr-contact">Ask ${esc(name)} at ${contact}.</p></section>` : ''}
  </main>
  ${footer({ product: name, facts, year: year() })}`;
  return { body, title: `Pricing · ${name}`, desc: [h1, lede].filter(Boolean).join('. '), css: 'pricing' };
}

// ---------------------------------------------------------------- contact
function contact(ctx) {
  const { facts } = ctx;
  const name = brand(ctx);
  const where = [facts.building, facts.street, [facts.place, facts.postcode].filter(Boolean).join(' ')].filter(Boolean);
  if (!facts.phone && !facts.email) ctx.todo.push('an email address or phone number people can use');
  if (!where.length) ctx.todo.push('the address, if people visit');
  ctx.todo.push('the questions people ask before they get in touch, with one-line answers (left out until then)');
  const big = facts.phone ?? facts.email ?? null;
  const scene = sceneParts(sceneFor(`${facts.kind ?? ''} ${facts.offers.join(' ')}`, ctx));
  const visitBand = ctx.bands.visit;
  const ways = [facts.phone ? `<div><dt>Phone</dt><dd><a href="${tel(facts.phone)}">${esc(facts.phone)}</a></dd></div>` : '', facts.email ? `<div><dt>Email</dt><dd><a href="mailto:${esc(facts.email)}">${esc(facts.email)}</a></dd></div>` : '', where.length && !visitBand ? `<div><dt>Address</dt><dd>${where.map(esc).join('<br>')}</dd></div>` : ''].join('');
  const lede = [ctx.facts.days ? `Open ${facts.days}${facts.times.find((t) => t.what === 'hours') ? `, ${facts.times.find((t) => t.what === 'hours').value}` : ''}.` : null].filter(Boolean).join(' ') || null;
  const visit = ctx.bands.visit;
  const body = `${navBar({ product: name, links: visit ? [{ slug: 'visit', label: 'Find us' }] : [], action: { label: 'Send a message', href: '#message' }, facts, style: INK_BAR })}
<main id="main" data-scroll>
<section class="lt-hero-split" id="top" data-entrance data-rhythm="busy" data-scale="display">
  <div data-part="copy">
    <h1>${keepHyphens(esc(`Talk to ${name}`))}</h1>
    ${lede ? `<p data-part="lede">${esc(lede)}</p>` : ''}
    ${ways ? `<dl class="ct-ways">${ways}</dl>` : ''}
  </div>
  <div data-part="visual">
    ${big ? `<figure class="lt-art" data-variant="figure" data-tone="dark" data-frame data-ratio="5/4"${scene.attr} data-shot="${esc(`A photograph of ${facts.kind ? `the ${facts.kind}` : name}${facts.place ? ` in ${facts.place}` : ''}, real light, 5:4`)}">${scene.svg}<p data-part="figure" class="ct-figure" style="font-size: clamp(1.75rem, 7cqi, 4rem)">${esc(big)}</p><p data-part="name">${esc(facts.phone ? 'Call' : 'Write')}</p>${facts.place ? `<p data-part="fact">${esc(facts.place)}</p>` : ''}<figcaption class="lt-visually-hidden">${esc(`${name}: ${big}`)}</figcaption></figure>` : subjectPanel(ctx, { name, fact: facts.place, ratio: '5/4', tone: 'dark', shot: `A photograph of ${name}, real light, 5:4` })}
  </div>
</section>
<section class="lt-section" id="message" aria-labelledby="h-message" data-tone="well" data-rhythm="quiet">
  <div class="ct-split">
    <div><h2 id="h-message">Send a message</h2>${facts.email ? `<p>${esc(`It goes to ${facts.email}.`)}</p>` : ''}</div>
    <form class="ct-form lt-form-demo" data-lt="text-field" data-say-form="Sent. Thank you." data-say-to="#ct-msg" novalidate>
      ${field({ id: 'ct-name', label: 'Name', auto: 'name' })}
      ${field({ id: 'ct-email', label: 'Email', type: 'email', auto: 'email', help: `${name} replies to this address.` })}
      <label class="ct-area" for="ct-text">Message<textarea id="ct-text" name="message" required rows="3"></textarea></label>
      <button type="submit" class="lt-btn" data-variant="primary" data-size="lg"><span data-part="label">Send message</span></button>
      <p id="ct-msg" role="status" class="ct-msg"></p>
    </form>
  </div>
</section>
${visit ? visit.replace(/^<section class="lt-visit"/, '<section class="lt-visit" id="visit" data-tone="dark" data-rhythm="busy"').replace(/\sid="visit"(?=[^>]*\sid="visit")/, '') : ''}
</main>
${footer({ product: name, facts, year: year() })}`;
  return { body, title: `Contact · ${name}`, desc: `How to reach ${name}${facts.place ? ` in ${facts.place}` : ''}.`, css: null, uses: ['hero-split', 'text-field'] };
}

// ---------------------------------------------------------------- a product in a shop
function store(ctx) {
  const { facts, product } = ctx;
  const b = String(facts.brief ?? '');
  // The thing on sale: "Product page for the large stoneware mug, …" → "Large stoneware mug".
  const thingM = /\b(?:product page|page|listing)\s+for\s+(?:a|an|the|our)?\s*(.+?)(?=,|\s+(?:from|by|made|at|for)\s|$)/i.exec(b);
  let thing = thingM ? thingM[1].replace(new RegExp(`^${(product ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:'s|’s)?\\s+`, 'i'), '').trim() : null;
  if (thing && product && thing.toLowerCase() === product.toLowerCase()) thing = null;
  // "Tidewater Pottery large stoneware mug": the capitalised words in front are the maker.
  let maker = product;
  const lead = thing ? /^((?:[A-Z][\w'’&-]*\s+){1,4})(?=[a-z])/.exec(thing) : null;
  if (lead) { maker = maker ?? lead[1].trim().replace(/(?:'s|’s)$/, ''); thing = thing.slice(lead[0].length); }
  const title = thing ? cap(thing) : product ?? 'The product';
  const price = facts.prices.find((p) => !/deliver|shipping|postage|over/i.test(`${p.what ?? ''} ${b.slice(0, b.indexOf(p.text)).split(',').pop()}`));
  const options = optionsFrom(facts);
  const details = plainFacts(facts, { skip: [thing, ...options.flatMap((o) => o.values)] });
  const delivery = deliveryClauses(facts);
  if (!price) ctx.todo.push('the price');
  ctx.todo.push('photographs of the product (the panels show its drawing until then)');
  ctx.todo.push('reviews from real buyers, if you have them (never invented; the reviews band is left out)');
  if (!delivery.length) ctx.todo.push('delivery times and costs, and how returns work');
  const name = maker ?? brand(ctx);
  const tones = ['dark', 'accent', ''];
  const motif = rankMotifs(title.split(/\s+/).pop().replace(/s$/, ''))[0] ?? rankMotifs(title.replace(/\b(\w{4,})s\b/g, '$1'))[0] ?? motifFor(`${title} ${facts.kind ?? ''}`, ctx);
  const shots = [title, ...options[0]?.values.slice(0, 2) ?? []].slice(0, 3);
  const mp = motifParts(motif);
  const sc = sceneParts(sceneFor(title, ctx) && [motif, ...ctx.scene.filter((n) => n !== motif)].slice(0, 3));
  const stage = shots.map((s, k) => `<div data-shot="s${k}"${k ? ' hidden' : ''}><figure class="lt-art"${tones[k] ? ` data-tone="${tones[k]}"` : ''}${k === 0 && sc.attr ? sc.attr : mp.attr} data-ratio="1/1" data-shot="${esc(`A photograph of the ${k ? `${s} ` : ''}${title.toLowerCase()} on a plain ground, soft side light, 1:1`)}">${k === 0 && sc.svg ? sc.svg : mp.svg}<p data-part="name">${esc(k ? s : maker ?? title)}</p><p data-part="fact">${esc(k ? title : maker ? title : details[0] ?? '')}</p><figcaption class="lt-visually-hidden">${esc(k ? `${title}, ${s}` : title)}</figcaption></figure></div>`).join('');
  const thumbs = shots.length > 1 ? `<div class="sp-thumbs" role="group" aria-label="Choose a view" data-thumbs data-count="${shots.length}">${shots.map((s, k) => `<button type="button" aria-pressed="${k === 0}" data-shot="s${k}"><span class="sp-t lt-art"${tones[k] ? ` data-tone="${tones[k]}"` : ''}${mp.attr} data-ratio="1/1" aria-hidden="true">${mp.svg}</span><span class="lt-visually-hidden">${esc(k ? s : title)}</span></button>`).join('')}</div>` : '';
  const opt = options.map((o, k) => `<fieldset class="sp-field"><legend>${esc(o.label)}</legend><div class="sp-chips">${o.values.map((v, j) => `<label><input type="radio" name="opt${k}" value="${esc(v)}"${j === 0 ? ' checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div></fieldset>`).join('\n          ');
  const acc = [details.length ? ['Details', details.join('. ') + '.'] : null, delivery.length ? ['Delivery and returns', delivery.join('. ') + '.'] : null].filter(Boolean);
  const body = `<header class="lt-nav-centered">
    <nav aria-label="Shop"><ul><li><a href="#main" aria-current="page">Shop</a></li></ul></nav>
    <a href="#main" data-part="brand">${esc(name)}</a>
    <div data-part="actions"><a href="#buy" aria-label="Bag" data-part="bag">${icon('inbox', 18)}</a></div>
  </header>
  <main id="main" class="bp-container sp-main">
    <div class="sp-split">
      <section class="sp-gallery" aria-label="Pictures">
        <div class="sp-stage sp-art" data-stage>${stage}</div>
        ${thumbs}
      </section>
      <section class="sp-buy" aria-labelledby="sp-name" id="buy">
        ${maker && thing ? `<p class="lt-eyebrow">${esc(maker)}</p>` : ''}
        <h1 id="sp-name" class="lt-h2">${keepHyphens(esc(title))}</h1>
        ${details[0] ? `<p class="sp-notes">${esc(details.slice(0, 3).join(' · '))}</p>` : ''}
        ${price ? `<p class="sp-price"><data value="${esc(price.value.replace(/[^\d.]/g, ''))}">${esc(price.value.replace(/\s.*$/, ''))}</data></p>` : ''}
        <form class="sp-form" data-say-form="Added to your bag." data-say-to="#sp-msg">
          ${opt}
          <div data-view="ready">
            <button type="submit" class="lt-btn sp-add" data-variant="primary" data-size="lg"><span data-part="label">Add to bag${price ? ` · ${esc(price.value.replace(/\s.*$/, ''))}` : ''}</span></button>
            ${delivery[0] ? `<p class="sp-ship">${icon('clock')} ${esc(delivery[0])}.</p>` : ''}
          </div>
          <div class="sp-sold" data-view="sold-out" hidden>
            <p><strong>Sold out for now.</strong> Leave your email and ${esc(name)} will write when it is back.</p>
            <button type="button" class="lt-btn" data-variant="secondary" data-size="lg"><span data-part="label">Notify me</span></button>
          </div>
          <p class="sp-msg" role="status" id="sp-msg"></p>
        </form>
        ${acc.length ? `<div class="lt-accordion sp-acc" data-lt="accordion">
${acc.map(([h, t], k) => `      <div data-part="item"><h2 data-part="heading"><button type="button" data-part="trigger" id="sp-acc-t${k}" aria-expanded="${k === 0}" aria-controls="sp-acc-p${k}">${esc(h)}${icon('down')}</button></h2><div data-part="panel" id="sp-acc-p${k}" role="region" aria-labelledby="sp-acc-t${k}" data-state="${k === 0 ? 'open' : 'closed'}"><div data-part="inner"><p>${esc(t)}</p></div></div></div>`).join('\n')}
        </div>` : ''}
      </section>
    </div>
  </main>
  <div class="lt-actionbar sp-mobilebar" role="region" aria-label="Buy" data-view="ready">
    <p><strong>${esc(price ? price.value.replace(/\s.*$/, '') : title)}</strong>${delivery[0] ? `<span>${esc(delivery[0])}</span>` : ''}</p>
    <a class="lt-btn" data-variant="primary" data-size="lg" href="#buy">Add to bag</a>
  </div>
  ${footer({ product: name, facts, year: year() })}`;
  return { body, title: `${title} · ${name}`, desc: `${title}${price ? `, ${price.value}` : ''}${details[0] ? `. ${details.slice(0, 2).join(', ')}` : ''}.`, css: 'store' };
}

// ---------------------------------------------------------------- checkout
function checkout(ctx) {
  const { facts } = ctx;
  const name = brand(ctx);
  const { items, delivery, freeOver, sym } = basketFrom(facts);
  if (!items.length) ctx.todo.push('what is in the basket, with each price');
  if (!delivery.length) ctx.todo.push('the delivery options and their prices');
  const sub = items.reduce((a, it) => a + it.qty * it.price, 0);
  const fmt = (n) => `${sym}${n.toFixed(2)}`;
  const ship0 = delivery[0]?.price ?? 0;
  const freeN = freeOver ? Number(freeOver.replace(/[^\d.]/g, '')) : 0;
  const total = sub + (freeN && sub >= freeN ? 0 : ship0);
  const lines = items.map((it) => `<li data-line="${(it.qty * it.price).toFixed(2)}"><span><strong>${esc(it.name)}</strong><span>${it.qty} × ${esc(fmt(it.price))}</span></span><data value="${(it.qty * it.price).toFixed(2)}">${esc(fmt(it.qty * it.price))}</data></li>`).join('');
  const returns = deliveryClauses(facts).filter((c) => /return|refund/i.test(c));
  const body = `<header class="co-top bp-container">
    <a class="co-brand" href="#main">${esc(name)}</a>
    <p class="co-secure">${icon('lock')} Secure checkout</p>
  </header>
  <main id="main" class="bp-container co">
    <h1 class="lt-h2">Checkout</h1>
    <ol class="co-steps" aria-label="Checkout steps"><li aria-current="step"><span>1</span>Details</li>${delivery.length ? '<li><span>2</span>Delivery</li>' : ''}<li><span>${delivery.length ? 3 : 2}</span>Payment</li></ol>
    <div class="co-split">
      <form class="co-form" id="co-form" data-lt="text-field" data-total-form data-currency="${esc(sym)}"${freeN ? ` data-free-over="${freeN}"` : ''} novalidate>
        <aside class="lt-callout co-error" data-tone="negative" data-view="error" role="alert" hidden>
          <span data-part="icon">${icon('alert')}</span>
          <div><strong>Your card was declined</strong><p>Nothing was charged. Check the card number and expiry date, or use another card.</p></div>
        </aside>
        <section class="co-sec" aria-labelledby="co-contact-h">
          <h2 id="co-contact-h">Contact</h2>
          ${field({ id: 'co-email', label: 'Email', type: 'email', auto: 'email', help: 'For your receipt.' })}
        </section>
        <section class="co-sec" aria-labelledby="co-addr-h">
          <h2 id="co-addr-h">Delivery address</h2>
          ${field({ id: 'co-name', label: 'Full name', auto: 'name' })}
          ${field({ id: 'co-line1', label: 'Address', auto: 'address-line1' })}
          <div class="co-row">
            ${field({ id: 'co-city', label: 'Town or city', auto: 'address-level2' })}
            ${field({ id: 'co-post', label: 'Postcode', auto: 'postal-code' })}
          </div>
        </section>
        ${delivery.length ? `<fieldset class="lt-radio-cards co-sec co-ship">
          <legend>Delivery</legend>
          ${delivery.map((d, k) => `<label data-part="card"><input type="radio" name="ship" value="${d.price}"${k === 0 ? ' checked data-standard' : ''}><span data-part="check" aria-hidden="true">${icon('check', 14)}</span><span data-part="title">${esc(d.name)}</span>${k === 0 && freeOver ? `<span data-part="desc">${esc(`Free over ${freeOver}`)}</span>` : ''}<span data-part="price"><data value="${d.price}">${esc(fmt(d.price))}</data></span></label>`).join('\n          ')}
        </fieldset>` : ''}
        <section class="co-sec" aria-labelledby="co-pay-h">
          <h2 id="co-pay-h">Payment</h2>
          ${field({ id: 'co-card', label: 'Card number', auto: 'cc-number', mode: 'numeric', extra: ' data-card' })}
          <div class="co-row">
            ${field({ id: 'co-exp', label: 'Expiry (MM/YY)', auto: 'cc-exp' })}
            ${field({ id: 'co-cvc', label: 'Security code', auto: 'cc-csc', mode: 'numeric' })}
          </div>
        </section>
        <button type="submit" class="lt-btn co-pay" data-variant="primary" data-size="lg">${icon('lock')}<span data-part="label">Pay <span data-total>${esc(fmt(total))}</span></span></button>
        <p class="co-fine" data-sent="Thank you. Your order is placed.">You will not be charged until you press Pay.${returns[0] ? ` ${esc(returns[0])}.` : ''}</p>
      </form>
      <section class="lt-order co-summary" aria-labelledby="co-sum-h">
        <h2 id="co-sum-h">Order summary</h2>
        <ul>${lines}</ul>
        <dl>
          <div><dt>Subtotal</dt><dd data-part="subtotal">${esc(fmt(sub))}</dd></div>
          ${delivery.length ? `<div><dt>Delivery</dt><dd data-ship-cost data-free="Free">${esc(freeN && sub >= freeN ? 'Free' : fmt(ship0))}</dd></div>` : ''}
          <div data-part="total-row"><dt>Total</dt><dd data-part="total" data-total>${esc(fmt(total))}</dd></div>
        </dl>
      </section>
    </div>
  </main>`;
  return { body, title: `Checkout · ${name}`, desc: `Checkout for ${name}.`, css: 'checkout' };
}

// ---------------------------------------------------------------- docs
function docs(ctx) {
  const { facts, product } = ctx;
  const name = brand(ctx);
  const quoted = /["“]([^"”]{3,60})["”]/.exec(facts.brief ?? '')?.[1];
  const title = quoted && /\s[a-z]/.test(quoted) ? cap(quoted) : `Get started with ${name}`;
  const steps = facts.steps.length ? facts.steps.map(cap) : [];
  const recs = ctx.m.records.filter((r) => r.fromBrief).map((r) => cap(r.many));
  if (!steps.length) ctx.todo.push('the steps a new user takes, in order (each becomes a heading in the guide)');
  ctx.todo.push('one or two sentences under each heading, and real code or commands where a step needs them (no sample code is drafted)');
  const lede = [facts.kind ? `${name} is ${/^[aeiou]/i.test(facts.kind) ? 'an' : 'a'} ${facts.kind}${facts.audience ? ` for ${facts.audience}` : ''}.` : null, facts.claims[0] ? `It ${facts.claims[0]}.` : null].filter(Boolean).join(' ') || null;
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const tree = [{ label: 'Getting started', kids: steps.length ? steps : [title] }, ...(recs.length ? [{ label: 'Concepts', kids: recs }] : [])];
  const body = `<header class="dc-top">
    <a class="dc-brand" href="#main">${esc(name)} <span>Docs</span></a>
    <div class="lt-search" data-lt="search-input" data-shortcut="k">
      ${icon('search')}<label class="lt-visually-hidden" for="docs-q">Search the docs</label>
      <input id="docs-q" type="search" placeholder="Search the docs" autocomplete="off" spellcheck="false">
      <button type="button" data-part="clear" aria-label="Clear search" hidden>${icon('x', 14)}</button>
      <kbd data-part="shortcut" aria-hidden="true"><span data-part="mod">⌘</span>K</kbd>
    </div>
  </header>
  <div class="dc-layout">
    <nav class="dc-nav" aria-label="Documentation">
      <ul class="lt-tree" data-lt="tree-view" role="tree" aria-label="Documentation sections">
${tree.map((g, gi) => `        <li role="treeitem" aria-expanded="${gi === 0}" aria-selected="false" tabindex="${gi === 0 ? 0 : -1}"><span data-part="row"><span data-part="twisty">${icon('next', 14)}</span>${icon('folder', 14)}<span>${esc(g.label)}</span></span>
          <ul role="group">${g.kids.map((k, ki) => `<li role="treeitem" aria-selected="${gi === 0 && ki === 0}" tabindex="-1"><span data-part="row"><span data-part="twisty"></span>${icon('doc', 14)}<span>${esc(k)}</span></span></li>`).join('')}</ul>
        </li>`).join('\n')}
      </ul>
    </nav>
    <main id="main" class="dc-article">
      <nav class="lt-crumbs" data-lt="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="#main">Docs</a></li><li><span aria-current="page">${esc(title)}</span></li></ol></nav>
      <h1 class="lt-h2">${keepHyphens(esc(title))}</h1>
      ${lede ? `<p class="lt-lede">${esc(lede)}</p>` : ''}
      ${steps.length ? `<ol class="dc-steps">${steps.map((s, k) => `<li id="${slug(s)}"><span aria-hidden="true">${k + 1}</span><h2>${keepHyphens(esc(s))}</h2></li>`).join('')}</ol>` : ''}
    </main>
    ${steps.length >= 2 ? `<nav class="dc-rail lt-toc" data-lt="scrollspy-toc" aria-label="On this page"><p data-part="title">On this page</p><ol>${steps.map((s) => `<li><a href="#${slug(s)}">${esc(s)}</a></li>`).join('')}</ol></nav>` : ''}
  </div>`;
  return { body, title: `${title} · ${name} docs`, desc: lede ?? title, css: 'docs' };
}

// ---------------------------------------------------------------- changelog
function changelog(ctx) {
  const { facts } = ctx;
  const name = brand(ctx);
  let rel = releasesFrom(facts);
  if (!rel.length) {
    ctx.todo.push('the releases: version, date and what changed in each (the draft lists what the product does as its first release, undated)');
    rel = featuresFrom(facts).slice(0, 6).map((f) => ({ version: null, date: null, tag: 'new', title: f }));
  }
  if (!rel.some((r) => r.date)) ctx.todo.push('the date of each release');
  ctx.todo.push('one sentence under each release that says what people can now do');
  const tags = [...new Set(rel.map((r) => r.tag))];
  const label = { new: 'New', improved: 'Improved', fixed: 'Fixed' };
  const tone = { new: ' data-tone="accent"', improved: ' data-tone="positive"', fixed: '' };
  const body = `${navBar({ product: name, links: [], action: { label: ctx.hero.action ?? 'Sign up', href: '#main' }, facts, style: INK_BAR })}
  <main id="main" class="bp-narrow cl">
    <header class="cl-head">
      <h1 class="lt-h1">${keepHyphens(esc(`What changed in ${name}`))}</h1>
      <p class="lt-lede">${rel.length} change${rel.length === 1 ? '' : 's'}, newest first.</p>
    </header>
    ${rel[0].version ? (() => { const mp = motifParts(motifFor(`${rel[0].title} ${facts.kind ?? ''}`, ctx), { small: true }); return `<figure class="lt-art cl-latest" data-variant="figure" data-tone="dark" data-ratio="16/9"${mp.attr} data-shot="${esc(`A screenshot of ${rel[0].title.toLowerCase()} in ${name}, 16:7`)}">${mp.svg}<p data-part="index">Latest</p><p data-part="figure">${esc(rel[0].version)}</p><p data-part="name">${esc(rel[0].title)}</p><figcaption class="lt-visually-hidden">${esc(`Latest release: ${rel[0].version}, ${rel[0].title}`)}</figcaption></figure>`; })() : ''}
    ${tags.length > 1 ? segmented('Show', [{ value: 'all', label: 'All' }, ...tags.map((t) => ({ value: t, label: label[t] }))], { id: 'cl-filter', attrs: ' data-tag-filter=".cl-list li"' }) : ''}
    <section aria-labelledby="cl-rel-h">
      <h2 id="cl-rel-h" class="lt-visually-hidden">Releases</h2>
      <ol class="lt-timeline cl-list">
${rel.map((r, k) => `        <li data-tag="${r.tag}"${k === 0 ? ' data-tone="accent"' : ''}>${r.date || r.version ? `<time>${esc(r.date ?? '')}${r.version ? `<span class="cl-ver">${esc(r.version)}</span>` : ''}</time>` : ''}<h3><span class="lt-badge"${tone[r.tag]}>${label[r.tag]}</span> ${keepHyphens(esc(r.title))}</h3></li>`).join('\n')}
      </ol>
    </section>
  </main>
  ${footer({ product: name, facts, year: year() }).replace('class="lt-footer-min"', 'class="lt-footer-min bp-narrow"')}`;
  return { body, title: `Changelog · ${name}`, desc: `What changed in ${name}, newest first.`, css: 'changelog' };
}

// ---------------------------------------------------------------- status
function status(ctx) {
  const { facts, product } = ctx;
  const name = brand(ctx);
  const svc = servicesFrom(facts, { product });
  if (!svc.fromBrief) ctx.todo.push('the services people depend on, by the names they know them by (for example "services: API, dashboard, email")');
  ctx.todo.push('real uptime for each service, from your monitoring (the bars show 90 working days until it is connected)');
  ctx.todo.push('past incidents, with what happened and what changed after (the history is left out until then)');
  const body = `<header class="sp-top bp-narrow">
    <a class="sp-brand" href="#main">${esc(name)} <span>Status</span></a>
    <a class="lt-btn" data-variant="ghost" data-size="sm" href="#subscribe">${icon('bell')}<span data-part="label">Get updates</span></a>
  </header>
  <main id="main" class="bp-narrow sp">
    <h1 class="lt-h2">${esc(`${name} status`)}</h1>
    <div class="sp-now" data-view="ready" role="status"><span class="sp-icon" aria-hidden="true">${icon('ok', 28)}</span><div><strong>All systems working</strong><p>${esc(`${svc.list.length} service${svc.list.length === 1 ? '' : 's'} checked.`)}</p></div></div>
    <aside class="lt-callout sp-incident" data-tone="warning" data-view="incident" role="status" hidden>
      <span data-part="icon">${icon('alert')}</span>
      <div><strong>${esc(`${svc.list[0]} is slower than usual`)}</strong><p>${esc(`We are looking into it. ${svc.list.length > 1 ? `${svc.list.slice(1).join(', ')} ${svc.list.length > 2 ? 'are' : 'is'} not affected. ` : ''}Updates appear here as they happen.`)}</p></div>
    </aside>
    <section class="lt-uptime" aria-labelledby="sp-svc-h">
      <header><h2 id="sp-svc-h">${esc(`Each ${name} service over the last 90 days`)}</h2><p class="sp-legend"><span data-s="ok"></span>Working <span data-s="warn"></span>Degraded <span data-s="down"></span>Outage</p></header>
${svc.list.map((s) => `        <div data-part="svc"><p><strong>${esc(s)}</strong></p><ol aria-label="${esc(s)}, last 90 days" data-days=""></ol></div>`).join('\n')}
      <footer><span>90 days ago</span><span>Today</span></footer>
    </section>
    <section class="sp-section sp-subscribe" id="subscribe" aria-labelledby="sp-sub-h">
      <div><h2 id="sp-sub-h" class="lt-h3">Get incident updates</h2><p class="lt-secondary">One email when something breaks and one when it is fixed.</p></div>
      <form class="sp-form" data-subscribe data-bad="Enter a full email address." data-good="Subscribed. Confirm from the email sent to {email}." novalidate>
        <label class="lt-visually-hidden" for="sp-email">Email address</label>
        <input id="sp-email" type="email" placeholder="you@company.com" autocomplete="email" required>
        <button type="submit" class="lt-btn" data-variant="primary"><span data-part="label">Subscribe</span></button>
        <p class="sp-msg" role="status"></p>
      </form>
    </section>
  </main>
  ${footer({ product: name, facts, year: year() }).replace('class="lt-footer-min"', 'class="lt-footer-min bp-narrow"')}`;
  return { body, title: `Status · ${name}`, desc: `Whether ${name} is working, service by service.`, css: 'status' };
}

// ---------------------------------------------------------------- sign in
function auth(ctx) {
  const { facts } = ctx;
  const name = brand(ctx);
  const firstStep = facts.steps[0] ? cap(facts.steps[0]) : null;
  const claim = facts.claims[0] ? `${name} ${facts.claims[0]}.` : facts.kind ? `${cap(/^(an?|the)\s/i.test(facts.kind) ? facts.kind : `${/^[aeiou]/i.test(facts.kind) ? 'An' : 'A'} ${facts.kind}`)}${facts.audience ? ` for ${facts.audience}` : ''}.` : null;
  if (!claim) ctx.todo.push('one sentence on what the product does, for the side panel');
  const otp = `<div data-part="fields"><input inputmode="numeric" autocomplete="one-time-code" maxlength="1" aria-label="Digit 1"><input inputmode="numeric" maxlength="1" aria-label="Digit 2"><input inputmode="numeric" maxlength="1" aria-label="Digit 3"><span data-part="sep" aria-hidden="true"></span><input inputmode="numeric" maxlength="1" aria-label="Digit 4"><input inputmode="numeric" maxlength="1" aria-label="Digit 5"><input inputmode="numeric" maxlength="1" aria-label="Digit 6"></div>`;
  const m = motifParts(motifFor(`${facts.kind ?? ''} ${facts.claims.join(' ')}`, ctx));
  const body = `<main class="au" id="main">
    <aside class="au-side" aria-label="About ${esc(name)}">
      <a class="au-brand" href="#main">${esc(name)}</a>
      ${claim ? `<figure class="au-quote"><blockquote><p>${esc(claim)}</p></blockquote></figure>` : ''}
      ${m.attr ? `<figure class="lt-art au-art"${m.attr} data-ratio="3/2" data-tone="accent" data-shot="${esc(`A photograph of ${name} in use, 4:3`)}">${m.svg}<figcaption class="lt-visually-hidden">${esc(name)}</figcaption></figure>` : ''}
      <p class="au-legal">© ${year()} ${esc(name)} · <a href="/privacy">Privacy</a></p>
    </aside>
    <section class="au-main" aria-live="polite">
      <div class="au-card" id="step-email" data-step data-next="step-code">
        <h1 class="lt-h2">${esc(`Sign in to ${name}`)}</h1>
        <p class="lt-secondary">We will email you a 6-digit code. No password needed.</p>
        <form class="lt-form-demo" data-lt="text-field" novalidate>
          ${field({ id: 'au-email', label: 'Email', type: 'email', auto: 'email' })}
          <button type="submit" class="lt-btn" data-variant="primary" data-size="lg"><span data-part="label">Email me a code</span></button>
        </form>
      </div>
      <div class="au-card" id="step-code" data-step data-next="step-done" hidden>
        <button type="button" class="lt-btn au-back" data-variant="ghost" data-size="sm" data-goto-step="step-email">${icon('back')}<span data-part="label">Change email</span></button>
        <h1 class="lt-h2">Check your inbox</h1>
        <p class="lt-secondary">Enter the code sent to <strong data-echo>your email</strong>.</p>
        <fieldset class="lt-otp" data-lt="otp-input" id="otp">
          <legend class="lt-visually-hidden">6-digit sign-in code</legend>
          ${otp}
          <p data-part="status" role="status" aria-live="polite"></p>
        </fieldset>
      </div>
      <div class="au-card au-done" id="step-done" data-step hidden>
        <span class="au-done-icon" aria-hidden="true">${icon('check', 28)}</span>
        <h1 class="lt-h2">You are in</h1>
        <p class="lt-secondary">${esc(firstStep ? `Next: ${firstStep.replace(/^./, (c) => c.toLowerCase())}.` : `${name} is ready.`)}</p>
        <a class="lt-btn" data-variant="primary" data-size="lg" href="#main"><span data-part="label">${esc(firstStep && firstStep.split(' ').length <= 5 ? firstStep : `Open ${name}`)}</span></a>
      </div>
    </section>
  </main>`;
  return { body, title: `Sign in · ${name}`, desc: `Sign in to ${name}.`, css: 'auth' };
}

// ---------------------------------------------------------------- 404
function notFound(ctx) {
  const { facts } = ctx;
  const name = brand(ctx);
  const m = motifParts(motifFor(`${facts.kind ?? ''} document`, ctx), { small: true });
  const links = ctx.m.records.filter((r) => r.fromBrief).slice(0, 3).map((r) => cap(r.many));
  const body = `${navBar({ product: name, links: [], action: { label: `Go to ${name}`, href: '/' }, facts, style: INK_BAR })}
<main id="main" class="nf">
  <section class="nf-card" aria-labelledby="nf-h">
    <figure class="lt-art" data-variant="figure" data-tone="dark" data-ratio="16/9"${m.attr} data-shot="none">${m.svg}<p data-part="figure">404</p><figcaption class="lt-visually-hidden">Page not found</figcaption></figure>
    <h1 id="nf-h" class="lt-h2">This page is not here</h1>
    <p class="lt-secondary">${esc(`The link may be old, or the page has moved. Search ${name}, or start from the home page.`)}</p>
    <form class="lt-search nf-search" data-lt="search-input" role="search" action="/search">${icon('search')}<label class="lt-visually-hidden" for="nf-q">${esc(`Search ${name}`)}</label><input id="nf-q" name="q" type="search" placeholder="${esc(`Search ${name}`)}" autocomplete="off"><button type="button" data-part="clear" aria-label="Clear search" hidden>${icon('x', 14)}</button></form>
    <p class="bp-row"><a class="lt-btn" data-variant="primary" href="/">${esc(`Go to ${name}`)}</a>${links.map((l) => `<a class="lt-btn" data-variant="ghost" href="/${esc(l.toLowerCase().replace(/\s+/g, '-'))}">${esc(l)}</a>`).join('')}</p>
  </section>
</main>
${footer({ product: name, facts, year: year() })}`;
  return { body, title: `Page not found · ${name}`, desc: `Page not found on ${name}.`, css: null };
}

// ---------------------------------------------------------------- an article
function article(ctx) {
  const { facts } = ctx;
  const name = brand(ctx);
  const about = /\babout\s+(.+?)(?=,|\.|$)/i.exec(facts.brief ?? '')?.[1] ?? null;
  const title = about ? cap(about) : null;
  if (!title) ctx.todo.push('what the article is about, as its headline');
  ctx.todo.push('the article itself: the drafted page has its headline, byline line and the shape of a long read, but no paragraphs (none are invented)');
  const author = facts.people[0]?.name ?? null;
  if (!author) ctx.todo.push('who wrote it');
  const sc = sceneFor(`${about ?? ''} ${facts.kind ?? ''}`, ctx);
  const m = sc ? sceneParts(sc) : motifParts(motifFor(`${about ?? ''} ${facts.kind ?? ''}`, ctx));
  const body = `${navBar({ product: name, links: [], action: { label: 'Subscribe', href: '/subscribe' }, facts, style: INK_BAR })}
<main id="main" data-scroll>
  <article class="lt-article" aria-labelledby="ar-h">
    <header class="ar-head">
      <h1 id="ar-h" class="lt-h1">${keepHyphens(esc(title ?? name))}</h1>
      ${author ? `<p class="lt-secondary">${esc(`By ${author}`)}</p>` : ''}
    </header>
    <figure class="lt-art ar-art"${m.attr} data-ratio="16/9" data-tone="accent" data-shot="${esc(`A photograph for the article${about ? ` about ${about}` : ''}, 16:9`)}">${m.svg}<figcaption class="lt-visually-hidden">${esc(title ?? name)}</figcaption></figure>
  </article>
</main>
${footer({ product: name, facts, year: year() })}`;
  return { body, title: `${title ?? 'Article'} · ${name}`, desc: title ?? name, css: null };
}

/** The drafts by page type. Marketing pages with a first screen are composed band by band instead. */
export const PAGES = { pricing, contact, 'store-product': store, checkout, docs, changelog, status, auth, 'not-found': notFound, blog: article, ...APP_PAGES };
export { plural };
