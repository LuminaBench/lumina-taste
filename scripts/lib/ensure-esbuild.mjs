// esbuild is the one package drafting needs (it bundles a page's parts into one script). A fresh `npx skills add`
// has no node_modules, so the first draft installs it once in the skill's own folder, says so, and carries on.
// LT_NO_AUTO_INSTALL=1 turns that off (the caller then prints the one command to run instead).
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const load = async (root) => {
  try { return await import(pathToFileURL(createRequire(join(root, 'package.json')).resolve('esbuild')).href); } catch { return null; }
};

/** esbuild, installed on first use if it is missing. Returns the module, or null with `why` set. */
export async function ensureEsbuild(root, { log = (m) => process.stderr.write(`${m}\n`) } = {}) {
  const have = await load(root);
  if (have) return { esbuild: have };
  if (process.env.LT_NO_AUTO_INSTALL) return { esbuild: null, why: 'automatic install is off (LT_NO_AUTO_INSTALL)' };
  log('lumina-taste: first run, installing its one dependency (esbuild, about 10 MB) in the skill folder…');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const r = spawnSync(npm, ['install', '--omit=dev', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.error || r.status !== 0) return { esbuild: null, why: (r.error?.message || r.stderr || '').trim().split('\n').slice(-2).join(' ') || 'npm install failed' };
  const now = await load(root);
  if (now) log('lumina-taste: ready.');
  return now ? { esbuild: now } : { esbuild: null, why: 'esbuild still could not be loaded after installing' };
}
