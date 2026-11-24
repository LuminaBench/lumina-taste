import { $$, combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Prompt composer: a textarea that grows to eight lines, a send button enabled only with text,
 * ⌘/Ctrl+Enter to send (plain Enter makes a new line), a mode switch and a character count.
 */
export function enhance(root: HTMLElement): Cleanup {
  const form = root as HTMLFormElement;
  const ta = root.querySelector<HTMLTextAreaElement>('textarea')!;
  const send = part<HTMLButtonElement>(root, 'send')!;
  const count = part(root, 'count');
  const sent = part(root, 'sent');
  const modes = $$<HTMLButtonElement>(root, '[data-part="mode"] [role="radio"]');
  const max = ta.maxLength > 0 ? ta.maxLength : Infinity;
  const grow = () => {
    // field-sizing: content handles this where supported; this is the fallback.
    if (CSS.supports?.('field-sizing', 'content')) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  };
  const sync = () => {
    send.disabled = ta.value.trim().length === 0;
    if (count) { count.textContent = `${ta.value.length} / ${max}`; count.toggleAttribute('data-near', ta.value.length > max * 0.9); }
    grow();
  };
  const submit = () => {
    const text = ta.value.trim();
    if (!text) return;
    const mode = modes.find((m) => m.getAttribute('aria-checked') === 'true')?.textContent ?? '';
    emit(root, { text, mode });
    if (sent) sent.textContent = `Sent: “${text.length > 60 ? text.slice(0, 60) + '…' : text}”`;
    ta.value = '';
    sync();
    ta.focus();
  };
  sync();
  return combine(
    on(ta, 'input', sync),
    on(ta, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }),
    on(form, 'submit', (e) => { e.preventDefault(); submit(); }),
    ...modes.map((m) => on(m, 'click', () => modes.forEach((x) => { const on = x === m; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; }))),
    on(part(root, 'mode')!, 'keydown', (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = modes.findIndex((m) => m.getAttribute('aria-checked') === 'true');
      const next = modes[(i + 1) % modes.length];
      next.click(); next.focus();
    }),
  );
}
