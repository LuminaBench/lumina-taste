// Every page type is drafted from the brief: pricing, contact, a shop's product, checkout, docs, a changelog, a
// status page, settings, a dashboard, an admin list, a desktop work app, an inbox, phone apps, an assistant, an
// agent, sign-in, a 404, a directory and an article, as well as the marketing pages composed band by band.
// No sample business survives (each blueprint's brand, proper nouns, prices and subject nouns are banned),
// nothing is invented (one price is one plan; rows are labelled sample rows), and apps are planned as flows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const compose = (brief, dir, ...extra) => spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), brief, ...(dir ? ['--project', dir, '--write'] : []), '--json', ...extra], { encoding: 'utf8' });

// One brief per page type, each with its own made-up business.
export const BRIEFS = {
  landing: ['Landing page for Tally, an invoicing tool for freelancers that sends an invoice in 30 seconds, £9 a month, how it works: add a client, send the invoice, get paid', 'landing'],
  pricing: ['Pricing page for Relay, a webhooks API for developers: Free for 10,000 events a month, Pro £29 a month for 1 million events and 30 days of logs, Scale £199 a month with SSO, an audit log and a 99.9% uptime SLA', 'pricing'],
  pricingOne: ['Pricing page for Quill, a note-taking app for small teams, £8 a month or £80 a year per person, includes unlimited notes, shared folders and offline mode, 14-day free trial', 'pricing'],
  dashboard: ['Dashboard for Pawprint, a booking app for dog groomers that tracks bookings, clients and payments, bookings with dog, owner, groomer, date, price and status, run by Ola Brennan and Jude Marsh', 'dashboard'],
  settings: ['Settings page for Pawprint, a booking app for dog groomers that tracks bookings and clients, notifications: new bookings, cancellations and daily summary, the £19 a month plan, run by Ola Brennan and Jude Marsh', 'settings'],
  docs: ['Docs page for Relay, a webhooks API for developers, how it works: create an endpoint, send a test event, verify the signature', 'docs'],
  auth: ['Sign-in page for Pawprint, a booking app for dog groomers that keeps every booking, reminder and payment in one place', 'auth'],
  directory: ['Template directory for Quill, a note-taking app, templates: meeting notes, project brief, weekly review, retro, reading list and one-to-one', 'directory'],
  blog: ['Blog article for Quill about writing meeting notes people read, by Mara Quist', 'blog'],
  portfolio: ['Portfolio for Meridian, an architecture studio in Leeds', 'portfolio'],
  store: ['Product page for the Tidewater Pottery large stoneware mug, £32, 450 ml, glazes: sea green, oat and slate, dishwasher safe, free UK delivery over £50, made by hand in Cornwall', 'store-product'],
  checkout: ['Checkout for Fernhill, a homeware shop: a walnut desk lamp £67, three wool throws at £42 each, standard delivery £3.95, next day delivery £8.50, free delivery over £250, returns free within 30 days', 'checkout'],
  changelog: ['Changelog for Quill, a note-taking app: v2.4 added shared folders, v2.3 added offline mode, v2.2 fixed slow search', 'changelog'],
  status: ['Status page for Relay with services: API, webhook delivery, dashboard and the CLI', 'status'],
  admin: ['Admin list of orders for Fernhill, a furniture shop, orders with customer, items, total, placed and status: paid, shipped, delivered, refunded', 'admin-table'],
  workspace: ['Desktop work app for Larch, a scheduling tool for a cleaning company, jobs with client, address, cleaner, start time and status: booked, on the way, done', 'workspace'],
  chat: ['AI assistant chat for Ledgerly, a bookkeeping tool that answers questions about invoices, expenses and VAT', 'ai-chat'],
  inbox: ['Support inbox for Pawprint, a booking app for dog groomers: conversations about bookings, cancellations and payments', 'inbox'],
  notfound: ['404 page for Relay, a webhooks API that tracks endpoints and events', 'not-found'],
  contact: ['Contact page for Harrow & Finch, an employment law firm at 4 King Street, Manchester M2 4LQ, phone 0161 496 0322, email hello@harrowfinch.co.uk, open Monday to Friday 9 to 5.30', 'contact'],
  about: ['About page for Brackenridge, a bicycle repair co-op in Sheffield, run by Asha Pike and Tom Reyes', 'about'],
  devLanding: ['Developer tool landing page for Sluice, a log search CLI for developers that searches 10 GB of logs in 2 seconds, how it works: install the CLI, point it at a folder, search', 'dev-landing'],
  agent: ['Agent workspace for Tiller, a coding agent, projects: billing service, mobile app and docs site, how it works: read the issue, write a plan, open a pull request', 'agent-app'],
  mobile: ['Home screen of a phone app for Kitebag, a packing list app that tracks trips and lists, trips with destination, leaves, items and status', 'mobile-app'],
  phone: ['Phone app for Tally Up, a habit tracker, how it works: pick three habits, tick them off each day, see your week', 'app-phone'],
  venue: ['Home page for Crumb & Co, a sourdough bakery at 12 Mill Lane, Frome BA11 1AB, open Tuesday to Sunday 7:30 to 3, loaves from £4.20', 'venue'],
  brand: ['Home page for Fernhill Pottery, a small pottery studio selling mugs, bowls and plates online, mugs from £28', 'brand-landing'],
  service: ['Website for Harrow & Finch, a three-partner employment law firm in Manchester, settlement agreement review from £450, phone 0161 496 0322', 'service-landing'],
  cause: ['Home page for Canal Street Food Bank, a volunteer-run charity in Birmingham that gave out 410 food parcels a week last winter', 'cause'],
  event: ['Website for Signal & Noise, a one-day data journalism conference in Glasgow, tickets £120', 'event'],
};

// The sample businesses' words: each blueprint's brand (meta.json), the proper nouns, prices and string
// literals in its copy and script, and the nouns of its subject. A word the brief also uses is the brief's.
const SUBJECT = {
  venue: ['coffee', 'espresso', 'roaster', 'roastery', 'beans', 'Huila', 'Sidamo'], practice: ['dentist', 'dental', 'hygienist', 'teeth', 'NHS'], cause: ['pantry', 'nappies', 'Gift Aid'],
  shop: ['glaze', 'kiln'], event: ['keynote'], landing: ['MRR', 'Postgres', 'warehouse'], pricing: ['dashboards', 'seats', 'seat', 'SCIM'], dashboard: ['MRR', 'ARR', 'churn', 'Region'],
  admin: ['Deactivated', 'Invite user', 'Reset password'], settings: ['Workspace ID', 'Frankfurt', 'Metric alerts', 'Mentions'], status: ['Data ingestion', 'Single sign-on', 'Alerts and email', 'Exports'],
  changelog: ['Realtime alerts', 'chart engine'], checkout: ['Oak side table', 'Linen cushion cover', 'Collect from Bristol', 'Promo code'], store: ['Huila', 'Grind', 'Cafetière', 'Single origin', 'per 100 g'],
  docs: ['Taste profiles', 'Attach mode', 'taste-profile.json'], auth: ['Name your workspace', 'How big is your team', 'Connect a data source'], inbox: ['Charged twice', 'credit note', 'Moss Studio'],
  'app-phone': ['harbour', 'sailing', 'ferry', 'Ardmore'], workspace: ['sailings', 'Car deck', 'Ardmore', 'purser'], mobile: ['Balance'], assistant: ['churn', 'Starter cancellations'],
  agent: ['ledger', 'payments webhook'], directory: ['skills', 'Skills hub', 'superpowers'], editorial: ['essay'],
};
const COMMON = new Set(['The', 'A', 'An', 'We', 'You', 'Your', 'Our', 'It', 'If', 'In', 'On', 'At', 'For', 'From', 'To', 'And', 'Or', 'No', 'Yes', 'Open', 'Closed', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Today', 'Book', 'Call', 'Privacy', 'Terms', 'Contact', 'Address', 'Opening', 'Questions', 'Find', 'Free', 'Get', 'See', 'Menu', 'Skip', 'Choose', 'Date', 'Time', 'People', 'Fees', 'How', 'What', 'Who', 'Where', 'When', 'Why', 'One', 'Two', 'Three', 'Four', 'Ltd', 'Every', 'Each', 'This', 'That', 'All', 'Any', 'Most', 'Some', 'Do', 'Is', 'Are', 'Can', 'Will', 'By', 'With', 'Pay', 'Give', 'Bring', 'Before', 'After', 'Then', 'Next', 'Previous', 'Clear', 'Start', 'Prices', 'Price', 'Visit', 'Hours', 'Phone', 'Email', 'Partner', 'Owner', 'Delivery', 'Payment', 'Subtotal', 'Total', 'Status', 'Settings', 'Profile', 'Notifications', 'Team', 'Plan', 'Search', 'Enter', 'Shift', 'Send', 'Reply', 'Close', 'Back', 'Docs', 'Sign', 'Export', 'Overview', 'Working', 'Degraded', 'Outage', 'Card', 'Expiry', 'Security', 'Postcode', 'Town', 'Full', 'Billed', 'Monthly', 'Annual', 'Yearly', 'Checkout', 'Details', 'Returns', 'Shop', 'Bag', 'Notify', 'Sold', 'Added', 'Discard', 'Save', 'Delete', 'Leave', 'Try', 'Light', 'Dark', 'System', 'Appearance', 'Account', 'Assigned', 'Unread', 'Customer', 'Latest', 'Step', 'Done', 'Booked', 'Active', 'Paused', 'Archived', 'Paid', 'Shipped', 'Delivered', 'Refunded', 'New', 'Fixed', 'Improved', 'Getting', 'Concepts', 'Topics', 'Ask', 'Answers', 'Subscribe', 'Updates', 'Morning', 'Weekly', 'Daily', 'Secure', 'Order', 'Contact', 'Check', 'Code', 'Change', 'Resend', 'Digit', 'Message', 'Name', 'Week', 'Days', 'Billing', 'Home', 'Data']);
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function sampleWords() {
  const all = new Map();
  for (const bp of readdirSync(join(root, 'blueprints')).filter((d) => existsSync(join(root, 'blueprints', d, 'meta.json')))) {
    const dir = join(root, 'blueprints', bp);
    const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
    const ts = existsSync(join(dir, 'main.ts')) ? readFileSync(join(dir, 'main.ts'), 'utf8') : '';
    const words = new Set([...(meta.brand ?? []), ...(SUBJECT[bp] ?? [])]);
    for (const m of text.matchAll(/(?<=[a-z,]\s)([A-Z][a-z]{3,}(?:\s(?:&\s)?[A-Z][a-z]+)*)/g)) if (!COMMON.has(m[1].split(' ')[0])) words.add(m[1]);
    for (const m of text.matchAll(/£\d[\d,.]*\d/g)) words.add(m[0]);
    // Names a blueprint's script writes into the page ("Harbour & Co", "Kestrel Isle").
    for (const m of ts.matchAll(/'([A-Z][a-z]+(?: (?:&|[A-Z][a-z]+))+)'/g)) words.add(m[1]);
    for (const w of words) if (!all.has(w)) all.set(w, bp);
  }
  return all;
}

test('every page type has a draft written from the brief, and the test briefs land on their types', () => {
  const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
  const covered = new Set(Object.values(BRIEFS).map(([, t]) => t));
  for (const t of kb.pageTypes) assert.ok(covered.has(t.id), `a brief for ${t.id}`);
  for (const [slug, [brief, type]] of Object.entries(BRIEFS)) assert.equal(JSON.parse(compose(brief).stdout).pageType.id, type, slug);
});

test('drafts of every page type carry no sample business: no brand, name, price or subject noun from any blueprint', () => {
  const banned = sampleWords();
  const dir = mkdtempSync(join(tmpdir(), 'lt-pages-'));
  try {
    for (const [slug, [brief]] of Object.entries(BRIEFS)) {
      const r = compose(brief, join(dir, slug));
      assert.equal(r.status, 0, `${slug}: ${r.stderr}`);
      const plan = JSON.parse(r.stdout);
      assert.ok(['composed', 'page'].includes(plan.draft.kind), `${slug}: drafted from the brief, not a blueprint copy (${plan.draft.kind})`);
      const html = readFileSync(join(dir, slug, 'index.html'), 'utf8');
      // What a visitor, a screen reader or a search engine meets: text, labels, placeholders, the title.
      const seen = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '');
      // Seeded sample figures in a table's number cells may match a sample's price by chance; they are labelled sample rows, not a business's prices.
      const words = seen.replace(/<td data-num[^>]*>[^<]*<\/td>/g, '');
      const attrs = [...words.matchAll(/\s(?:aria-label|placeholder|title|alt|content|data-say|data-say-form|data-saved|data-sent|data-good|data-bad|data-chart-options)="([^"]*)"/g)].map((m) => m[1]).join(' ');
      const visible = `${words.replace(/<[^>]+>/g, ' ')} ${attrs}`.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      const left = [...banned].filter(([w]) => !brief.toLowerCase().includes(w.toLowerCase()) && new RegExp(`(^|[^\\w£])${esc(w)}(?![\\w,.]*\\d)(?!\\w)`, 'i').test(visible)).map(([w, bp]) => `${w} (${bp})`);
      assert.deepEqual(left, [], `${slug}: sample words left`);
      for (const m of visible.matchAll(/£\d[\d,.]*\d/g)) if (!/data-chart|lt-num|data-num/.test(m.input.slice(Math.max(0, m.index - 200), m.index))) assert.ok(brief.includes(m[0]) || plan.draft.kind === 'page', `${slug}: ${m[0]} is not in the brief`);
      // The page's own script and styles carry no copy of their own.
      if (plan.draft.kind === 'page') {
        const js = readFileSync(join(dir, slug, 'lumina-taste', 'page.js'), 'utf8');
        const leftJs = [...banned].filter(([w]) => w.length > 4 && new RegExp(`(^|[^\\w])${esc(w)}(?!\\w)`).test(js)).map(([w]) => w);
        assert.deepEqual(leftJs, [], `${slug}: page.js`);
        assert.ok(html.indexOf('<!-- TODO before this page ships') < html.indexOf('<a class="bp-skip"') || !html.includes('TODO before'), `${slug}: one TODO list at the top`);
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the brief\'s own facts fill each page: plans, address, product, basket, services, releases, columns', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-pagefacts-'));
  const page = (slug) => { const r = compose(BRIEFS[slug][0], join(dir, slug)); assert.equal(r.status, 0, r.stderr); return { html: readFileSync(join(dir, slug, 'index.html'), 'utf8'), plan: JSON.parse(r.stdout) }; };
  try {
    // Pricing: the brief's three plans, never more; one price is one plan, with its yearly price on a toggle.
    const three = page('pricing').html;
    assert.equal((three.match(/<article class="pr-tier"/g) ?? []).length, 3);
    for (const x of ['Free', 'Pro', 'Scale', '£29', '£199', '1 million events', 'Audit log']) assert.ok(three.includes(x), x);
    assert.equal((three.match(/data-featured/g) ?? []).length, 1, 'one featured plan');
    const one = page('pricingOne').html;
    assert.equal((one.match(/<article class="pr-tier"/g) ?? []).length, 1, 'one price is one plan');
    assert.match(one, /data-monthly="£8" data-annual="£80"/);
    assert.match(one, /Start a 14-day trial/);
    // Contact: the address, phone, email and hours as written.
    const contact = page('contact').html;
    for (const x of ['4 King Street', 'M2 4LQ', 'tel:01614960322', 'mailto:hello@harrowfinch.co.uk', '9:00 to 17:30']) assert.ok(contact.includes(x), x);
    // A product in a shop: its maker, name, price on the button, options and plain facts.
    const store = page('store').html;
    for (const x of ['Large stoneware mug', 'Tidewater Pottery', 'Add to bag · £32', 'Sea green', 'Slate', 'Dishwasher safe', 'Free UK delivery over £50', 'data-view="sold-out"']) assert.ok(store.includes(x), x);
    // Checkout: the basket's lines, the total worked out from them, the delivery choices.
    const co = page('checkout').html;
    for (const x of ['Walnut desk lamp', '3 × £42.00', '£193.00', 'Pay <span data-total>£196.95</span>', 'Next day delivery', 'data-view="error"']) assert.ok(co.includes(x), x);
    // Status: the brief's services; changelog: its releases; docs: its steps.
    const status = page('status').html;
    for (const x of ['API', 'Webhook delivery', 'Dashboard', 'CLI', 'data-view="incident"']) assert.ok(status.includes(x), x);
    const cl = page('changelog').html;
    for (const x of ['v2.4', 'Shared folders', 'Offline mode', 'Slow search']) assert.ok(cl.includes(x), x);
    assert.match(page('docs').html, /Create an endpoint[\s\S]*Send a test event[\s\S]*Verify the signature/);
    // Apps: columns named from the brief, rows labelled with its nouns, its people where a field is staff.
    const dash = page('dashboard');
    for (const x of ['>Dog<', '>Owner<', '>Groomer<', '>Price<', 'Booking #1040', 'Dog 01', 'Ola Brennan', 'New booking', 'data-chart="kpi-card"']) assert.ok(dash.html.includes(x), x);
    const admin = page('admin').html;
    for (const x of ['Order #1040', 'Customer 01', '>Total<', '>Placed<', 'data-value="refunded"', 'data-filter="search"', 'id="detail"']) assert.ok(admin.includes(x), x);
    const ws = page('workspace').html;
    for (const x of ['Job #1040', '>Cleaner<', 'On the way', 'data-inspector']) assert.ok(ws.includes(x), x);
    const settings = page('settings').html;
    for (const x of ['New bookings', 'Cancellations', 'Daily summary', 'Ola Brennan', '£19 a month', 'Delete your Pawprint account']) assert.ok(settings.includes(x), x);
    // Nothing on an app screen pretends to be a real customer.
    for (const h of [dash.html, admin]) assert.doesNotMatch(h.replace(/<!--[\s\S]*?-->/g, ''), /\b(?:Ana López|Riya Mehta|Kai Moreno)\b/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('apps are planned as a flow, with empty, loading and error states in the brief\'s words, and drafted with them', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-flow-'));
  try {
    for (const slug of ['dashboard', 'admin', 'workspace', 'inbox', 'phone', 'mobile', 'settings']) {
      const r = compose(BRIEFS[slug][0], join(dir, slug));
      const plan = JSON.parse(r.stdout);
      assert.ok(plan.flow, `${slug}: a flow`);
      assert.deepEqual(plan.flow.screens.map((s) => s.id), ['start', 'home', 'detail', 'settings'], slug);
      const { empty, loading, error } = plan.flow.states;
      const many = plan.model.records[0].many;
      assert.ok(empty.title.includes(many) && loading.label.includes(many) && error.title.toLowerCase().includes(many), `${slug}: states name the ${many}`);
      const html = readFileSync(join(dir, slug, 'index.html'), 'utf8');
      if (slug !== 'settings') for (const st of ['loading', 'empty', 'error']) assert.match(html, new RegExp(`data-view="[^"]*\\b${st}\\b`), `${slug}: ${st} state`);
      if (!['settings', 'inbox'].includes(slug)) assert.ok(html.includes(empty.title), `${slug}: the empty state's words`);
    }
    // Phone apps: every planned screen is drafted, one phone each, in order.
    const phone = readFileSync(join(dir, 'phone', 'index.html'), 'utf8');
    assert.deepEqual([...phone.matchAll(/data-screen="([a-z]+)"/g)].map((m) => m[1]), ['start', 'home', 'detail', 'settings']);
    assert.match(phone, /<html[^>]*data-app/);
    assert.match(phone, /Pick three habits[\s\S]*Tick them off each day/);
    const md = spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), BRIEFS.phone[0]], { encoding: 'utf8' }).stdout;
    assert.match(md, /The app as a flow/);
    assert.match(md, /\*\*Empty:\*\* "No habits yet"/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the page model reads plans, baskets, records and releases from the brief, and never adds tiers', async () => {
  const { extractFacts } = await import(join(root, 'engine/compose/words.mjs'));
  const { plansFrom, basketFrom, recordsFrom, releasesFrom, statusesFor, singular, plural } = await import(join(root, 'engine/compose/model.mjs'));
  const f = (b, p) => extractFacts(b, { product: p });
  assert.deepEqual(plansFrom(f(BRIEFS.pricing[0], 'Relay'), { product: 'Relay' }).map((p) => [p.name, p.price, p.features.length]), [['Free', null, 1], ['Pro', '£29', 2], ['Scale', '£199', 3]]);
  assert.equal(plansFrom(f('Pricing for Lumen, a reading app, £5 a month'), { product: 'Lumen' }).length, 1);
  assert.deepEqual(plansFrom(f('Pricing page for a meditation app'), {}), []);
  const basket = basketFrom(f(BRIEFS.checkout[0]));
  assert.deepEqual(basket.items.map((i) => [i.name, i.qty, i.price]), [['Walnut desk lamp', 1, 67], ['Wool throw', 3, 42]]);
  assert.deepEqual(basket.delivery.map((d) => d.price), [3.95, 8.5]);
  assert.equal(basket.freeOver, '£250');
  const recs = recordsFrom(f(BRIEFS.dashboard[0]));
  assert.deepEqual(recs.map((r) => r.many), ['bookings', 'clients', 'payments']);
  assert.deepEqual(recs[0].fields.map((x) => `${x.name}:${x.kind}`), ['Booking:ref', 'dog:name', 'owner:name', 'groomer:name', 'date:date', 'price:money', 'status:status']);
  assert.deepEqual(statusesFor(recs[0], f(BRIEFS.admin[0])).list, ['Paid', 'Shipped', 'Delivered', 'Refunded']);
  assert.deepEqual(releasesFrom(f(BRIEFS.changelog[0])).map((r) => [r.version, r.tag]), [['v2.4', 'new'], ['v2.3', 'new'], ['v2.2', 'fixed']]);
  assert.deepEqual([singular('deliveries'), singular('classes'), singular('glazes'), plural('delivery'), plural('class')], ['delivery', 'class', 'glaze', 'deliveries', 'classes']);
});
