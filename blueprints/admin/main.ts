import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/search-input/search-input.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import '../../components/ui/data/data-table/data-table.css';
import '../../components/ui/overlays/bulk-action-bar/bulk-action-bar.css';
import '../../components/ui/navigation/pagination/pagination.css';
import '../../components/ui/overlays/drawer/drawer.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/feedback/skeleton/skeleton.css';
import '../../components/ui/feedback/empty-state/empty-state.css';
import '../../components/ui/feedback/callout/callout.css';
import '../../components/ui/controls/checkbox/checkbox.css';
import './page.css';
import { enhance as searchInput } from '../../components/ui/controls/search-input/search-input';
import { enhance as segmented } from '../../components/ui/controls/segmented-control/segmented-control';
import { enhance as bulk } from '../../components/ui/overlays/bulk-action-bar/bulk-action-bar';
import { enhance as pagination } from '../../components/ui/navigation/pagination/pagination';

boot({ 'search-input': searchInput, 'segmented-control': segmented, 'bulk-action-bar': bulk, pagination });
pageStates();

// Search and status filter work together; the count and the "no match" line follow them.
const q = document.querySelector<HTMLInputElement>('#ad-q')!;
const rows = [...document.querySelectorAll<HTMLTableRowElement>('.ad-table tbody tr')];
const nomatch = document.querySelector<HTMLElement>('#ad-nomatch')!;
let status = 'all';
const pager = document.querySelector<HTMLElement>('.ad-main .lt-pagination');
function filter() {
  const term = q.value.trim().toLowerCase();
  let shown = 0;
  for (const r of rows) {
    const ok = (status === 'all' || r.dataset.status === status) && (!term || r.dataset.search!.includes(term));
    r.hidden = !ok;
    if (ok) shown++;
  }
  nomatch.hidden = shown > 0;
  nomatch.querySelector('span')!.textContent = q.value.trim() || status;
  // The page numbers count all 1,284 people: while a filter or search narrows the list, they would be wrong.
  if (pager) pager.style.visibility = status === 'all' && !term ? '' : 'hidden';
}
q.addEventListener('input', filter);
document.querySelector('#ad-status')!.addEventListener('lt-change', (e) => { status = String((e as CustomEvent).detail?.value ?? 'all'); filter(); });
document.querySelector('#ad-reset')!.addEventListener('click', () => { q.value = ''; q.dispatchEvent(new Event('input')); q.focus(); });

// Row detail opens in a drawer beside the list, so the list stays in view.
const drawer = document.querySelector<HTMLDialogElement>('#ad-drawer')!;
let opener: HTMLElement | null = null;
document.querySelector('.ad-table')!.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('[data-user]');
  if (!b) return;
  const tr = b.closest('tr')!;
  const cells = tr.cells;
  opener = b;
  drawer.querySelector('#ad-drawer-h')!.textContent = b.querySelector('strong')!.textContent;
  drawer.querySelector('#ad-d-email')!.textContent = b.querySelector('span span')!.textContent;
  drawer.querySelector('#ad-d-role')!.textContent = cells[2].textContent;
  drawer.querySelector('#ad-d-status')!.textContent = cells[3].textContent;
  drawer.querySelector('#ad-d-last')!.textContent = cells[4].textContent;
  drawer.showModal();
});
const close = () => { drawer.close(); opener?.focus(); };
drawer.querySelectorAll('[data-part="close"], [data-part="close-foot"]').forEach((b) => b.addEventListener('click', close));
drawer.addEventListener('click', (e) => { if (e.target === drawer) close(); });
