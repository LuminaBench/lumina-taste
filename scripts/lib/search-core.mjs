// Shared catalog search: BM25 over names, ids, aliases and summaries, plus trigram fuzzy matching.
// Used by scripts/search.mjs and scripts/compose.mjs.

export function catalogDocs(cat, kind = null) {
  return [
    ...cat.ui.map((d) => ({ ...d, kind: 'ui', extra: `${d.pattern} ${d.family} ${(d.states ?? []).join(' ')}` })),
    ...cat.charts.map((d) => ({ ...d, kind: 'chart', extra: `${d.group} ${d.bestFor} ${d.dataShape}` })),
    ...cat.blueprints.map((d) => ({ ...d, kind: 'blueprint', extra: `${d.anatomy} ${(d.uses ?? []).join(' ')}` })),
    ...cat.palettes.map((d) => ({ ...d, kind: 'palette', extra: d.category })),
    ...cat.typography.map((d) => ({ ...d, kind: 'typography', extra: '' })),
    ...(cat.styles ?? []).map((d) => ({ ...d, kind: 'style', extra: `${d.useFor ?? ''}` })),
  ].filter((d) => !kind || d.kind === kind);
}

/** search(cat, "rotating arrow", { kind, limit }) → [{ d, s }] sorted by score. */
export function search(cat, query, { kind = null, limit = 8 } = {}) {
  const docs = catalogDocs(cat, kind);
  const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'for', 'with', 'in', 'on', 'that', 'when', 'i', 'my', 'me', 'it', 'is', 'like', 'thing', 'one']);
  const stem = (t) => t.length < 5 ? t.replace(/([^s])s$/, '$1') : t.replace(/(ies)$/, 'y').replace(/(ial|ing|ed|al|ly)$/, '').replace(/(nc|nci)$/, 'nc').replace(/e$/, '').replace(/([^s])s$/, '$1');
  const tok = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').split(' ').filter((t) => t && !STOP.has(t)).map(stem);
  const trigrams = (s) => { const t = `  ${s} `; const out = new Set(); for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3)); return out; };
  const sim = (a, b) => { const A = trigrams(a), B = trigrams(b); let n = 0; for (const x of A) if (B.has(x)) n++; return n / (A.size + B.size - n); };

  // Field weights: aliases are what people actually type, so they count most.
  const FIELDS = [['name', 3], ['id', 3], ['aliases', 3.5], ['summary', 1], ['extra', 0.6]];
  const fieldTokens = docs.map((d) => FIELDS.map(([f, w]) => [tok(Array.isArray(d[f]) ? d[f].join(' ') : d[f]), w]));
  const N = docs.length;
  const avgLen = fieldTokens.reduce((a, fs) => a + fs.reduce((b, [t]) => b + t.length, 0), 0) / N;
  const df = new Map();
  for (const fs of fieldTokens) for (const t of new Set(fs.flatMap(([ts]) => ts))) df.set(t, (df.get(t) ?? 0) + 1);
  const vocab = [...df.keys()];

  const qTerms = tok(query).flatMap((t) => {
    if (df.has(t)) return [[t, 1]];
    // Typo tolerance: map unknown terms to the closest known terms.
    const near = vocab.map((v) => [v, sim(t, v)]).filter(([, s]) => s > 0.42).sort((a, b) => b[1] - a[1]).slice(0, 2);
    return near.map(([v, s]) => [v, s]);
  });
  const phrase = query.toLowerCase().trim();
  const k1 = 1.2, b = 0.75;
  const scored = docs.map((d, i) => {
    const len = fieldTokens[i].reduce((a, [t]) => a + t.length, 0);
    let s = 0;
    for (const [term, qw] of qTerms) {
      const idf = Math.log(1 + (N - (df.get(term) ?? 0) + 0.5) / ((df.get(term) ?? 0) + 0.5));
      let tf = 0;
      for (const [ts, w] of fieldTokens[i]) tf += w * ts.filter((x) => x === term || (term.length > 3 && x.startsWith(term))).length;
      s += qw * idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * len) / avgLen)));
    }
    const aliases = (d.aliases ?? []).map((a) => a.toLowerCase());
    // Whole-phrase fuzzy similarity rescues typos ("dropdwon menu").
    s += 6 * Math.max(sim(phrase, d.name.toLowerCase()), ...aliases.map((a) => sim(phrase, a)), 0);
    // If the query names a kind, prefer that kind.
    const kindWords = { palette: /\b(palette|colou?rs?|theme)\b/, chart: /\b(chart|graph|plot|viz)\b/, blueprint: /\b(page|layout|template|blueprint|site)\b/, typography: /\b(font|type|typography)\b/ };
    if (kindWords[d.kind]?.test(phrase)) s *= 1.6;
    if (aliases.includes(phrase) || d.id === phrase || d.name.toLowerCase() === phrase) s += 12;
    else if (aliases.some((a) => a.includes(phrase))) s += 5;
    return { d, s };
  }).filter((x) => x.s > 0.5).sort((x, y) => y.s - x.s).slice(0, limit);
    return scored;
  }


export const installHint = (d) => ({
  ui: `node scripts/install-taste.mjs --components ${d.id}`,
  chart: `node scripts/install-taste.mjs --charts ${d.id}`,
  blueprint: `node scripts/install-taste.mjs --blueprints ${d.id}`,
  palette: `node scripts/install-taste.mjs --palette ${d.id}`,
  typography: `node scripts/install-taste.mjs --type ${d.id}`,
  style: `node scripts/install-taste.mjs --style ${d.id}`,
})[d.kind];
