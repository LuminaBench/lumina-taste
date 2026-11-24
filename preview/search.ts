// Small forgiving search used by the gallery. Matches ids, names, sloppy aliases and summaries.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+ ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function score(query: string, item: { id: string; name: string; aliases?: string[]; summary?: string; tags?: string[] }) {
  const q = norm(query);
  if (!q) return 0;
  const terms = q.split(' ');
  const name = norm(item.name);
  const id = norm(item.id.replace(/-/g, ' '));
  const aliases = (item.aliases ?? []).map(norm);
  const body = norm(`${item.summary ?? ''} ${(item.tags ?? []).join(' ')}`);
  let s = 0;
  if (name === q || id === q) s += 100;
  if (aliases.includes(q)) s += 90;
  if (aliases.some((a) => a.includes(q))) s += 40;
  if (name.includes(q) || id.includes(q)) s += 40;
  for (const t of terms) {
    const pre = (w: string) => w.split(' ').some((x) => x.startsWith(t));
    if (pre(name) || pre(id)) s += 12;
    else if (aliases.some(pre)) s += 9;
    else if (pre(body)) s += 3;
    else if (t.length > 3 && [name, id, ...aliases].some((w) => w.includes(t.slice(0, -1)))) s += 2;
  }
  return s;
}

export function rank<T extends { id: string; name: string }>(query: string, items: T[]): T[] {
  return items
    .map((it) => ({ it, s: score(query, it as never) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.it);
}
