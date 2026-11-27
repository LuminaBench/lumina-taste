#!/usr/bin/env node
// A finished starting point in one command: the page drafted from the brief, the brand kit around it, and one
// checklist of what is still sample or missing. The person's own media is used first when there is any.
//
//   node scripts/starter.mjs cafe "Copper Hare, a coffee shop at 21 Gillygate, York, flat white £3.40" --project ./site
//   node scripts/starter.mjs trade "Granite Row, builders in Glasgow, work from £40,000" --project ./site --media ./photos
//   node scripts/starter.mjs bank-app "Juniper bank app on the phone: balance, pots, send money" --project ./app
//
// Kinds: cafe, restaurant, shop, trade, practice, charity, event, software, devtool, bank-app, fitness-app,
// booking-app, chat-app. Each fixes the page type (and the app blueprint) so a short brief lands right.
// --images also fetches public-domain photographs for what the person's media does not cover.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KINDS = {
  cafe: 'venue', restaurant: 'venue', shop: 'brand-landing', trade: 'service-landing', practice: 'service-landing', charity: 'cause', event: 'event',
  software: 'landing', devtool: 'dev-landing', 'bank-app': null, 'fitness-app': null, 'booking-app': null, 'chat-app': null,
};
// App starters: the brief is steered to the app's own blueprint by naming it plainly.
const APP_WORDS = { 'bank-app': 'bank app on the phone', 'fitness-app': 'running app on the phone', 'booking-app': 'booking app on the phone for customers', 'chat-app': 'chat app on the phone' };

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (n) => { const i = args.indexOf(`--${n}`); if (i < 0) return false; args.splice(i, 1); return true; };
const project = opt('project'), media = opt('media'), images = flag('images');
const [kind, ...rest] = args;
const brief = rest.join(' ').trim();
if (!kind || !(kind in KINDS) || !brief || !project) {
  console.error(`Usage: node scripts/starter.mjs <kind> "<brief>" --project ./site [--media ./folder] [--images]\nKinds: ${Object.keys(KINDS).join(', ')}`);
  process.exit(2);
}
const dir = resolve(project);
const steered = KINDS[kind] === null && !new RegExp(APP_WORDS[kind].split(' ')[0], 'i').test(brief) ? `${brief}, ${APP_WORDS[kind]}` : brief;
const run = (script, a) => spawnSync(process.execPath, [join(root, 'scripts', script), ...a], { encoding: 'utf8', env: process.env });

// 1. The page (or the app), drafted from the brief, with the person's media first.
const c = run('compose.mjs', [steered, '--project', dir, '--write', '--json', ...(KINDS[kind] ? ['--type', KINDS[kind]] : []), ...(media ? ['--media', resolve(media)] : []), ...(images ? ['--images'] : [])]);
if (c.status !== 0) { console.error(c.stderr || c.stdout); process.exit(1); }
const plan = JSON.parse(c.stdout);
const name = plan.designBrief?.product && !/^not named/.test(plan.designBrief.product) ? plan.designBrief.product : null;

// 2. The brand around it (compose --media already made one from a logo; otherwise draw it from the subject).
const brandDir = join(dir, 'brand');
let brand = existsSync(join(brandDir, 'brand.json')) ? 'from your logo' : null;
if (!brand && name) {
  const b = run('brand-kit.mjs', ['--name', name, '--line', plan.words?.firstScreen?.headline ?? '', '--subject', plan.words?.facts?.kind ?? brief, '--palette', plan.profile.palette, '--type', plan.profile.typography, '--out', brandDir]);
  brand = b.status === 0 ? 'drawn from the subject' : null;
}

// 3. One checklist: what is still sample or missing, from the plan and the page.
const pagePath = plan.draft?.path ? resolve(plan.draft.path) : join(dir, 'index.html');
const rel = relative(dir, pagePath) || 'index.html';
const page = existsSync(pagePath) ? readFileSync(pagePath, 'utf8') : '';
const samples = (page.match(/data-sample/g) ?? []).length;
const todo = [...new Set([...(name ? [] : ['the business\'s name (the bar says TODO: name until then)']), ...(plan.words?.missing ?? []), ...(plan.draft?.todo ?? [])])];
const lines = [
  `# ${name ?? 'Your'} starter (${kind})`, '',
  `Made from: ${brief}`, '',
  `- Page: ${rel} (${plan.pageType.name.toLowerCase()}, first screen: ${plan.artDirection?.hero?.name ?? 'the app\'s own'})`,
  `- Look: ${plan.profile.palette} palette, ${plan.profile.typography} type${plan.artDirection?.hero?.why ? `; the first screen because ${plan.artDirection.hero.why}` : ''}`,
  `- Pictures: ${plan.draft?.images?.note ?? 'drawings of the subject, to replace with your own photographs (rerun with --media ./folder)'}`,
  `- Brand: ${brand ? `brand/ (${brand}): wordmark, favicon and icons, share image, email header` : 'not made (no name yet)'}`,
  ...(plan.words?.firstScreen?.options?.length ? [`- Other headlines from the same facts: ${plan.words.firstScreen.options.map((o) => `“${o}”`).join(', ')}`] : []),
  '', '## Before it ships', '',
  ...(samples ? [`- ${samples} part(s) hold sample rows (marked data-sample): replace them with your own records`] : []),
  ...todo.map((t) => `- ${t}`),
  `- Check it: node <lumina-taste>/scripts/audit-ui.mjs ${rel} --taste${name ? ` --product "${name}"` : ''}`,
];
writeFileSync(join(dir, 'STARTER.md'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
