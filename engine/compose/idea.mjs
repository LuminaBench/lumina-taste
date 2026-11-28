import { openingTime } from './words.mjs';
// One bold idea per page, chosen from the subject. The plan names it ("the £40,000 fixed price set huge on
// navy", "the 7:30 opening time as the hero") and says where it lives. It comes from the brief's own figures
// first, then from the art direction's signature; when the brief has no figure, the idea says so and asks
// for one instead of inventing it.
//
// Pure functions, no I/O.

/** A plain colour name for an OKLCH accent, so the plan can say "on navy" rather than "on the accent". */
export function colourName([L, C, H]) {
  if (C < 0.035) return L < 0.4 ? 'charcoal' : L > 0.85 ? 'bone' : 'grey';
  const h = ((H % 360) + 360) % 360;
  const names = [[18, 'rose'], [42, 'red'], [62, 'brick'], [80, 'amber'], [100, 'ochre'], [125, 'olive'], [165, 'green'], [195, 'teal'], [232, 'petrol'], [276, L < 0.45 ? 'navy' : 'blue'], [292, 'indigo'], [325, 'violet'], [350, 'plum'], [361, 'rose']];
  let name = names.find(([max]) => h < max)[1];
  if (name === 'green' && L < 0.42) name = 'forest';
  if (name === 'amber' && C < 0.09) name = 'brass';
  return name;
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * @param {{ facts: any, type: any, hero: string | null, signature: { name: string, how: string }, accent: string, sections: any[] }} input
 * @returns {{ text: string, where: string, place: 'hero-visual' | 'hero-headline' | 'media-band' | 'statement' | null, figure: string | null, caption: string | null, fromBrief: boolean, ask: string | null }}
 */
export function boldIdea({ facts, type, hero, signature, accent, sections }) {
  const ids = new Set(sections.map((s) => s.id).filter(Boolean));
  const price = facts.prices.find((p) => p.what) ?? facts.prices[0] ?? null;
  // When it opens (its hours, or a time it opens from): never a deadline such as "order by 6pm".
  const time = openingTime(facts);
  const count = facts.counts[0] ?? null;
  const dur = facts.durations.find((d) => facts.claims.some((c) => c.includes(d.text))) ?? facts.durations[0] ?? null;
  const visual = hero === 'hero-split' ? 'hero-visual' : hero === 'hero-statement' ? 'hero-headline' : null;
  const pick = (figure, caption, text, place) => ({ text, figure, caption, place, where: { 'hero-visual': `the hero's picture: an art panel in the brand colour (data-variant="figure", data-tone="swatch") with ${figure} set huge`, 'hero-headline': 'the headline itself, at display size', 'media-band': 'the dark picture band, set huge under the real thing', statement: 'a scroll-statement halfway down' }[place] ?? 'the first screen', fromBrief: true, ask: null });
  const withPrefix = (prefix, idea) => ({ ...idea, prefix });
  const priceWord = (p) => (/fixed/.test(p.what ?? '') || ['service-landing'].includes(type.id) ? 'fixed price' : 'price');

  // Each kind of page has a figure its visitors look for first.
  const order = {
    'service-landing': ['price', 'duration', 'time', 'count'],
    venue: ['time', 'price', 'count', 'duration'],
    cause: ['count', 'price', 'time', 'duration'],
    event: ['time', 'price', 'count', 'duration'],
    'brand-landing': ['price', 'count', 'duration', 'time'],
    landing: ['duration', 'price', 'count', 'time'],
    'dev-landing': ['duration', 'count', 'price', 'time'],
  }[type.id] ?? ['price', 'count', 'duration', 'time'];
  const bandPlace = ids.has('media-band') ? 'media-band' : null;
  for (const kind of order) {
    if (kind === 'price' && price) {
      const caption = price.what ? cap(price.what) : 'The price';
      return withPrefix(price.from ? 'From' : null, pick(price.value.replace(/\s+(a|per)\s+.*/, ''), caption, `the ${price.value} ${price.what && !/fixed/.test(price.what) ? `${priceWord(price)} for ${/s$/.test(price.what) ? '' : 'a '}${price.what}` : priceWord(price)} set huge on ${accent}`, visual ?? bandPlace ?? 'statement'));
    }
    if (kind === 'time' && time) {
      // An hours range ("7:30 to 3") opens at its first time: that is the figure people look for.
      const opens = time.value.split(/\s+to\s+/)[0];
      const caption = facts.days ? `Open ${facts.days}${/\sto\s/.test(time.value) ? `, until ${time.value.split(/\s+to\s+/)[1]}` : ''}` : 'Opening time';
      return pick(opens, caption, `the ${opens} opening time as the hero, set huge on ${accent}`, visual ?? 'hero-headline');
    }
    if (kind === 'count' && count) {
      const caption = `${cap(count.what)}${count.per ? ` ${count.per}` : ''}${count.when ? `, ${count.when}` : ''}`;
      return pick(count.value, caption, `${count.value} ${count.what}${count.per ? ` ${count.per}` : ''} as the headline itself${count.when ? `, with its period (${count.when})` : ''}`, visual === 'hero-visual' ? 'hero-visual' : 'hero-headline');
    }
    if (kind === 'duration' && dur) {
      const claim = facts.claims.find((c) => c.includes(dur.text));
      const caption = claim ? cap(claim.replace(new RegExp(`\\s*(?:in|within|under)?\\s*${dur.text}`), '')) : cap(dur.phrase ?? dur.what ?? 'Time');
      // Software shows the product in the first screen, so its figure goes to the picture band.
      const place = ['landing', 'dev-landing'].includes(type.id) ? (bandPlace ?? visual ?? 'statement') : (visual ?? bandPlace ?? 'statement');
      return pick(dur.value, caption, `${claim ? `"${claim}", shown rather than said: ` : ''}${dur.value} set huge on ${place === 'media-band' ? 'the dark band' : accent}`, place);
    }
  }
  // No figure in the brief: the signature is the idea, and the plan asks for the figure it needs.
  return { text: `${signature.name.toLowerCase()}: ${signature.how.split('. ')[0].replace(/\.$/, '')}`, figure: null, caption: null, place: null, where: 'the first screen', fromBrief: false, ask: 'one true figure for this subject (a price, an opening time, a count with its period, how long something takes) to set large' };
}
