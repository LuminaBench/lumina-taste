// The app shell shared by the app blueprints (app.css). Screens are <section class="as-screen" data-screen="id">;
// one is current. On a phone it is the only one shown: a push slides the new screen in from the trailing edge
// while the old one drifts back under it, back reverses that, and a tab cross-fades. From 768px a list screen
// shows its record beside it (data-detail on the list, data-parent on the record) and changes cross-fade.
// ?screen=id opens one; ?state=loading|empty|error opens the first useful screen in that state. Links and
// buttons with data-go="id" change screen (data-dir="back" goes back); tab links point at #screen-id.
//
// Focus follows the person: a pushed screen focuses its title; going back puts focus on the row or button that
// opened the screen, and the list is where it was left (each screen keeps its own scroll). Under reduced motion
// every change is instant.
import { reducedMotion } from '../../components/ui/_shared/dom';

export type Nav = 'forward' | 'back' | 'tab';
export interface AppShell { show: (id: string, dir?: Nav, from?: HTMLElement | null) => void; current: () => string; say: (text: string) => void }
type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

export function appShell({ home, onShow }: { home: string; onShow?: (id: string) => void }): AppShell {
  const body = document.body;
  const html = document.documentElement;
  const screens = [...document.querySelectorAll<HTMLElement>('.as-screen')];
  const byId = (id: string) => screens.find((s) => s.dataset.screen === id);
  const scrollerOf = (id: string) => byId(id)?.querySelector<HTMLElement>('.as-scroll') ?? null;
  const wide = matchMedia('(min-width: 768px)');
  const toast = document.querySelector<HTMLElement>('.as-toast');
  let timer = 0;
  const say = (text: string) => { if (!toast) return; toast.textContent = text; clearTimeout(timer); timer = window.setTimeout(() => { toast.textContent = ''; }, 3200); };

  const params = new URLSearchParams(location.search);
  const q = params.get('screen') ?? '';
  let current = byId(q) ? q : params.get('state') && params.get('state') !== 'ready' ? home : screens[0].dataset.screen!;
  // Where each screen was scrolled to, and what opened the screen above it: a hidden screen loses both otherwise.
  const scrolled = new Map<string, number>();
  const openers = new Map<string, HTMLElement>();

  const mark = (id: string) => {
    const s = byId(id)!;
    const partner = s.dataset.pane === 'detail' ? s.dataset.parent : s.dataset.pane === 'list' ? s.dataset.detail : undefined;
    for (const x of screens) {
      const on = x === s || (wide.matches && !!partner && x.dataset.screen === partner);
      const sc = x.querySelector<HTMLElement>('.as-scroll');
      if (sc && !on && x.getClientRects().length) scrolled.set(x.dataset.screen!, sc.scrollTop);
      x.toggleAttribute('data-current', x === s);
      x.toggleAttribute('data-shown', !!partner && x.dataset.screen === partner);
      x.inert = !on;
    }
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

  /** Run a change of screen as a view transition named by its direction (app.css), or at once. */
  const transition = (nav: string, swap: () => void) => {
    const doc = document as VTDoc;
    if (!doc.startViewTransition || reducedMotion() || html.dataset.motion === 'reduced') { swap(); return; }
    html.dataset.nav = nav;
    doc.startViewTransition(swap).finished.catch(() => {}).finally(() => { if (html.dataset.nav === nav) delete html.dataset.nav; });
  };

  function show(id: string, dir: Nav = 'forward', from: HTMLElement | null = null) {
    const s = byId(id);
    if (!s || id === current) return;
    if (dir === 'forward') { const f = from ?? (document.activeElement as HTMLElement | null); if (f && f !== document.body) openers.set(current, f); }
    current = id;
    const heading = s.querySelector<HTMLElement>('h1[tabindex="-1"], h2[tabindex="-1"]');
    const swap = () => {
      mark(id);
      const sc = scrollerOf(id);
      // A pushed screen starts at its top; going back, or to another tab, finds the list where it was left.
      if (sc) sc.scrollTop = dir === 'forward' ? 0 : scrolled.get(id) ?? 0;
      const back = dir === 'back' ? openers.get(id) : undefined;
      openers.delete(id);
      const target = back && back.isConnected && s.contains(back) && back.getClientRects().length ? back : heading;
      target?.focus({ preventScroll: true });
    };
    // Two panes: the list stays put and the record beside it changes, so a short cross-fade, never a slide.
    transition(wide.matches ? 'pane' : dir, swap);
  }

  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    const tab = t.closest<HTMLAnchorElement>('.as-tabs a, .as-side a');
    if (tab) {
      e.preventDefault(); e.stopPropagation();
      const id = tab.getAttribute('href')!.replace('#screen-', '');
      // The current tab again: back to the top of its list. From a record pushed over that list: back to the list.
      if (id === current) scrollerOf(id)?.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
      else show(id, byId(current)?.dataset.parent === id ? 'back' : 'tab');
    }
  }, true);
  // Links and buttons that open another screen. Bubble phase, so a swipe or a pull that ended on a row wins
  // (swipe-row and pull-refresh swallow that click before it gets here).
  document.addEventListener('click', (e) => {
    const go = (e.target as Element).closest<HTMLElement>('[data-go]');
    if (!go || e.defaultPrevented) return;
    e.preventDefault();
    show(go.dataset.go!, (go.dataset.dir as Nav) ?? 'forward', go);
  });
  wide.addEventListener('change', () => mark(current));
  return { show, current: () => current, say };
}
