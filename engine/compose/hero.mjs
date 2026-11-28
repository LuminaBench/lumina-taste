// The first screen of a composed draft, in the composition the plan chose (engine/compose/compositions.mjs). Each
// builder starts from the kit's own markup for the block (so the components style it) and fills it from the
// brief: the headline, one sentence, one action, and the picture (a scene of the subject's own things, the
// product on a device, the board of prices or times, the range as a mosaic). Nothing from a sample business.
//
// Pure functions, no I/O: compose.mjs passes the block's markup and the draft's context.
import { esc, keepHyphens, setHeroVisual } from './draft.mjs';
import { heroPicture, itemsFrom, thingPanel, isSoftware } from './bands.mjs';
import { dateFrom, timetable } from './compositions.mjs';
import { rankMotifs } from '../../scripts/lib/image-motifs.mjs';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const words = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
const setAttrs = (html, attrs) => html.replace(/^<section\b([^>]*)>/, (m, rest) => `<section${rest.replace(/\s(data-variant|data-tone|data-calm)="[^"]*"/g, '')}${attrs}>`);

/** One sentence: the lede of a first screen is never a paragraph. */
export const oneSentence = (s) => (s ? (/^(.+?[.!?])(\s|$)/.exec(s)?.[1] ?? s) : s);

/**
 * The words budget of a first screen (the critic counts headline, eyebrow, lede and actions; 40 at most): drop
 * the line above the headline first, then the quiet link, then the lede.
 */
export function fitWords(copy, budget = 34) {
  const out = { ...copy, note: null, lede: oneSentence(copy.lede) };
  const count = () => words(out.eyebrow) + words(out.headline) + words(out.lede) + words(out.action ?? 'Get in touch') + words(out.secondary);
  for (const k of ['eyebrow', 'secondary', 'lede']) if (count() > budget) out[k] = null;
  return out;
}

/** Board rows from the brief: a menu of priced things, or a timetable of times to one place. */
export function boardRows(ctx, variant) {
  const { facts } = ctx;
  if (variant === 'departures') {
    const to = /\bto\s+([A-Z][\w'’]*(?:\s+[A-Z][\w'’]*)*)/.exec(facts.brief ?? '')?.[1] ?? facts.place ?? null;
    const from = /\bfrom\s+([A-Z][\w'’]*(?:\s+[A-Z][\w'’]*)*)/.exec(facts.brief ?? '')?.[1] ?? null;
    return { title: 'Departures', aside: from, rows: timetable(facts).slice(0, 6).map((t) => `<li><time datetime="${t}">${t}</time><b>${esc(to ?? 'Next')}</b></li>`) };
  }
  const items = itemsFrom(facts).filter((i) => i.price).slice(0, 6);
  return { title: facts.kind ? `At ${ctx.product ?? `the ${facts.kind}`}` : 'Prices', aside: facts.days ? `Open ${facts.days}` : null, rows: items.map((i) => `<li><b>${esc(cap(i.name))}</b><data value="${esc(i.price.replace(/[^\d.]/g, ''))}">${i.from ? 'from ' : ''}${esc(i.price)}</data>${i.meta ? `<small>${esc(i.meta)}</small>` : ''}</li>`) };
}

/**
 * The first screen's markup in the chosen composition.
 * @param {{ id: string, block: string, variant: string | null }} comp
 * @param {string} html the block's own markup with the brief's copy already applied (subjectHero)
 * @param {any} ctx the draft context (facts, product, hero copy, idea…)
 */
export function composeHero(comp, html, ctx) {
  const { facts, product } = ctx;
  let out = html;
  const v = comp.variant;
  if (comp.block === 'hero-split') {
    out = setAttrs(out, `${v ? ` data-variant="${v}"` : ''}${v === 'bleed' ? ' data-tone="dark" data-calm="start"' : ''}`);
    return out;
  }
  if (comp.block === 'hero-centered') {
    out = out.replace(/\s*<a data-part="pill"[\s\S]*?<\/a>/, '').replace(/(<a class="lt-btn"[^>]*data-variant=")secondary(")/, '$1ghost$2');
    if (v === 'wide') out = out.replace(/\s*<div data-part="(?:shot|visual)"[\s\S]*?<\/div>\s*(?=<\/section>)/, '').replace(/<\/section>\s*$/, `  <div data-part="visual">\n    ${heroPicture(ctx)}\n  </div>\n</section>`);
    return setAttrs(out, v ? ` data-variant="${v}"` : '');
  }
  if (comp.block === 'hero-statement') {
    if (v === 'tucked') out = out.replace(/(\s*)<h1\b/, `$1<div data-part="visual">\n    ${heroPicture(ctx)}\n  </div>$1<h1`);
    if (v === 'poster') {
      const d = dateFrom(facts.brief);
      if (d) out = out.replace(/(\s*)<h1\b/, `$1<p data-part="date"><time${d.iso ? ` datetime="${d.iso}"` : ''}>${esc(d.days)}</time><span>${esc(`${d.month}${d.year ? ` ${d.year}` : ''}`)}</span></p>$1<h1`);
      return setAttrs(out, ` data-variant="${v}" data-tone="accent"`);
    }
    return setAttrs(out, v ? ` data-variant="${v}"` : '');
  }
  if (comp.block === 'hero-board') {
    const b = boardRows(ctx, v);
    out = out.replace(/<figure data-part="board"[\s\S]*?<\/figure>/, `<figure data-part="board" data-tone="dark">
    <figcaption><b>${esc(b.title)}</b>${b.aside ? `<span>${esc(b.aside)}</span>` : ''}</figcaption>
    <ol data-part="rows">
      ${b.rows.join('\n      ')}
    </ol>
  </figure>`);
    return setAttrs(out, ` data-variant="${v ?? 'menu'}"`);
  }
  if (comp.block === 'hero-cover') {
    const name = product ?? cap(facts.kind ?? 'TODO: name');
    const line = ctx.hero.headline ? `${ctx.hero.headline.replace(/\.$/, '')}.` : null;
    const date = dateFrom(facts.brief);
    const items = [facts.kind ? `${cap(facts.kind)}${facts.place ? `, ${facts.place}` : ''}` : facts.place, facts.days ? `Open ${facts.days}` : facts.people?.length ? facts.people.map((p) => p.name).slice(0, 2).join(' and ') : null].filter(Boolean);
    const dl = `${items.map((x) => `<span>${esc(x)}</span>`).join('')}${date ? `<time${date.iso ? ` datetime="${date.iso}"` : ''}>${esc(date.text)}</time>` : ''}`;
    out = out.replace(/(<h1\b[^>]*data-part="masthead")[^>]*>[\s\S]*?<\/h1>/, `$1 style="--cover-len: ${name.length}">${esc(name)}</h1>`)
      .replace(/<p data-part="dateline">[\s\S]*?<\/p>/, dl ? `<p data-part="dateline">${dl}</p>` : '')
      .replace(/<div data-part="visual">[\s\S]*?<\/div>(\s*<div data-part="copy">)/, `<div data-part="visual">\n    ${heroPicture(ctx)}\n  </div>$1`)
      .replace(/(<div data-part="copy">\s*<p data-part="lede">)[\s\S]*?(<\/p>)/, `$1${esc(line ?? ctx.hero.lede ?? '')}$2`);
    return out;
  }
  if (comp.block === 'hero-mosaic') {
    const items = itemsFrom(facts).slice(0, 5);
    const tones = ['', ' data-tone="accent"', ' data-tone="ink"', '', ' data-tone="accent"'];
    // Each tile its own drawing: the thing's own, else another from the subject's world, never the neighbour's.
    const motifs = [];
    const used = (ctx.usedMotifs ??= new Set());
    for (const it of items) {
      const prev = motifs[motifs.length - 1] ?? null;
      // The thing's own drawing (a mug is a cup), else one from the subject's world; never the neighbour's.
      const own = rankMotifs(it.name.toLowerCase().replace(/(\w{3,})s\b/g, '$1')).find((m) => m !== prev && !used.has(m));
      if (own) used.add(own);
      // Else the subject's own kind of thing (a pottery's vase), never a drawing from another world: no stand-in
      // from the whole catalogue (a cup and a crane on a wool shop's tiles).
      motifs.push(own ?? [ctx.facts.kind ?? '', it.name].map((q) => rankMotifs(q.toLowerCase().replace(/\bstudios?\b/g, '')).find((m) => m !== prev && !motifs.includes(m))).find(Boolean) ?? null);
    }
    // All tiles drawn or none: where one thing has no drawing of its own, the mosaic is set in type, each tile its
    // name on its own ground.
    if (motifs.some((m) => !m)) motifs.fill(null);
    const tiles = items.map((it, k) => `<li>${thingPanel({ ...it, price: null, meta: null }, ctx, tones[k], motifs[k])}</li>`);
    // The headline's length, so the mosaic can size it to stay in its corner.
    out = out.replace(/(<h1\b[^>]*?)(\s*>)([\s\S]*?)<\/h1>/, (m, a, b, t) => `${a} style="--hero-len: ${t.replace(/<[^>]+>/g, '').trim().length}"${b}${t}</h1>`);
    return out.replace(/<ul data-part="tiles">[\s\S]*?<\/ul>/, `<ul data-part="tiles">\n    ${tiles.join('\n    ')}\n  </ul>`);
  }
  if (comp.block === 'hero-video') {
    const pic = heroPicture(ctx).replace('<figure class="lt-art"', '<figure class="lt-art" data-part="poster"');
    out = out.replace(/<figure class="lt-art"[^>]*data-part="poster"[\s\S]*?<\/figure>/, pic);
    return setAttrs(out, ' data-variant="full" data-tone="dark"');
  }
  return out;
}

export { isSoftware, keepHyphens, setHeroVisual };
