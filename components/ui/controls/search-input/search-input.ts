import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/** Search field with clear button and a global ⌘/Ctrl + key (data-shortcut) or "/" focus shortcut. */
export function enhance(root: HTMLElement): Cleanup {
  const input = root.querySelector<HTMLInputElement>('input')!;
  const clear = root.querySelector<HTMLButtonElement>('[data-part="clear"]');
  const mod = root.querySelector<HTMLElement>('[data-part="mod"]');
  const key = (root.dataset.shortcut ?? 'k').toLowerCase();
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (mod && !mac) mod.textContent = 'Ctrl ';
  const sync = () => { if (clear) clear.hidden = !input.value; };
  return combine(
    on(input, 'input', () => { sync(); emit(root, { value: input.value }); }),
    on(input, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; sync(); emit(root, { value: '' }); } }),
    clear ? on(clear, 'click', () => { input.value = ''; sync(); input.focus(); emit(root, { value: '' }); }) : () => {},
    on(document, 'keydown', (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key) { e.preventDefault(); input.focus(); input.select(); }
    }),
  );
}
