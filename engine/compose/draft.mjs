// String edits that put the subject into a composed draft: the brief's own words in the first screen, the
// bold idea where the plan says it lives, real figures (or a marked TODO) where a band shows figures, and
// the rhythm written onto every band. They work on the kit's own markup (section blocks and blueprints),
// which is regular, so plain string handling is enough; anything they do not recognise is left as it was.
//
// Pure functions, no I/O.
import { beatAttrs } from './rhythm.mjs';

// A "$" in the brief ("$20 a month") would be read as "$2" by every String.replace that inserts escaped text, so
// escaped text carries it as a private-use mark; compose.mjs turns the mark back into "$" as it writes or prints.
export const DOLLAR = '\uE024';
export const unmark = (s) => (typeof s === 'string' ? s.replaceAll(DOLLAR, '$') : s);
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\$/g, DOLLAR);

/** Split a page at <main>: the text before, each top-level child of <main> as its own string, and the text after. */
export function splitMain(page) {
  const open = /<main\b[^>]*>/.exec(page);
  const closeAt = page.lastIndexOf('</main>');
  if (!open || closeAt < 0) return null;
  const head = page.slice(0, open.index + open[0].length), inner = page.slice(open.index + open[0].length, closeAt), tail = page.slice(closeAt);
  const chunks = [];
  const tag = /<(\/?)([a-z][a-z0-9-]*)\b[^>]*?(\/?)>|<!--[\s\S]*?-->/gi;
  let depth = 0, start = null, lead = 0, m;
  const VOID = new Set(['br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'wbr', 'area', 'col', 'embed', 'track', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'use', 'stop', 'ellipse']);
  while ((m = tag.exec(inner))) {
    if (m[0].startsWith('<!--')) continue;
    const closing = m[1] === '/', name = m[2].toLowerCase(), self = m[3] === '/' || VOID.has(name);
    if (!closing && depth === 0) { start = m.index; }
    if (!closing && !self) depth++;
    else if (closing) depth--;
    if (depth === 0 && start != null && (closing || self)) {
      // Comments right before a block travel with it.
      chunks.push({ pre: inner.slice(lead, start), html: inner.slice(start, m.index + m[0].length) });
      lead = m.index + m[0].length; start = null;
    }
  }
  return { head, chunks, rest: inner.slice(lead), tail };
}
export const joinMain = ({ head, chunks, rest, tail }) => head + chunks.map((c) => c.pre + c.html).join('') + rest + tail;

/** The catalog id a section's markup is, from its root class (and what a plain section holds). */
export function idOfBlock(html, rootClass) {
  const cls = /^<\w+[^>]*\sclass="([^"]+)"/.exec(html)?.[1]?.split(/\s+/) ?? [];
  const lt = data(html, 'lt');
  if (lt && rootClass.has(`lt-${lt}`)) return lt;
  for (const c of cls) if (rootClass.has(c) && c !== 'lt-section') return rootClass.get(c);
  // A plain or page-made band: name it after the first section-sized part inside it (a bento, a booking bar).
  for (const m of html.matchAll(/class="(lt-[a-z-]+)/g)) if (m[1] !== 'lt-section' && rootClass.has(m[1]) && !SMALL.has(rootClass.get(m[1]))) return rootClass.get(m[1]);
  return null;
}
/** Parts too small to name a band after. */
const SMALL = new Set(['button', 'icon', 'badge', 'date-picker', 'number-stepper', 'text-field', 'select', 'art-panel', 'segmented-control', 'tooltip', 'avatar', 'switch', 'checkbox', 'radio-group']);
const data = (html, name) => new RegExp(`^<\\w+[^>]*\\sdata-${name}="([^"]*)"`).exec(html)?.[1] ?? null;

/** Put a beat on a band's root element: its tone for the ground, and data-rhythm / data-scale. */
export function applyBeat(html, beat) {
  const { tone, attrs } = beatAttrs(beat);
  return html.replace(/^<(\w+)\b([^>]*)>/, (m, tag, rest) => {
    let r = rest.replace(/\sdata-(rhythm|scale)="[^"]*"/g, '');
    // The ground the rhythm chose replaces the block's own; a picture band keeps its own dark ground.
    if (beat.ground !== 'picture') r = r.replace(/\sdata-tone="[^"]*"/, '');
    if (tone) r += ` data-tone="${tone}"`;
    if (beat.ground === 'brand' && /lt-cta-band/.test(r) && !/data-variant=/.test(r)) r += ' data-variant="bold"';
    return `<${tag}${r} ${attrs}>`;
  });
}

const setPart = (html, part, text, tag = 'p') => {
  const re = new RegExp(`(<${tag}\\b[^>]*data-part="${part}"[^>]*>)[\\s\\S]*?(</${tag}>)`);
  return re.test(html) ? html.replace(re, `$1${text}$2`) : html;
};
/** A figure with its unit set small: "30 seconds" → 30<small>seconds</small>; "£40,000" stays as it is. */
export const figureHtml = (v) => { const m = /^([£$€]?[\d.,:]+)\s+(.+)$/.exec(v); return m ? `${esc(m[1])}<small>${esc(m[2])}</small>` : esc(v); };
/** A long figure ("£40,000") is set smaller so it never runs out of its panel: about 130cqi shared by its characters. */
export const figureStyle = (v) => { const n = String(v).split(/\s+/)[0].length; return n > 4 ? ` style="font-size: clamp(2.5rem, ${Math.floor(128 / n)}cqi, 11rem)"` : ''; };
/** Hyphenated words in a heading never break at the hyphen ("single-storey" stays on one line). */
/** Hyphenated words in a heading never break at the hyphen ("single-storey" stays on one line). Takes escaped
 *  HTML and wraps each such word in a no-wrap span: a U+2011 hyphen is missing from many faces and falls back. */
export const keepHyphens = (html) => String(html).replace(/([A-Za-z0-9£]+(?:-[A-Za-z0-9]+)+)/g, '<span style="white-space: nowrap">$1</span>');

/**
 * The first screen in the brief's words. Missing pieces stay as the sample and are listed in a TODO
 * comment, so nothing is invented.
 */
export function applyHeroCopy(html, copy) {
  let out = html;
  // A line the brief has nothing for is removed rather than left saying something about the sample business.
  const drop = (part) => { out = out.replace(new RegExp(`\\s*<p\\b[^>]*data-part="${part}"[^>]*>[\\s\\S]*?</p>`), ''); };
  if (copy.eyebrow) out = setPart(out, 'eyebrow', esc(copy.eyebrow)); else drop('eyebrow');
  if (!copy.lede) drop('lede');
  if (!copy.note) drop('note');
  // No headline in the brief: the name, else a marked gap, never the sample's own line.
  const h1 = copy.headline ?? copy.name ?? 'TODO: the one line that says what this is';
  out = out.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/, (m, a, b) => `${a}${keepHyphens(esc(h1))}${b}`);
  if (copy.secondary) out = out.replace(/(<a class="lt-btn"[^>]*data-variant="(?:ghost|secondary)"[^>]*>)[^<]*/, `$1${esc(copy.secondary)} `);
  if (copy.action) {
    // The primary action in the subject's words: every button that said the sample's action says this one.
    const label = /<a class="lt-btn"[^>]*data-variant="primary"[^>]*>([^<]+)</.exec(out)?.[1]?.trim();
    if (label) out = out.split(`>${label}<`).join(`>${esc(copy.action)}<`);
  }
  if (copy.lede) out = setPart(out, 'lede', esc(copy.lede));
  if (copy.note) out = setPart(out, 'note', esc(copy.note));
  return out;
}

/** The bold idea as the hero's picture: an art panel in the brand colour with the figure set huge. */
export function heroIdeaPanel(idea, facts) {
  const shot = `A photograph of ${facts.kind ? `the ${facts.kind}` : 'the thing itself'}${facts.place ? ` in ${facts.place}` : ''}, real light, 5:4. Until it exists this panel carries the page's bold idea: ${idea.text}.`;
  const fact = [facts.days && !String(idea.caption).includes(facts.days) ? `Open ${facts.days}` : null, facts.street ?? facts.place ?? null].filter(Boolean).join(' · ');
  return `<figure class="lt-art" data-variant="figure" data-tone="swatch" data-frame data-ratio="5/4" data-shot="${esc(shot)}">
          ${idea.prefix ? `<p data-part="index">${esc(idea.prefix)}</p>\n          ` : ''}<p data-part="figure"${figureStyle(idea.figure)}>${figureHtml(idea.figure)}</p>
          <p data-part="name">${esc(idea.caption)}</p>${fact ? `\n          <p data-part="fact">${esc(fact)}</p>` : ''}
          <figcaption class="lt-visually-hidden">${esc(`${idea.figure}: ${idea.caption}`)}</figcaption>
        </figure>`;
}

/** Replace the hero's right-hand side (a product frame or a visual slot) with new markup. */
export function setHeroVisual(html, inner) {
  const at = html.search(/<div data-part="(?:frame|visual)"/);
  if (at < 0) return html;
  // Find the matching </div>.
  const re = /<(\/?)div\b[^>]*>/g; re.lastIndex = at; let depth = 0, m, end = -1;
  while ((m = re.exec(html))) { depth += m[1] ? -1 : 1; if (depth === 0) { end = m.index + m[0].length; break; } }
  if (end < 0) return html;
  return `${html.slice(0, at)}<div data-part="visual">\n        ${inner}\n      </div>${html.slice(end)}`;
}

/** A <dl> of figures from the brief; with fewer than `min`, the list is removed (never filled with made-up ones). */
export function setFacts(html, figures, { part = 'facts', min = 2 } = {}) {
  const re = part ? new RegExp(`\\s*<dl data-part="${part}">[\\s\\S]*?</dl>`) : /\s*<dl>[\s\S]*?<\/dl>/;
  if (!re.test(html)) return html;
  if (figures.length < min) return html.replace(re, '');
  const items = figures.slice(0, 4).map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('');
  return html.replace(re, (m) => m.replace(/<dl([^>]*)>[\s\S]*<\/dl>/, `<dl$1>${items}</dl>`));
}

/** The picture band carries the bold idea: the claim as its heading, the figure huge where the mock screen was. */
export function applyMediaIdea(html, idea, headline) {
  let out = html;
  if (headline) out = out.replace(/(<h2\b[^>]*>)[\s\S]*?(<\/h2>)/, `$1${esc(headline)}$2`);
  out = out.replace(/(<figure data-part="media"[^>]*>)[\s\S]*?(<\/figure>)/, `$1\n    <div class="lt-art" data-variant="figure" data-ratio="16/9" role="img" aria-label="${esc(`${idea.figure}: ${idea.caption}`)}">\n      <p data-part="figure"${figureStyle(idea.figure)}>${figureHtml(idea.figure)}</p>\n      <p data-part="name">${esc(idea.caption)}</p>\n    </div>\n  $2`);
  return out;
}

/** The closing band says the action and one true fact from the brief. */
export function applyClose(html, { heading, lede }) {
  let out = html;
  if (heading) out = out.replace(/(<h2\b[^>]*>)[\s\S]*?(<\/h2>)/, `$1${keepHyphens(esc(heading))}$2`);
  if (lede) out = setPart(out, 'lede', esc(lede));
  return out;
}

/** The HTML comment that names the page's bold idea, placed right after <main>. */
export const ideaComment = (idea) => `\n<!-- Bold idea: ${idea.text.replace(/--/g, '–')}. Lives in: ${idea.where.replace(/--/g, '–')}.${idea.ask ? ` TODO: ask for ${idea.ask}.` : ''} Everything else on the page stays quieter than it. -->`;

/** An opening-hours table (rows with data-day) set to the brief's own days and hours. */
export function applyHours(html, hours) {
  if (!hours || !/<tr data-day="\d"/.test(html)) return html;
  return html.replace(/<tr data-day="(\d)">(<th[^>]*>[^<]*<\/th>)<td[^>]*>[^<]*<\/td><\/tr>/g, (m, d, th) => `<tr data-day="${d}">${th}${hours[d] ? `<td>${hours[d]}</td>` : '<td data-closed>Closed</td>'}</tr>`);
}
