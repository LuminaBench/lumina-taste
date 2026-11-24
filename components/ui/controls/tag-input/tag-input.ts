import { combine, emit, on, type Cleanup } from '../../_shared/dom';

const xIcon = '<svg class="lt-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

/** Chip input with +n overflow. Tags collapse to data-max-visible while the field is not focused. */
export function enhance(root: HTMLElement): Cleanup {
  const list = root.querySelector<HTMLElement>('[data-part="list"]')!;
  const input = root.querySelector<HTMLInputElement>('input')!;
  const more = root.querySelector<HTMLElement>('[data-part="more"]')!;
  const live = root.querySelector<HTMLElement>('[data-part="live"]');
  const max = +(root.dataset.maxVisible ?? Infinity);
  const tags = () => [...list.querySelectorAll<HTMLElement>('[data-part="tag"]')];
  const values = () => tags().map((t) => t.querySelector('span')!.textContent!);
  const layout = () => {
    const focused = root.contains(document.activeElement);
    const all = tags();
    all.forEach((t, i) => t.toggleAttribute('data-hidden', !focused && i >= max));
    const hidden = focused ? 0 : Math.max(0, all.length - max);
    more.textContent = hidden ? `+${hidden}` : '';
  };
  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, '');
    if (!v || values().includes(v)) return;
    const li = document.createElement('li');
    li.dataset.part = 'tag';
    li.innerHTML = `<span></span><button type="button">${xIcon}</button>`;
    li.querySelector('span')!.textContent = v;
    li.querySelector('button')!.setAttribute('aria-label', `Remove ${v}`);
    list.append(li);
    if (live) live.textContent = `Added ${v}`;
    emit(root, { values: values() });
  };
  const remove = (li: HTMLElement) => {
    const v = li.querySelector('span')!.textContent;
    li.remove();
    if (live) live.textContent = `Removed ${v}`;
    emit(root, { values: values() });
    layout();
  };
  layout();
  return combine(
    on(input, 'keydown', (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) { e.preventDefault(); add(input.value); input.value = ''; }
      else if (e.key === 'Backspace' && !input.value && tags().length) remove(tags().at(-1)!);
    }),
    on(input, 'blur', () => { if (input.value.trim()) { add(input.value); input.value = ''; } }),
    on(root, 'click', (e: MouseEvent) => {
      const btn = (e.target as Element).closest('[data-part="tag"] button');
      if (btn) { remove(btn.closest<HTMLElement>('[data-part="tag"]')!); input.focus(); }
      else if ((e.target as Element).closest('[data-part="box"]')) input.focus();
    }),
    on(root, 'focusin', layout),
    on(root, 'focusout', () => requestAnimationFrame(layout)),
  );
}
