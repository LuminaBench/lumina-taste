import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Message composer: Send is enabled only when there is text; Enter sends (Shift+Enter adds a line); the field
 * grows with what is typed (field-sizing, or a measured height where that is not supported). Where the browser
 * does not resize the page for the on-screen keyboard, --kb is set to the keyboard's height from the visual
 * viewport, so the bar rides above it. Emits lt-change with { text } on send and clears the field.
 */
export function enhance(root: HTMLElement): Cleanup {
  const field = root.querySelector<HTMLTextAreaElement>('textarea')!;
  const send = part<HTMLButtonElement>(root, 'send')!;
  const grow = () => { if (CSS.supports('field-sizing', 'content')) return; field.style.height = 'auto'; field.style.height = `${Math.min(field.scrollHeight, 140)}px`; };
  const sync = () => { send.disabled = !field.value.trim(); grow(); };
  const submit = () => {
    const text = field.value.trim();
    if (!text) return;
    emit(root, { text });
    field.value = '';
    sync();
    field.focus();
  };
  const vv = window.visualViewport;
  const onViewport = () => { if (!vv) return; const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); root.style.setProperty('--kb', `${Math.round(kb)}px`); };
  sync();
  return combine(
    on(field, 'input', sync),
    on(field, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); } }),
    on(root, 'submit', (e) => { e.preventDefault(); submit(); }),
    vv ? on(vv, 'resize', onViewport) : () => {},
  );
}
