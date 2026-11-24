#!/usr/bin/env node
// Runs audit-ui.mjs against the gallery (all four views) and every blueprint, at desktop + mobile,
// light + dark. Starts the static preview server if needed. Exit 1 on any error.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = 4411;
const base = `http://127.0.0.1:${port}/`;
if (!existsSync(join(root, 'preview/dist/index.html'))) spawnSync(process.execPath, [join(root, 'scripts/build.mjs')], { stdio: 'inherit' });
const server = spawn(process.execPath, [join(root, 'scripts/serve.mjs'), '--port', String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));

const blueprints = readdirSync(join(root, 'blueprints')).filter((d) => existsSync(join(root, 'blueprints', d, 'meta.json')));
const targets = [`${base}#/`, `${base}#/charts`, `${base}#/styles`, `${base}#/pages`, `${base}#/palettes`, `${base}#/compare`, `${base}#/ui/command-palette`, `${base}#/ui/kanban-board`, `${base}#/ui/notification-center`, `${base}#/ui/prompt-composer`, `${base}#/ui/chat-thread`, `${base}#/ui/logo-marquee`, `${base}#/ui/carousel`, `${base}#/ui/swipe-actions`, `${base}#/ui/setup-checklist`, `${base}#/ui/pricing-tiers`, `${base}#/ui/sign-in-card`, `${base}#/ui/hero-split`, `${base}#/styles/mono`, `${base}#/styles/kraft`, `${base}#/ui/select-menu`, `${base}#/ui/json-viewer`, `${base}#/ui/contact-section`, `${base}#/ui/uptime-bars`, `${base}#/charts/leaderboard-table`, ...blueprints.map((b) => `${base}blueprints/${b}/`)];
mkdirSync(join(root, 'qa/artifacts'), { recursive: true });
const args = [join(root, 'scripts/audit-ui.mjs'), ...targets, '--json', join(root, 'qa/artifacts/audit-report.json'), '--focus-limit', process.env.FOCUS_LIMIT ?? '400', ...process.argv.slice(2)];
const res = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: root });
server.kill();
process.exit(res.status ?? 1);
