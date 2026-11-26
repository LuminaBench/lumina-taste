#!/usr/bin/env node
// Runs audit-ui.mjs against the gallery (all four views) and every blueprint, at desktop + mobile,
// light + dark. Blueprints also run the page-level taste critic (--taste --strict).
// Starts the static preview server if needed. Exit 1 on any error.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.LT_AUDIT_PORT) || 4411;
const base = `http://127.0.0.1:${port}/`;
if (!existsSync(join(root, 'preview/dist/index.html'))) spawnSync(process.execPath, [join(root, 'scripts/build.mjs')], { stdio: 'inherit' });
const server = spawn(process.execPath, [join(root, 'scripts/serve.mjs'), '--port', String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));

const blueprints = readdirSync(join(root, 'blueprints')).filter((d) => existsSync(join(root, 'blueprints', d, 'meta.json')));
const targets = [`${base}#/`, `${base}#/charts`, `${base}#/styles`, `${base}#/pages`, `${base}#/palettes`, `${base}#/compare`, `${base}#/ui/command-palette`, `${base}#/ui/kanban-board`, `${base}#/ui/notification-center`, `${base}#/ui/prompt-composer`, `${base}#/ui/chat-thread`, `${base}#/ui/logo-marquee`, `${base}#/ui/carousel`, `${base}#/ui/swipe-actions`, `${base}#/ui/setup-checklist`, `${base}#/ui/pricing-tiers`, `${base}#/ui/sign-in-card`, `${base}#/ui/hero-split`, `${base}#/styles/mono`, `${base}#/styles/kraft`, `${base}#/ui/select-menu`, `${base}#/ui/json-viewer`, `${base}#/ui/contact-section`, `${base}#/ui/uptime-bars`, `${base}#/ui/month-calendar`, `${base}#/ui/order-summary`, `${base}#/ui/product-card`, `${base}#/ui/search-results`, `${base}#/styles/tonal`, `${base}#/styles/system`, `${base}#/styles/noir`, `${base}#/styles/ticker`, `${base}#/ui/flyout-menu`, `${base}#/ui/navbar-simple`, `${base}#/ui/app-topbar`, `${base}#/ui/article-layout`, `${base}#/ui/before-after`, `${base}#/charts/leaderboard-table`, `${base}#/ui/settings-list`, `${base}#/ui/api-key-field`, `${base}#/ui/team-members`, `${base}#/ui/danger-zone`, `${base}#/ui/usage-meters`, `${base}#/styles/ledger`, `${base}#/styles/volt`, `${base}#/styles/civic`, `${base}#/charts/treemap`, `${base}#/charts/gantt-chart`, `${base}#/ui/assistant-thread`, `${base}#/ui/project-grid`, `${base}#/ui/doc-pager`, `${base}#/ui/feature-split`, `${base}#/ui/hero-centered`, `${base}#/ui/blog-grid`, `${base}#/ui/backdrop-grid`, `${base}#/ui/backdrop-wash`, `${base}#/ui/backdrop-dither`, `${base}#/ui/backdrop-circuit`, `${base}#/ui/switcher-menu`, `${base}#/ui/session-list`, `${base}#/ui/command-chip`, `${base}#/ui/announcement-pill`, `${base}#/ui/showcase-tabs`, `${base}#/styles/trace`, `${base}#/styles/ember`, `${base}#/styles/pixel`, `${base}#/styles/graph`, `${base}#/ui/device-frame`, `${base}#/ui/quote-feature`, `${base}#/ui/api-endpoint`, `${base}#/ui/terminal-window`, `${base}#/ui/sticky-story`, `${base}#/ui/media-player`, `${base}#/ui/row-list`, `${base}#/ui/mobile-app-bar`, `${base}#/ui/date-picker`, `${base}#/ui/amount-input`, `${base}#/ui/hold-to-confirm`, `${base}#/ui/art-panel`, `${base}#/ui/offer-cards`, `${base}#/ui/visit-info`, `${base}#/ui/booking-bar`, `${base}#/ui/task-list`, `${base}#/ui/hero-statement`, `${base}#/ui/service-list`, `${base}#/ui/invoice-sheet`, `${base}#/ui/scroll-statement`, `${base}#/ui/stack-cards`, `${base}#/ui/media-band`, `${base}#/ui/gallery-rail`, `${base}#/ui/swipe-row`, `${base}#/ui/pull-refresh`, `${base}#/ui/pane-resizer`, `${base}#/charts/chart-story`, `${base}#/charts/chart-story-scroll`];
const pages = blueprints.map((b) => `${base}blueprints/${b}/`);
// Every page state a blueprint ships is audited too: the states listed in its meta.json.
for (const b of blueprints) for (const s of JSON.parse(readFileSync(join(root, 'blueprints', b, 'meta.json'), 'utf8')).states ?? []) pages.push(`${base}blueprints/${b}/?state=${s}`);
mkdirSync(join(root, 'qa/artifacts'), { recursive: true });
const common = ['--focus-limit', process.env.FOCUS_LIMIT ?? '400', ...process.argv.slice(2)];
// Gallery views and element pages: element-level rules.
const res = spawnSync(process.execPath, [join(root, 'scripts/audit-ui.mjs'), ...targets, '--json', join(root, 'qa/artifacts/audit-report.json'), ...common], { stdio: 'inherit', cwd: root });
// Blueprints are whole pages, so they also face the page-level taste critic, and its warnings fail.
const bp = spawnSync(process.execPath, [join(root, 'scripts/audit-ui.mjs'), ...pages, '--taste', '--strict', '--json', join(root, 'qa/artifacts/audit-blueprints.json'), ...common], { stdio: 'inherit', cwd: root });
server.kill();
process.exit(res.status || bp.status ? 1 : 0);
