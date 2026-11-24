import { boot } from '../_shared/boot';
import { ICONS, type IconName } from '../../components/ui/_shared/icons';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/search-input/search-input.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/feedback/empty-state/empty-state.css';
import './page.css';
import { enhance as search } from '../../components/ui/controls/search-input/search-input';
import { enhance as segmented } from '../../components/ui/controls/segmented-control/segmented-control';

boot({ 'search-input': search, 'segmented-control': segmented });

interface Skill { id: string; cat: string; icon: IconName; desc: string; installs: number; added: string; tag?: string }
const SKILLS: Skill[] = [
  { id: 'lumina-taste', cat: 'design', icon: 'layers', desc: 'Anti-slop UI patterns, palettes, charts and page blueprints.', installs: 18400, added: '2026-11-24', tag: 'New' },
  { id: 'lumina-sfx', cat: 'media', icon: 'play', desc: 'Find, sculpt and export game and UI sound effects offline.', installs: 22100, added: '2026-10-02' },
  { id: 'lumina-physics', cat: 'games', icon: 'globe', desc: 'Water, weather, vehicles and destruction for WebGPU games.', installs: 9800, added: '2026-09-14' },
  { id: 'chart-doctor', cat: 'data', icon: 'chart', desc: 'Rewrites misleading charts into honest, labelled ones.', installs: 7400, added: '2026-08-30' },
  { id: 'sql-explainer', cat: 'data', icon: 'code', desc: 'Explains slow queries and suggests the index that fixes them.', installs: 12600, added: '2026-07-11' },
  { id: 'copy-editor', cat: 'design', icon: 'edit', desc: 'Plain-English microcopy for buttons, errors and empty states.', installs: 6900, added: '2026-11-02' },
  { id: 'icon-aligner', cat: 'design', icon: 'waffle', desc: 'Finds icons that sit off the text baseline and fixes them.', installs: 3100, added: '2026-06-20' },
  { id: 'sprite-packer', cat: 'games', icon: 'image', desc: 'Packs sprites into atlases with padding and trim.', installs: 4200, added: '2026-05-28' },
  { id: 'podcast-cutter', cat: 'media', icon: 'pause', desc: 'Removes silences and ums from spoken audio.', installs: 5600, added: '2026-10-21' },
  { id: 'csv-cleaner', cat: 'data', icon: 'file', desc: 'Fixes broken headers, dates and encodings in CSV exports.', installs: 15100, added: '2026-04-09' },
  { id: 'level-designer', cat: 'games', icon: 'sliders', desc: 'Blocks out playable levels from a one-line brief.', installs: 2700, added: '2026-11-18', tag: 'New' },
  { id: 'a11y-auditor', cat: 'design', icon: 'eye', desc: 'Keyboard, contrast and screen reader checks for any URL.', installs: 11300, added: '2026-03-30' },
];
const icon = (n: IconName) => `<svg class="lt-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] ?? ICONS.layers}</svg>`;
const state = { q: '', cat: 'all', sort: 'popular' };
const grid = document.getElementById('grid')!;
const count = document.getElementById('count')!;
const empty = document.getElementById('empty')!;
const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function render() {
  const q = state.q.trim().toLowerCase();
  let list = SKILLS.filter((s) => (state.cat === 'all' || s.cat === state.cat) && (!q || `${s.id} ${s.desc} ${s.cat}`.toLowerCase().includes(q)));
  list = [...list].sort((a, b) => (state.sort === 'popular' ? b.installs - a.installs : state.sort === 'new' ? b.added.localeCompare(a.added) : a.id.localeCompare(b.id)));
  grid.innerHTML = list.map((s, i) => `<li class="dir-card"><a href="#${s.id}" style="animation-delay:${Math.min(i, 6) * 30}ms"><span class="dir-card-top"><span class="dir-icon">${icon(s.icon)}</span>${s.tag ? `<span class="lt-badge" data-tone="accent">${s.tag}</span>` : ''}</span><h2>${s.id}</h2><p>${s.desc}</p><span class="dir-meta"><span>${s.cat[0].toUpperCase() + s.cat.slice(1)}</span><span>${fmt(s.installs)} installs</span></span></a></li>`).join('');
  count.textContent = `${list.length} of ${SKILLS.length} skills`;
  empty.hidden = list.length > 0;
}
document.getElementById('dir-q')!.addEventListener('input', (e) => { state.q = (e.target as HTMLInputElement).value; render(); });
document.querySelector('.dir-search')!.addEventListener('lt-change', (e) => { state.q = (e as CustomEvent).detail.value; render(); });
document.getElementById('pills')!.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLElement>('[data-cat]');
  if (!b) return;
  document.querySelectorAll('#pills [data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  state.cat = b.dataset.cat!;
  render();
});
document.getElementById('sort')!.addEventListener('lt-change', (e) => { state.sort = (e as CustomEvent).detail.value; render(); });
document.getElementById('reset')!.addEventListener('click', () => {
  state.q = ''; state.cat = 'all';
  (document.getElementById('dir-q') as HTMLInputElement).value = '';
  document.querySelectorAll('#pills [data-cat]').forEach((x) => x.setAttribute('aria-pressed', String((x as HTMLElement).dataset.cat === 'all')));
  render();
});
render();
