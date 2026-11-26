// Compositions: the shape of the first screen, the top bar and the foot, chosen from the subject and the brief's
// own facts. The kit's split hero (a line above, a headline, a paragraph, two buttons, a note, a picture on the
// right) is what every generated page looks like; it is chosen only when nothing else fits, never by habit.
// Each choice comes with the reason, which the plan prints.
//
// Pure functions, no I/O.

/** Every first-screen composition: the block it is built from and its data-variant. */
export const HERO_COMPOSITIONS = {
  split: { block: 'hero-split', variant: null, name: 'split (the kit default)' },
  overlap: { block: 'hero-split', variant: 'overlap', name: 'overlapping split: the picture runs off the edge, the words on a block over it' },
  edge: { block: 'hero-split', variant: 'edge', name: 'quiet split: the picture full height to the screen edge' },
  product: { block: 'hero-split', variant: 'product', name: 'product first: the device large, the words beneath' },
  bleed: { block: 'hero-split', variant: 'bleed', name: 'full-bleed picture, the words on its calm side' },
  wide: { block: 'hero-centered', variant: 'wide', name: 'centred statement over a picture from edge to edge' },
  statement: { block: 'hero-statement', variant: null, name: 'statement: the headline is the picture' },
  tucked: { block: 'hero-statement', variant: 'tucked', name: 'huge type with a small picture tucked in' },
  poster: { block: 'hero-statement', variant: 'poster', name: 'poster: the date set enormous' },
  menu: { block: 'hero-board', variant: 'menu', name: 'menu board: the prices are the picture' },
  departures: { block: 'hero-board', variant: 'departures', name: 'departures board: the times are the picture' },
  cover: { block: 'hero-cover', variant: null, name: 'cover: the name as a masthead, a date line, one picture' },
  mosaic: { block: 'hero-mosaic', variant: null, name: 'mosaic of three to five pictures' },
  film: { block: 'hero-video', variant: 'full', name: 'film first: the film is the whole first screen' },
};

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
/**
 * A date the brief gives ("14 and 15 May 2027", "on 3 June", "May 14–15"): its day or days, month and year, and
 * the ISO date of the first day when the year is known. Null when there is none.
 */
export function dateFrom(brief) {
  const s = String(brief ?? '');
  const m = /\b(\d{1,2})(?:st|nd|rd|th)?(?:\s*(?:and|to|-|–)\s*(\d{1,2})(?:st|nd|rd|th)?)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b(?:\s+(\d{4}))?/i.exec(s)
    ?? /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:\s*(?:and|to|-|–)\s*(\d{1,2}))?(?:,?\s+(\d{4}))?/i.exec(s);
  if (!m) return null;
  const monthFirst = isNaN(+m[1]);
  const [d1, d2, mon, year] = monthFirst ? [m[2], m[3], m[1], m[4]] : [m[1], m[2], m[3], m[4]];
  const month = MONTHS.indexOf(mon.toLowerCase());
  const Month = mon[0].toUpperCase() + mon.slice(1).toLowerCase();
  const days = d2 ? `${+d1}–${+d2}` : `${+d1}`;
  const iso = year ? `${year}-${String(month + 1).padStart(2, '0')}-${String(+d1).padStart(2, '0')}` : null;
  return { days, month: Month, year: year ?? null, iso, text: `${d2 ? `${+d1} and ${+d2}` : +d1} ${Month}${year ? ` ${year}` : ''}` };
}

/** Times the brief lists as a timetable ("sailings at 06:40, 07:10 and 07:40"): three or more make a board. */
export const timetable = (facts) => {
  const all = [...String(facts.brief ?? '').matchAll(/(?<![£$€\d.,])\b([01]?\d|2[0-3])[:.]([0-5]\d)\b(?![.,]?\d)/g)].map((m) => `${m[1].padStart(2, '0')}:${m[2]}`);
  return [...new Set(all)];
};

const has = (brief, words) => words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(brief));
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * The first screen for this page.
 * @param {{ type: any, domain: any, facts: any, items?: Array<{ name: string, price: string | null }>, software?: boolean }} input
 * @returns {{ id: string, block: string, variant: string | null, name: string, why: string }}
 */
export function chooseHero({ type, domain, facts, items = [], software = false }) {
  const brief = facts?.brief ?? '';
  const d = domain?.id ?? null;
  const priced = items.filter((i) => i.price).length;
  const times = timetable(facts ?? {});
  const date = dateFrom(brief);
  const pick = (id, why) => ({ id, ...HERO_COMPOSITIONS[id], why });
  if (has(brief, ['film', 'video', 'footage', 'showreel'])) return pick('film', 'the brief has a film of the subject, so the film is the first screen');
  if (d === 'transport' || (times.length >= 3 && has(brief, ['ferry', 'ferries', 'bus', 'buses', 'train', 'trains', 'tram', 'shuttle', 'sailing', 'sailings', 'departures', 'timetable']))) return times.length >= 3 ? pick('departures', `the brief lists ${times.length} times, and people come for the next one: a departures board`) : pick('bleed', 'a journey is a place: one wide photograph, the words on its calm side');
  if (type.id === 'event') return date ? pick('poster', `the date (${date.text}) is what people look for first, so it is the poster`) : pick('cover', 'an event with a name worth setting big: a cover, with the place on the date line');
  if (type.id === 'cause') return pick('tucked', 'the claim carries the first screen; one small true picture beside it, never a photograph of people in need');
  if (type.id === 'about') return pick('tucked', 'a page about who: the claim large, one picture of the place or the work beside it');
  if (type.id === 'portfolio' || d === 'creative') return pick('cover', 'a studio or a person: the name set as a masthead, the work as the one picture');
  if (d === 'editorial' || has(brief, ['magazine', 'journal', 'newsletter', 'zine', 'publication', 'quarterly'])) return pick('cover', 'a publication: set the first screen like its cover');
  if (type.id === 'dev-landing') return pick('wide', 'developers want the thing itself: one claim centred over the product as wide as the page');
  // A phone app is one tall object: it stands in a panel that runs to the screen's edge, beside the words.
  if ((software || type.id === 'landing') && has(brief, ['phone', 'mobile', 'ios', 'android', 'iphone']) && !has(brief, ['web', 'mac', 'windows', 'desktop', 'browser', 'laptop'])) return pick('edge', 'a phone app: the phone stands in a panel that runs to the screen edge, the words beside it, all in the first screen');
  if (software || type.id === 'landing') return pick('product', 'software is judged by its screen: the product first and large, the words beneath');
  if (type.id === 'venue' || d === 'hospitality') {
    if (priced >= 3 && has(brief, ['cafe', 'café', 'coffee', 'roaster', 'roastery', 'bar', 'bakery', 'restaurant', 'bistro', 'pub', 'deli', 'tea', 'wine', 'menu', 'kitchen', 'brewery', 'distillery'])) return pick('menu', `${priced} things with their prices: the menu board is the picture`);
    return pick('bleed', 'a place people go to: one wide photograph of it, the words on its calm side');
  }
  if (type.id === 'brand-landing' || ['commerce', 'beauty'].includes(d)) return items.length >= 3 ? pick('mosaic', `${items.length} things in the range: show them together, as one composition`) : pick('overlap', 'one object: large, breaking the grid, the words on a block over its edge');
  if (['construction', 'trades'].includes(d)) return pick('bleed', 'the work is the proof: a photograph of a finished job across the screen');
  if (['health', 'beauty', 'professional'].includes(d) || type.id === 'service-landing') return pick('edge', 'a calm, plain first screen: the picture full height to the edge, the words with room around them');
  if (d === 'travel' || d === 'property') return pick('bleed', 'a place: one wide photograph, the words on its calm side');
  if (d === 'public') return pick('statement', 'a public service: the task, named plainly, is the first screen');
  if (d === 'education') return pick('overlap', 'a friendly first screen: the picture breaks the grid, the words on a block over it');
  const fallback = ['overlap', 'edge', 'wide', 'tucked'];
  return pick(fallback[hash(brief) % fallback.length], 'nothing in the brief asks for a particular shape, so the first screen avoids the kit\'s default split');
}

/** The top bar and the foot, from the subject and the first screen. */
export function chooseChrome({ type, domain, facts, hero }) {
  const d = domain?.id ?? null;
  const contact = !!(facts?.phone || facts?.email) && !!(facts?.street || facts?.postcode || facts?.days);
  // Every bar is ink (paper on a dark page): the top of the page always contrasts with its ground, and the
  // brand colour is kept for the close. The shape of the bar follows the first screen.
  let nav, navWhy;
  if (hero.id === 'cover') { nav = { id: 'minimal', variant: 'minimal', tone: 'dark' }; navWhy = 'the masthead is the brand: an ink bar with only the name and the action'; }
  else if (['mosaic', 'overlap'].includes(hero.id) && type.id === 'brand-landing') { nav = { id: 'split', variant: 'split', tone: 'dark' }; navWhy = 'a maker\'s name sits in the middle of an ink bar, the range on one side and the action on the other'; }
  else if (hero.id === 'departures' || d === 'transport') { nav = { id: 'ink', variant: null, tone: 'dark' }; navWhy = 'an ink bar, like the signs: the page under it is not one colour'; }
  else if (['bleed', 'film', 'wide', 'product'].includes(hero.id)) { nav = { id: 'ink', variant: null, tone: 'dark' }; navWhy = 'an ink bar frames the wide picture under it and gives the top of the page contrast'; }
  else { nav = { id: 'ink', variant: null, tone: 'dark' }; navWhy = 'an ink bar (paper on a dark page), so the top of the page is never the same hue as its ground'; }
  let footer, footerWhy;
  if (contact && ['venue', 'service-landing', 'cause'].includes(type.id)) { footer = { id: 'contact', block: 'site-footer', variant: 'contact', tone: null }; footerWhy = 'people end the page looking for the phone number and the address: they are the foot, set large'; }
  else if (['brand-landing', 'portfolio', 'event'].includes(type.id) || ['cover', 'mosaic', 'menu'].includes(hero.id)) { footer = { id: 'wordmark', block: 'site-footer', variant: 'wordmark', tone: null }; footerWhy = 'the name is the brand: it closes the page, set across the column'; }
  else { footer = { id: 'quiet', block: 'footer-minimal', variant: null, tone: null }; footerWhy = 'a quiet line: the close above it already says the action'; }
  return { nav: { ...nav, why: navWhy }, footer: { ...footer, why: footerWhy } };
}

/** The composition of a section: its block, variant and layout, as one name neighbours must not share. */
export const sectionComposition = (id, variant, layout) => `${id ?? 'section'}${variant ? `:${variant}` : ''}${layout ? `/${layout}` : ''}`;
