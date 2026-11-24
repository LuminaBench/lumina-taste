import { $$, combine, emit, on, part, type Cleanup } from '../../_shared/dom';

const HEX = /^#?([0-9a-f]{6})$/i;

/** Preset swatches on native radios plus a hex field; the preview tag shows the result in context. */
export function enhance(root: HTMLElement): Cleanup {
  const radios = $$<HTMLInputElement>(root, 'input[type="radio"]');
  const field = root.querySelector<HTMLInputElement>('input[type="text"]')!;
  const msg = part(root, 'msg')!;
  const apply = (hex: string, from: 'swatch' | 'field') => {
    root.style.setProperty('--pick', hex);
    if (from === 'swatch') { field.value = hex; field.removeAttribute('aria-invalid'); msg.textContent = ''; }
    else radios.forEach((r) => (r.checked = r.value.toLowerCase() === hex.toLowerCase()));
    emit(root, { color: hex });
  };
  return combine(
    on(root, 'change', (e) => { const t = e.target as HTMLInputElement; if (t.type === 'radio') apply(t.value, 'swatch'); }),
    on(field, 'input', () => {
      const m = HEX.exec(field.value.trim());
      if (m) { field.removeAttribute('aria-invalid'); msg.textContent = ''; apply(`#${m[1].toLowerCase()}`, 'field'); }
    }),
    on(field, 'blur', () => {
      const ok = HEX.test(field.value.trim());
      if (ok) field.removeAttribute('aria-invalid');
      else field.setAttribute('aria-invalid', 'true');
      msg.textContent = ok ? '' : 'Use six hex digits, like #2f6fb0.';
    }),
  );
}
