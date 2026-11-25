#!/usr/bin/env node
// Turn a one-line brief into a page plan: the design brief to confirm, the taste profile, the
// sections in order (with real catalog ids and a copy formula for each), the states to build,
// what to avoid, and the exact install and audit commands.
//
//   node scripts/compose.mjs "landing page for an invoicing tool for freelancers"
//   node scripts/compose.mjs "dark admin users table for a devtool" --framework react --project /abs/app
//   node scripts/compose.mjs "pricing page" --type pricing --json
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { search } from './lib/search-core.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };
const asJson = flag('json');
const forceType = opt('type', null);
const framework = opt('framework', 'static');
const project = opt('project', '/abs/app');
const brief = args.join(' ').trim();
if (!brief && !forceType) {
  console.error('Usage: node scripts/compose.mjs "<one-line brief>" [--type <page-type>] [--framework static|vanilla|react] [--project /abs/app] [--json]');
  process.exit(2);
}

const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
const cat = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
const uiIds = new Set(cat.ui.map((u) => u.id));
const blueprintIds = new Set(cat.blueprints.map((b) => b.id));
const text = ` ${brief.toLowerCase().replace(/[^a-z0-9'’-]+/g, ' ')} `;
const has = (phrase) => text.includes(` ${phrase.toLowerCase()} `);

// ---------------------------------------------------------------- page type
function pickType() {
  if (forceType) {
    const t = kb.pageTypes.find((p) => p.id === forceType);
    if (!t) { console.error(`Unknown --type ${forceType}. One of: ${kb.pageTypes.map((p) => p.id).join(', ')}`); process.exit(2); }
    return { type: t, confident: true };
  }
  const scored = kb.pageTypes.map((t) => {
    let s = 0;
    for (const a of [t.id.replace(/-/g, ' '), ...t.aliases]) if (has(a)) s += 2 + a.split(' ').length * 2 + 3 * (1 - text.indexOf(` ${a.toLowerCase()} `) / text.length);
    return { t, s };
  }).sort((a, b) => b.s - a.s);
  if (scored[0].s > 0) return { type: scored[0].t, confident: true, runnerUp: scored[1].s > 0 ? scored[1].t : null };
  // Fall back to catalog search over blueprints, then to a landing page.
  const hit = search(cat, brief, { kind: 'blueprint', limit: 1 })[0];
  const viaBp = hit && kb.pageTypes.find((t) => t.blueprint === hit.d.id);
  return { type: viaBp ?? kb.pageTypes.find((t) => t.id === 'landing'), confident: false };
}
const picked = pickType();
let { type } = picked;
const { confident, runnerUp } = picked;

// ---------------------------------------------------------------- domain, mood, profile
const domainScores = kb.domains.map((d) => ({ d, s: d.words.filter((w) => has(w)).length })).sort((a, b) => b.s - a.s);
const domain = domainScores[0].s > 0 ? domainScores[0].d : null;
// A landing page for a developer product has its own plan (code, terminal, API), unless --type says otherwise.
if (type.id === 'landing' && domain?.id === 'devtool' && !forceType) type = kb.pageTypes.find((t) => t.id === 'dev-landing') ?? type;
const moodHits = Object.entries(kb.moods).filter(([w]) => has(w));
const mood = Object.assign({}, ...moodHits.map(([, v]) => v));
// A style is applied only when the brief names a mood; the domain's style is offered, not imposed.
const explicitStyle = Object.prototype.hasOwnProperty.call(mood, 'style') ? mood.style : search(cat, brief, { kind: 'style', limit: 1 }).find((x) => x.s > 14)?.d.id ?? null;
const defaults = { marketing: ['slate-forest', 'precision'], app: ['slate-forest', 'precision'], reading: ['paper-ink', 'editorial'], flow: ['slate-forest', 'precision'] }[type.kind];
const profile = {
  palette: domain?.palette ?? defaults[0],
  mode: mood.mode ?? domain?.mode ?? 'light',
  typography: mood.typography ?? domain?.typography ?? defaults[1],
  density: mood.density ?? type.density,
  style: explicitStyle ?? null,
};
const styleOffer = !profile.style && domain?.style ? domain.style : null;

// ---------------------------------------------------------------- product name for copy
const quoted = brief.match(/["“']([^"”']{2,40})["”']/)?.[1];
const named = brief.match(/\b(?:called|named)\s+([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*)?)/)?.[1];
// "…for Tally, an invoicing tool" / "…for Beacon." : a capitalised name after "for", not a generic word.
const GENERIC = new Set(['A', 'An', 'The', 'Our', 'My', 'Your', 'Their', 'This', 'That', 'Every', 'Each', 'Teams', 'People', 'Developers', 'Freelancers']);
const afterFor = [...brief.matchAll(/\bfor\s+([A-Z][\w&.'’-]*(?:\s+[A-Z][\w&.'’-]*)?)(?=[\s,.;:)]|$)/g)].map((m) => m[1]).find((w) => !GENERIC.has(w.split(' ')[0]));
const leading = brief.match(/^([A-Z][\w&.-]+),\s+(?:an?|the)\s/)?.[1];
const product = quoted ?? named ?? afterFor ?? leading ?? null;
const restyle = (kb.restyle?.words ?? []).some((w) => text.includes(` ${w} `) || text.includes(` ${w}`));

// ---------------------------------------------------------------- plan
const sections = type.sections.map((s, i) => ({ n: i + 1, ...s, exists: !s.id || uiIds.has(s.id) }));
// Developer products show code: a code-block figure takes the place of the hero's product frame.
const wantsCode = type.kind === 'marketing' && (domain?.id === 'devtool' || has('code') || has('show code'));
const components = [...new Set([...sections.filter((s) => s.id && !s.optional).map((s) => s.id), ...(wantsCode ? ['code-block'] : [])])].filter((id) => uiIds.has(id));
const charts = type.charts ?? [];
const blueprint = type.blueprint && blueprintIds.has(type.blueprint) ? type.blueprint : null;
const flags = [`--palette ${profile.palette}`, `--mode ${profile.mode}`, `--type ${profile.typography}`, `--density ${profile.density}`, profile.style ? `--style ${profile.style}` : null].filter(Boolean).join(' ');
const base = `node scripts/install-taste.mjs --project ${project} --framework ${framework} ${flags}`;
const installSnippets = `${base} \\\n  --components ${components.join(',')}${charts.length ? ` --charts ${charts.join(',')}` : ''}`;
const installBlueprint = blueprint ? `${base} --blueprints ${blueprint}` : null;
// One way to start, not two: a blueprint when it already is this page, snippets when the plan differs from it.
const startWith = blueprint && type.start !== 'snippets' ? 'blueprint' : 'snippets';
const install = startWith === 'blueprint' ? installBlueprint : installSnippets;
// ---------------------------------------------------------------- three looks, and the few questions worth asking
const styleDefs = JSON.parse(readFileSync(join(root, 'tokens/styles/source.json'), 'utf8')).styles;
const saidMode = mood.mode ?? (has('black') ? 'dark' : has('light') || has('white') || has('bright') ? 'light' : null);
// A look is a style, optionally with a palette other than the style's own: "atelier@bone-plum".
const lookOf = (key) => { const [id, palette] = String(key).split('@'); const s = styleDefs.find((x) => x.id === id); const pal = palette && palette !== s?.palette ? cat.palettes.find((p) => p.id === palette) : null; return s ? { key: pal ? `${id}@${palette}` : id, id, palette: pal ? palette : s.palette, name: pal ? `${s.name} in ${pal.name}` : s.name, summary: pal ? `${s.summary} Shown here in ${pal.name} instead of the style's own palette.` : s.summary, mode: s.mode } : null; };
let looks = [profile.style, ...(kb.directions[domain?.id] ?? []), ...kb.directions.default].filter(Boolean).map(lookOf).filter(Boolean);
looks = looks.filter((l, i) => looks.findIndex((x) => x.id === l.id) === i);
if (saidMode) {
  // A brief that says dark only gets dark looks (and the same for light).
  const same = looks.filter((l) => l.mode === saidMode);
  looks = [...same, ...styleDefs.filter((st) => st.mode === saidMode && !same.some((l) => l.id === st.id)).map((st) => lookOf(st.id))];
}
looks = looks.slice(0, 3);
const directions = {
  styles: looks,
  command: `node scripts/directions.mjs ${JSON.stringify(brief || type.name)} --out ${project === '/abs/app' ? './lumina-directions' : join(project, 'lumina-directions')}`,
};
// Ask only what the brief leaves open, most useful first, three at most. Everything else has a sound default.
const saysAction = ['sign up', 'signup', 'waitlist', 'demo', 'buy', 'install', 'download', 'subscribe', 'contact', 'book', 'trial', 'donate', 'apply'].some(has);
const questions = [
  restyle && { id: 'keep', ask: 'What must stay as it is (logo, brand colour, copy, layout)?', why: 'A restyle changes the surface; it should not move what people already know.', default: 'keep the content and structure, change tokens and components only' },
  !product && { id: 'product', ask: 'What is the product called, and what does it do in one line?', why: 'Sample names and sample numbers must not ship; the headline is written from this.', default: 'none: ask, or take the name from the repository or the existing site' },
  !profile.style && !restyle && { id: 'look', ask: `Which look fits: ${directions.styles.map((s, i) => `${'ABC'[i]} ${s.name}`).join(', ')}? (Render them side by side with the directions command and let the person point.)`, why: 'People choose a look faster by eye than from a description.', default: `the plain profile below (${profile.palette}, ${profile.typography}), no style` },
  ['marketing', 'flow'].includes(type.kind) && !saysAction && { id: 'action', ask: 'What is the one thing a visitor should do here: start a trial, book a demo, join a waitlist, buy?', why: 'One primary action per screen; its label is the most-read words on the page.', default: 'a free start ("Start free"), with a quieter second link to a demo or the docs' },
  !saidMode && { id: 'mode', ask: 'Light, dark, or both with a switch?', why: 'Dark is a second design, not an inversion; it is cheaper to know now.', default: `${profile.mode}, with the other mode working` },
].filter(Boolean).slice(0, 3);

const audience = domain ? { finance: 'people who check figures and need to trust them', trading: 'people watching numbers change who need speed and density', devtool: 'developers who want the facts, the code and the limits', analytics: 'people who need one answer fast, then the detail', health: 'people who may be anxious and need calm, plain steps', public: 'anyone, on any device, including people with low vision or little time', commerce: 'shoppers comparing, who need the price, delivery and returns up front', editorial: 'readers who came to read, so the text comes first', productivity: 'teams who want to see the product working, not adjectives', creative: 'clients judging taste, so the work leads and words stay short', playful: 'families and younger users who need big targets and friendly words', enterprise: 'buyers and admins who need proof, controls and compliance', travel: 'people planning, who need dates, prices and photos they trust', beauty: 'people choosing with their eyes, so the product and its result lead and the words stay few', hospitality: 'guests deciding where to go, who need the menu or rooms, the hours and a way to book', media: 'listeners and viewers who came for the thing itself, so controls stay out of the way', property: 'people making a large, slow decision who need plain numbers and no pressure', social: 'people here for each other, so their content leads and the chrome stays quiet' }[domain.id] : 'name them in one line before building';
const plan = {
  brief,
  pageType: { id: type.id, name: type.name, confident, alsoConsider: runnerUp?.id ?? null },
  designBrief: {
    audience,
    job: type.primary,
    readingPattern: { Z: 'Z-pattern: brand top-left, action top-right, alternate text and visuals.', F: 'F-pattern: most important figure or label top-left; labels left-aligned.', single: 'Single column: one reading column at 68ch.' }[type.pattern],
    density: profile.density,
    layout: type.layout,
    product: product ?? 'not named in the brief; ask or use the product\'s real name, never a placeholder',
  },
  profile,
  styleOffer,
  questions,
  directions,
  startWith,
  install,
  installAlternative: startWith === 'blueprint' ? installSnippets : installBlueprint,
  blueprint: blueprint ?? (type.blueprint ? `${type.blueprint} (not in this version; start from the sections below)` : null),
  sections,
  charts,
  restyle: restyle ? kb.restyle.notes : null,
  states: type.states,
  avoid: type.avoid,
  finish: [
    'Replace every sample string with the product\'s real words and numbers.',
    'node scripts/lint-copy.mjs <src>',
    'node scripts/audit-ui.mjs <url> --taste   (0 errors and a taste score of 90 or more, at 390px and 1440px, light and dark)',
  ],
};

if (asJson) { console.log(JSON.stringify(plan, null, 2)); process.exit(0); }

// ---------------------------------------------------------------- markdown
const L = [];
let h = 0; const H = (title) => `## ${++h}. ${title}`;
L.push(`# Page plan: ${type.name}`, '', `> ${brief || `--type ${type.id}`}`, '');
if (!confident) L.push(`Page type guessed from the catalog. If this is wrong, rerun with \`--type <id>\` (${kb.pageTypes.map((p) => p.id).join(', ')}).`, '');
else if (runnerUp) L.push(`Also close: \`${runnerUp.id}\`. Rerun with \`--type ${runnerUp.id}\` if that fits better.`, '');
L.push(H('Design brief (confirm before writing code)'), '');
L.push(`- **Audience:** ${plan.designBrief.audience}`);
L.push(`- **Product:** ${plan.designBrief.product}`);
L.push(`- **Primary action:** ${type.primary}`);
L.push(`- **Reading pattern:** ${plan.designBrief.readingPattern}`);
L.push(`- **Layout:** ${type.layout}`);
L.push(`- **Density:** ${profile.density}`, '');
if (questions.length) {
  L.push(H('Ask first (only these)'), '', 'The brief leaves these open. Ask them in one short message, then build. If the answer is "you choose", take the default and say which you took. Do not ask anything else.', '');
  for (const q of questions) L.push(`- **${q.ask}** ${q.why} _Default: ${q.default}._`);
  L.push('');
  if (questions.some((q) => q.id === 'look')) L.push('To show the looks instead of describing them:', '', '```sh', directions.command, '```', '', `It writes one page with ${directions.styles.map((s) => s.name).join(', ')} on the same content. Open it, or send a screenshot, and ask for A, B or C.`, '');
}
L.push(H('Profile and install'), '');
L.push(`Palette \`${profile.palette}\` (${profile.mode}), type \`${profile.typography}\`, density \`${profile.density}\`${profile.style ? `, style \`${profile.style}\`` : ', no style'}.${domain ? ` Chosen for the ${domain.id} domain.` : ' No domain recognised, so these are the neutral defaults.'}`);
if (styleOffer) L.push(`If the brief wants more character, add \`--style ${styleOffer}\`.`);
L.push('', '```sh', install, '```', '');
if (startWith === 'blueprint') {
  const bpMeta = cat.blueprints.find((b) => b.id === blueprint);
  L.push(`**Start from the \`${blueprint}\` blueprint: it already is this page.** The command writes a complete page to \`<dest>/${blueprint}/\` (index.html, main.css, main.js; nothing else). Move those three files to where the page lives, then change the brand, words, numbers and currency. Keep its anatomy. It uses ${(bpMeta?.uses ?? []).map((u) => `\`${u}\``).join(', ')}.${bpMeta?.states?.length ? ` It also ships these states: ${bpMeta.states.map((s) => `\`?state=${s}\``).join(', ')}.` : ''}`, '');
  L.push(`Need a section it lacks? Add \`--components <ids>\` to the same command and link \`lumina.css\` and \`lumina.js\` after \`main.css\`. To build from parts instead:`, '', '```sh', installSnippets, '```', '');
} else {
  L.push('Build the page from the snippets this writes, in the section order below.' + (installBlueprint ? ` The \`${blueprint}\` blueprint is a finished example of a similar page (\`--blueprints ${blueprint}\`) if you want to see one, but its sections differ from this plan.` : ''), '');
}
if (restyle) { L.push(H('Restyling an existing page'), ''); for (const n of kb.restyle.notes) L.push(`- ${n}`); L.push(''); }
L.push(H('Sections, in order'), '');
for (const s of sections) {
  const id = s.id ? `\`${s.id}\`` : '_(layout, no component)_';
  const alt = s.alt?.length ? ` (or ${s.alt.map((a) => `\`${a}\``).join(', ')})` : '';
  L.push(`${s.n}. **${s.role}**${s.optional ? ' _(optional)_' : ''}: ${id}${alt}`);
  if (s.copy) L.push(`   - Copy: ${s.copy}`);
  if (s.rule) L.push(`   - Rule: ${s.rule}`);
  if (wantsCode && /^hero-/.test(s.id ?? '')) L.push('   - Code: this is a developer product, so replace the product frame with a `code-block` figure (a real request and its response, 8–14 lines). Use `code-block` again wherever a feature is easier to show than to describe.');
  if (s.tone) L.push(`   - Band: add \`data-tone="${s.tone}"\` to this block so the page alternates plain and tinted bands.`);
}
L.push('');
if (type.kind === 'marketing') L.push('Section blocks go straight inside `<main>`, one after another. Each centres its content in a 1180px container and pads itself by half of `--section-y`, so the gap between two sections is always `--section-y`; never wrap them in another band or container. Never tint two bands in a row.', '');
if (charts.length) L.push(H('Charts'), '', `Start with ${charts.map((c) => `\`${c}\``).join(', ')}. Write each title as the takeaway first; check the pick in references/chart-selection.md.`, '');
if (type.states.length) { L.push(H('States to build'), ''); for (const s of type.states) L.push(`- ${s}`); L.push(''); }
L.push(H('Avoid'), ''); for (const a of type.avoid) L.push(`- ${a}`); L.push('');
L.push(H('Finish'), ''); for (const f of plan.finish) L.push(`- ${f.startsWith('node') ? '`' + f.replace(/\s{2,}\(.*$/, '') + '`' + (f.match(/\s{2,}(\(.*)$/)?.[1] ? ' ' + f.match(/\s{2,}(\(.*)$/)[1] : '') : f}`);
console.log(L.join('\n'));
