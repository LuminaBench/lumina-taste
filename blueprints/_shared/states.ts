// Page states for blueprints. Every block marked data-view="loading" (or empty, error, incident,
// sold-out…) is hidden until the page is in that state; data-view="ready" blocks show otherwise.
// Open a blueprint with ?state=empty to see it, and buttons with data-set-state switch live.
export function pageStates(): () => void {
  const apply = (state: string) => {
    document.documentElement.dataset.pageState = state;
    for (const el of document.querySelectorAll<HTMLElement>('[data-view]')) {
      const views = el.dataset.view!.split(' ');
      el.hidden = !views.includes(state);
    }
  };
  const fromUrl = new URLSearchParams(location.search).get('state');
  apply(fromUrl && /^[a-z-]+$/.test(fromUrl) ? fromUrl : 'ready');
  const onClick = (e: Event) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-set-state]');
    if (b) apply(b.dataset.setState!);
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
