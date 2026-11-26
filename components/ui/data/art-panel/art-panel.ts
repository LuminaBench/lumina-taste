import type { Cleanup } from '../../_shared/dom';

/**
 * Spot illustrations for art panels: the business's own things (a cup, a loaf, a crane, a document) drawn
 * flat and geometric on a 160 grid, so a panel without a photograph still shows the subject. Every motif uses
 * the same parts, coloured by the panel's tokens in art-panel.css:
 *   data-m="a"    the main fill (the accent)
 *   data-m="b"    the second fill (a pale tint)
 *   data-m="sil"  a silhouette drawn under the fills, so only the outer edge shows (one stroke weight)
 *   data-m="ink"  lines and outlines, one stroke weight, round caps
 *   data-m="dot"  small solid ink marks
 * One motif per line, `name: ['keywords', '<svg body>'],` (Node scripts read this table too, see
 * scripts/lib/image-motifs.mjs): double quotes only inside the markup.
 */
export const MOTIFS: Record<string, readonly [string, string]> = {
  cup: ['coffee cafe café espresso latte roaster roastery bean beans tea teahouse mug cup barista brew', '<ellipse data-m="b" cx="78" cy="128" rx="54" ry="10"/><path data-m="a" d="M34 60H118V94A30 30 0 0 1 88 124H64A30 30 0 0 1 34 94Z"/><path data-m="b" d="M34 74H118V86H34Z"/><g data-m="ink"><ellipse cx="78" cy="128" rx="54" ry="10"/><path d="M34 60H118V94A30 30 0 0 1 88 124H64A30 30 0 0 1 34 94Z"/><path d="M118 70H126A14 14 0 0 1 126 98H116"/><path d="M58 44C52 36 64 32 58 22M76 44C70 36 82 32 76 22M94 44C88 36 100 32 94 22"/></g>'],
  loaf: ['bakery bread baker baking loaf sourdough pastry patisserie croissant cake bake rye flour', '<rect data-m="b" x="14" y="116" width="132" height="16" rx="8"/><path data-m="a" d="M26 116C26 74 50 50 80 50S134 74 134 116Z"/><g data-m="ink"><rect x="14" y="116" width="132" height="16" rx="8"/><path d="M26 116C26 74 50 50 80 50S134 74 134 116Z"/><path d="M52 92C58 80 68 74 80 72M70 106C78 92 92 84 106 82M90 70C96 64 104 62 112 64"/></g><circle data-m="dot" cx="132" cy="124" r="3"/>'],
  crane: ['construction builder builders building contractor site crane renovation development civil engineering scaffold housing developer', '<rect data-m="b" x="86" y="78" width="52" height="62"/><rect data-m="a" x="102" y="58" width="22" height="14" rx="2"/><path data-m="a" d="M14 32H34V44H14Z"/><g data-m="ink"><path d="M40 140V28M54 140V28M40 136L54 122L40 108L54 94L40 80L54 66L40 52L54 38"/><path d="M14 32H146M47 14V32M47 14L146 32M47 14L14 32"/><path d="M113 32V58"/><rect x="102" y="58" width="22" height="14" rx="2"/><rect x="86" y="78" width="52" height="62"/><path d="M98 92H108M116 92H126M98 106H108M116 106H126M98 120H108M116 120H126"/><path d="M8 140H152"/></g>'],
  document: ['law legal lawyer solicitor solicitors notary contract contracts accountant accountancy accounting tax invoice invoices insurance office paperwork bookkeeping agreement form compliance consultancy', '<path data-m="b" d="M42 20H104L126 42V140H42Z"/><circle data-m="a" cx="110" cy="118" r="22"/><g data-m="ink"><path d="M42 20H104L126 42V140H42Z"/><path d="M104 20V42H126"/><path d="M58 54H98M58 68H110M58 82H110M58 96H88"/><path d="M56 124C62 112 66 130 72 118S82 126 86 118"/><circle cx="110" cy="118" r="22"/><circle cx="110" cy="118" r="13"/></g>'],
  scales: ['justice court barrister judge fair mediation arbitration legal scales balance tribunal rights', '<path data-m="a" d="M16 86H56A20 20 0 0 1 16 86Z"/><path data-m="a" d="M104 86H144A20 20 0 0 1 104 86Z"/><rect data-m="b" x="50" y="126" width="60" height="12" rx="6"/><g data-m="ink"><path d="M80 32V126M32 44H128"/><circle cx="80" cy="26" r="6"/><path d="M32 44L18 86M32 44L46 86M128 44L114 86M128 44L142 86"/><path d="M16 86H56A20 20 0 0 1 16 86ZM104 86H144A20 20 0 0 1 104 86Z"/><rect x="50" y="126" width="60" height="12" rx="6"/></g>'],
  leaf: ['garden gardener gardening plant plants florist flower flowers nursery landscaping landscape organic farm herb herbal eco botanical tree forestry green allotment', '<path data-m="a" d="M78 138C38 122 28 70 62 24C96 58 100 110 78 138Z"/><path data-m="b" d="M84 138C98 110 118 96 144 94C142 122 116 142 84 138Z"/><g data-m="ink"><path d="M78 138C38 122 28 70 62 24C96 58 100 110 78 138Z"/><path d="M84 138C98 110 118 96 144 94C142 122 116 142 84 138Z"/><path d="M78 138C72 100 68 64 62 24M73 100L54 84M70 76L56 62M76 110L90 96"/><path d="M84 138C104 124 122 110 144 94"/><path d="M80 138V150"/></g>'],
  phone: ['app apps mobile phone smartphone call telecom software saas digital startup product platform', '<rect data-m="b" x="46" y="14" width="68" height="132" rx="14"/><rect data-m="a" x="58" y="46" width="44" height="30" rx="5"/><g data-m="ink"><rect x="46" y="14" width="68" height="132" rx="14"/><path d="M72 26H88M70 134H90"/><rect x="58" y="46" width="44" height="30" rx="5"/><path d="M58 92H102M58 106H92M58 120H98"/></g>'],
  chart: ['finance financial analytics analysis investment investing data report reports growth metrics bank banking dashboard statistics wealth pension economics', '<rect data-m="b" x="32" y="96" width="18" height="36" rx="2"/><rect data-m="b" x="58" y="78" width="18" height="54" rx="2"/><rect data-m="b" x="84" y="62" width="18" height="70" rx="2"/><rect data-m="a" x="110" y="40" width="18" height="92" rx="2"/><g data-m="ink"><path d="M20 20V132H146"/><path d="M41 82L67 64L93 50L126 22"/><path d="M114 22H126V34"/></g><circle data-m="dot" cx="41" cy="82" r="4"/><circle data-m="dot" cx="67" cy="64" r="4"/><circle data-m="dot" cx="93" cy="50" r="4"/>'],
  key: ['estate agent agents letting lettings landlord rental rent property locksmith keys key hotel hostel holiday stay security mortgage', '<path data-m="b" d="M98 80H138V94H130V102H120V94H112V102H98Z"/><circle data-m="a" cx="48" cy="80" r="28"/><circle data-m="cut" cx="40" cy="80" r="10"/><g data-m="ink"><circle cx="48" cy="80" r="28"/><circle cx="40" cy="80" r="10"/><path d="M76 80H138V94H130V102H120V94H112V102H98V94"/></g><circle data-m="dot" cx="62" cy="64" r="3"/>'],
  ticket: ['event events ticket tickets theatre theater cinema film concert gig music festival museum gallery exhibition conference show venue club', '<g transform="rotate(8 80 80)"><path data-m="b" d="M30 52H130V72A8 8 0 0 0 130 88V108H30V88A8 8 0 0 0 30 72Z"/></g><g transform="rotate(-8 80 80)"><path data-m="a" d="M24 46H136V68A8 8 0 0 0 136 84V106H24V84A8 8 0 0 0 24 68Z"/><g data-m="ink"><path d="M24 46H136V68A8 8 0 0 0 136 84V106H24V84A8 8 0 0 0 24 68Z"/><path d="M108 50V102" stroke-dasharray="3 7"/><path d="M40 66H88M40 80H78M40 94H84"/><circle cx="122" cy="76" r="6"/></g></g>'],
  tool: ['repair repairs plumber plumbing mechanic garage electrician electrical handyman maintenance tools tool workshop joinery carpenter carpentry fix service servicing trades builder bike', '<g transform="rotate(-40 80 80)"><g data-m="sil"><rect x="30" y="72" width="84" height="16" rx="8"/><circle cx="122" cy="80" r="22"/><circle cx="30" cy="80" r="16"/></g><g data-m="a"><rect x="30" y="72" width="84" height="16" rx="8"/><circle cx="122" cy="80" r="22"/><circle cx="30" cy="80" r="16"/></g><path data-m="cut" d="M126 70H150V90H126Z"/><circle data-m="cut" cx="30" cy="80" r="7"/><g data-m="ink"><path d="M150 70H126V90H150"/><circle cx="30" cy="80" r="7"/><path d="M52 80H96"/></g></g>'],
  house: ['home homes house housing residential property architect architecture interiors interior cleaning cleaner removals mortgage surveyor roofing roofer', '<rect data-m="b" x="36" y="74" width="88" height="62"/><path data-m="a" d="M22 76L80 28L138 76Z"/><rect data-m="a" x="70" y="100" width="20" height="36"/><g data-m="ink"><path d="M104 46V36H116V56"/><path d="M22 76L80 28L138 76Z"/><rect x="36" y="76" width="88" height="60"/><rect x="70" y="100" width="20" height="36"/><rect x="98" y="90" width="16" height="16"/><path d="M106 90V106M98 98H114M12 136H148"/></g>'],
  tooth: ['dentist dental dentistry orthodontist orthodontics teeth tooth hygienist smile clinic implant', '<path data-m="b" d="M52 34C38 34 32 48 34 62C36 80 44 92 48 112C51 128 56 140 64 140C72 140 72 120 80 114C88 120 88 140 96 140C104 140 109 128 112 112C116 92 124 80 126 62C128 48 122 34 108 34C98 34 92 40 80 40C68 40 62 34 52 34Z"/><path data-m="a" d="M134 20L138 30L148 34L138 38L134 48L130 38L120 34L130 30Z"/><g data-m="ink"><path d="M52 34C38 34 32 48 34 62C36 80 44 92 48 112C51 128 56 140 64 140C72 140 72 120 80 114C88 120 88 140 96 140C104 140 109 128 112 112C116 92 124 80 126 62C128 48 122 34 108 34C98 34 92 40 80 40C68 40 62 34 52 34Z"/><path d="M50 50C45 56 45 66 47 74"/></g>'],
  bowl: ['restaurant restaurants food kitchen chef dining dinner lunch noodle noodles ramen soup takeaway catering eatery bistro canteen meal meals cook cooking street', '<path data-m="b" d="M34 80C40 60 60 54 80 58C100 54 120 60 126 80Z"/><path data-m="a" d="M22 80H138C138 112 112 132 80 132C48 132 22 112 22 80Z"/><g data-m="ink"><path d="M22 80H138C138 112 112 132 80 132C48 132 22 112 22 80Z"/><path d="M34 80C40 60 60 54 80 58C100 54 120 60 126 80"/><path d="M62 132V140H98V132"/><path d="M100 18L72 70M118 22L88 72"/></g>'],
  scissors: ['salon hair hairdresser hairdressing barber barbers beauty stylist tailor tailoring sewing alterations craft crafts haberdashery spa', '<path data-m="b" d="M60 100L104 20L112 24L72 104Z"/><path data-m="b" d="M100 100L56 20L48 24L88 104Z"/><circle data-m="a" cx="54" cy="116" r="18"/><circle data-m="a" cx="106" cy="116" r="18"/><circle data-m="cut" cx="54" cy="116" r="8"/><circle data-m="cut" cx="106" cy="116" r="8"/><g data-m="ink"><path d="M60 100L104 20L112 24L72 104M100 100L56 20L48 24L88 104"/><circle cx="54" cy="116" r="18"/><circle cx="106" cy="116" r="18"/><circle cx="54" cy="116" r="8"/><circle cx="106" cy="116" r="8"/></g><circle data-m="dot" cx="80" cy="70" r="4"/>'],
  book: ['book books bookshop bookstore library publisher publishing school tutor tutoring tuition course courses learning education teacher teaching reading author writer university college', '<path data-m="a" d="M14 50V130C40 124 62 128 80 138C98 128 120 124 146 130V50Z"/><path data-m="b" d="M80 46C64 36 42 34 22 38V120C42 116 64 120 80 130Z"/><path data-m="b" d="M80 46C96 36 118 34 138 38V120C118 116 96 120 80 130Z"/><g data-m="ink"><path d="M14 50V130C40 124 62 128 80 138C98 128 120 124 146 130V50"/><path d="M80 46C64 36 42 34 22 38V120C42 116 64 120 80 130ZM80 46C96 36 118 34 138 38V120C118 116 96 120 80 130Z"/><path d="M34 56C46 54 58 56 68 62M34 72C46 70 58 72 68 78M34 88C46 86 58 88 68 94M92 62C102 56 114 54 126 56M92 78C102 72 114 70 126 72"/></g>'],
  vase: ['pottery potter ceramics ceramic ceramicist stoneware porcelain kiln glaze glazes vase vases jug studio crockery tableware', '<ellipse data-m="b" cx="80" cy="140" rx="44" ry="6"/><path data-m="a" d="M60 22H100V32C100 42 92 44 92 52C116 64 126 86 120 108C116 126 102 138 80 138C58 138 44 126 40 108C34 86 44 64 68 52C68 44 60 42 60 32Z"/><path data-m="b" d="M38 86H122L121 100H39Z"/><g data-m="ink"><path d="M60 22H100V32C100 42 92 44 92 52C116 64 126 86 120 108C116 126 102 138 80 138C58 138 44 126 40 108C34 86 44 64 68 52C68 44 60 42 60 32Z"/><path d="M60 32H100M38 86H122M39 100H121"/></g>'],
  bag: ['shop shops store retail boutique fashion clothing clothes gift gifts market shopping brand goods homeware maker makers candle candles skincare jewellery', '<path data-m="a" d="M32 56H128L136 142H24Z"/><path data-m="b" d="M30 74H130L131 86H29Z"/><g data-m="ink"><path d="M32 56H128L136 142H24Z"/><path d="M58 56V44A22 22 0 0 1 102 44V56"/></g><circle data-m="dot" cx="58" cy="66" r="3.5"/><circle data-m="dot" cx="102" cy="66" r="3.5"/>'],
};

export type MotifName = keyof typeof MOTIFS;

/** The motif whose keywords best match a brief ("bag of Huila beans on a counter", "law office"), or null. */
export function pickMotif(text: string): string | null {
  const words = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter((w) => w.length > 2);
  let best: string | null = null, score = 0;
  for (const [name, [keys]] of Object.entries(MOTIFS)) {
    const list = keys.normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ');
    // Earlier words in the brief count more: the subject usually comes first.
    const s = words.reduce((acc, w, i) => acc + (list.some((k) => k === w || (k.length > 3 && w.startsWith(k)) || (w.length > 3 && k.startsWith(w) && k.length - w.length <= 2)) ? 1 / (1 + i * 0.08) : 0), 0);
    if (s > score) { score = s; best = name; }
  }
  return best;
}

/** Inline SVG for a motif: decoration, so hidden from assistive tech (the figcaption says what it shows). */
export function motifSvg(name: string): string {
  const m = MOTIFS[name];
  return m ? `<svg data-part="motif" viewBox="0 0 160 160" aria-hidden="true" focusable="false">${m[1]}</svg>` : '';
}

/** data-lt="art-panel": draws the panel's data-motif when the markup does not carry it yet. */
export function enhance(root: HTMLElement): Cleanup {
  const panels = root.matches('.lt-art') ? [root] : [...root.querySelectorAll<HTMLElement>('.lt-art')];
  const added: Element[] = [];
  for (const el of panels) {
    const name = el.dataset.motif;
    if (!name || el.querySelector(':scope > [data-part="motif"], :scope > :is(img, picture, video)')) continue;
    el.insertAdjacentHTML('afterbegin', motifSvg(name));
    if (el.firstElementChild?.matches('[data-part="motif"]')) added.push(el.firstElementChild);
  }
  return () => added.forEach((n) => n.remove());
}
