// The app shell shared by the app blueprints (app.css). Screens are <section class="as-screen" data-screen="id">;
// one is current. On a phone it is the only one shown (a push slides in, a tab cross-fades); from 768px a list
// screen shows its record beside it (data-detail on the list, data-parent on the record). ?screen=id opens one;
// ?state=loading|empty|error opens the first useful screen in that state. Links and buttons with data-go="id"
// change screen (data-dir="back" slides back); tab links point at #screen-id.
import { reducedMotion } from '../../components/ui/_shared/dom';

export interface AppShell { show: (id: string, dir?: 'forward' | 'back' | 'tab') => void; current: () => string; say: (text: string) => void }

export function appShell({ home, onShow }: { home: string; onShow?: (id: string) => void }): AppShell {
  const body = document.body;
  const screens = [...document.querySelectorAll<HTMLElement>('.as-screen')];
  const byId = (id: string) => screens.find((s) => s.dataset.screen === id);
  const wide = matchMedia('(min-width: 768px)');
  const toast = document.querySelector<HTMLElement>('.as-toast');
  let timer = 0;
  const say = (text: string) => { if (!toast) return; toast.textContent = text; clearTimeout(timer); timer = window.setTimeout(() => { toast.textContent = ''; }, 3200); };

  const params = new URLSearchParams(location.search);
  const q = params.get('screen') ?? '';
  let current = byId(q) ? q : params.get('state') && params.get('state') !== 'ready' ? home : screens[0].dataset.screen!;

  const mark = (id: string) => {
    const s = byId(id)!;
    const partner = s.dataset.pane === 'detail' ? s.dataset.parent : s.dataset.pane === 'list' ? s.dataset.detail : undefined;
    for (const x of screens) { x.toggleAttribute('data-current', x === s); x.toggleAttribute('data-shown', !!partner && x.dataset.screen === partner); x.inert = !(x === s || (wide.matches && x.dataset.screen === partner)); }
    body.dataset.pane = s.dataset.pane ?? 'list';
    body.dataset.screen = id;
    const tab = s.dataset.tab ?? byId(s.dataset.parent ?? '')?.dataset.tab;
    for (const a of document.querySelectorAll<HTMLAnchorElement>('.as-tabs a, .as-side a')) {
      const on = a.getAttribute('href') === `#screen-${tab}`;
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    onShow?.(id);
  };
  mark(current);

  function show(id: string, dir: 'forward' | 'back' | 'tab' = 'forward') {
    const s = byId(id);
    if (!s) return;
    current = id;
    const heading = s.querySelector<HTMLElement>('h1[tabindex="-1"], h2[tabindex="-1"]');
    const swap = () => { mark(id); s.querySelector('.as-scroll')?.scrollTo(0, 0); heading?.focus({ preventScroll: true }); };
    const vt = (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;
    if (!wide.matches && dir !== 'tab' && vt && !reducedMotion()) { document.documentElement.dataset.nav = dir; vt.call(document, swap); } else swap();
  }

  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    const tab = t.closest<HTMLAnchorElement>('.as-tabs a, .as-side a');
    if (tab) {
      e.preventDefault(); e.stopPropagation();
      const id = tab.getAttribute('href')!.replace('#screen-', '');
      if (id === current) byId(id)?.querySelector('.as-scroll')?.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
      else show(id, 'tab');
      return;
    }
    const go = t.closest<HTMLElement>('[data-go]');
    if (!go || e.defaultPrevented) return;
    e.preventDefault();
    show(go.dataset.go!, (go.dataset.dir as 'back') ?? 'forward');
  }, true);
  wide.addEventListener('change', () => mark(current));
  return { show, current: () => current, say };
}
