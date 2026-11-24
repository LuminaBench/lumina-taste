import { $$, combine, emit, on, openDialog, part, type Cleanup } from '../../_shared/dom';

/**
 * Lightbox: thumbnails open a dialog with the photo, caption and count. Arrows (or the buttons)
 * step through; closing returns focus to the thumbnail of the photo last shown.
 */
export function enhance(root: HTMLElement): Cleanup {
  const photos = (root.dataset.photos ?? '').split('|').map((p) => { const [title, alt] = p.split('~'); return { title, alt }; });
  const dialog = part<HTMLDialogElement>(root, 'viewer')!;
  const ph = dialog.querySelector<HTMLElement>('[data-part="ph"]')!;
  const caption = part(dialog, 'caption')!, count = part(dialog, 'count')!;
  const thumbs = $$<HTMLButtonElement>(root, '[data-part="thumb"]');
  let i = 0, closeDialog: Cleanup | null = null;
  const show = (n: number) => {
    i = (n + photos.length) % photos.length;
    ph.dataset.n = String(i);
    ph.setAttribute('aria-label', photos[i].alt);
    caption.textContent = photos[i].title;
    count.textContent = `${i + 1} / ${photos.length}`;
    emit(root, { index: i });
  };
  const open = (n: number) => { show(n); closeDialog = openDialog(dialog); };
  return combine(
    ...thumbs.map((t) => on(t, 'click', () => open(+t.dataset.i!))),
    on(part(dialog, 'prev')!, 'click', () => show(i - 1)),
    on(part(dialog, 'next')!, 'click', () => show(i + 1)),
    on(part(dialog, 'close')!, 'click', () => dialog.close()),
    on(dialog, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
    }),
    on(dialog, 'close', () => { closeDialog?.(); closeDialog = null; thumbs[i]?.focus(); }),
    () => closeDialog?.(),
  );
}
