import { $$, combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Kanban board. Mouse: native drag and drop between columns. Keyboard: Space lifts a card,
 * arrows move it (Left/Right between columns, Up/Down within one), Space drops, Esc cancels.
 * Every move is announced.
 */
export function enhance(root: HTMLElement): Cleanup {
  const live = part(root, 'live')!;
  const columns = () => $$<HTMLElement>(root, '[data-part="column"]');
  const listOf = (col: HTMLElement) => part(col, 'cards')!;
  const nameOf = (col: HTMLElement) => col.querySelector('h4')?.textContent ?? '';
  const titleOf = (card: HTMLElement) => part(card, 'title')?.textContent ?? '';
  const counts = () => columns().forEach((c) => { part(c, 'n')!.textContent = String(listOf(c).children.length); });
  const say = (msg: string) => { live.textContent = ''; requestAnimationFrame(() => (live.textContent = msg)); };
  const where = (card: HTMLElement) => { const col = card.closest<HTMLElement>('[data-part="column"]')!; const list = [...listOf(col).children]; return `${nameOf(col)}, position ${list.indexOf(card) + 1} of ${list.length}`; };
  const focusCard = (card: HTMLElement) => { $$<HTMLElement>(root, '[data-part="card"]').forEach((c) => (c.tabIndex = c === card ? 0 : -1)); card.focus(); };

  let lifted: HTMLElement | null = null;
  let moving = false; // moving a focused node blurs it; that is not the user leaving the board
  let origin: { list: Element; next: Element | null } | null = null;
  const drop = (cancel = false) => {
    if (!lifted) return;
    const card = lifted;
    if (cancel && origin) origin.list.insertBefore(card, origin.next);
    card.removeAttribute('data-lifted');
    lifted = null; origin = null;
    counts();
    focusCard(card);
    say(cancel ? `Cancelled. ${titleOf(card)} returned to ${where(card)}.` : `Dropped ${titleOf(card)} in ${where(card)}.`);
    if (!cancel) emit(root, { card: titleOf(card), column: card.closest<HTMLElement>('[data-part="column"]')?.dataset.col });
  };
  const onKey = (e: KeyboardEvent) => {
    const card = (e.target as Element).closest<HTMLElement>('[data-part="card"]');
    if (!card) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (lifted) return drop();
      lifted = card; origin = { list: card.parentElement!, next: card.nextElementSibling };
      card.setAttribute('data-lifted', '');
      return say(`Picked up ${titleOf(card)}. ${where(card)}. Arrows move, Space drops, Escape cancels.`);
    }
    if (e.key === 'Escape' && lifted) { e.preventDefault(); return drop(true); }
    const cols = columns();
    const col = card.closest<HTMLElement>('[data-part="column"]')!;
    const ci = cols.indexOf(col);
    const siblings = [...listOf(col).children] as HTMLElement[];
    const i = siblings.indexOf(card);
    if (!lifted) {
      // Plain navigation between cards.
      let target: HTMLElement | undefined;
      if (e.key === 'ArrowDown') target = siblings[i + 1];
      if (e.key === 'ArrowUp') target = siblings[i - 1];
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const other = cols[ci + (e.key === 'ArrowRight' ? 1 : -1)]; if (other) { const l = [...listOf(other).children] as HTMLElement[]; target = l[Math.min(i, l.length - 1)]; } }
      if (target) { e.preventDefault(); focusCard(target); }
      return;
    }
    e.preventDefault();
    const move = () => {
      if (e.key === 'ArrowDown' && siblings[i + 1]) { siblings[i + 1].after(card); return true; }
      if (e.key === 'ArrowUp' && siblings[i - 1]) { siblings[i - 1].before(card); return true; }
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return false;
      const other = cols[ci + (e.key === 'ArrowRight' ? 1 : -1)];
      if (!other) return false;
      const l = listOf(other);
      l.insertBefore(card, l.children[Math.min(i, l.children.length)] ?? null);
      return true;
    };
    moving = true;
    const moved = move();
    card.focus();
    moving = false;
    if (!moved) return;
    counts();
    say(`${titleOf(card)}: ${where(card)}.`);
  };

  // Mouse drag and drop.
  let dragged: HTMLElement | null = null;
  const after = (list: HTMLElement, y: number) => ([...list.children] as HTMLElement[]).filter((c) => c !== dragged).find((c) => { const b = c.getBoundingClientRect(); return y < b.top + b.height / 2; }) ?? null;
  return combine(
    on(root, 'keydown', onKey),
    on(root, 'dragstart', (e: DragEvent) => { dragged = (e.target as Element).closest<HTMLElement>('[data-part="card"]'); if (!dragged) return; dragged.setAttribute('data-dragging', ''); e.dataTransfer?.setData('text/plain', titleOf(dragged)); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }),
    on(root, 'dragover', (e: DragEvent) => {
      const col = (e.target as Element).closest<HTMLElement>('[data-part="column"]');
      if (!dragged || !col) return;
      e.preventDefault();
      columns().forEach((c) => c.toggleAttribute('data-over', c === col));
      const list = listOf(col);
      const ref = after(list, e.clientY);
      if (ref !== dragged.nextElementSibling || dragged.parentElement !== list) list.insertBefore(dragged, ref);
    }),
    on(root, 'dragend', () => {
      if (!dragged) return;
      dragged.removeAttribute('data-dragging');
      columns().forEach((c) => c.removeAttribute('data-over'));
      counts();
      say(`Moved ${titleOf(dragged)} to ${where(dragged)}.`);
      emit(root, { card: titleOf(dragged), column: dragged.closest<HTMLElement>('[data-part="column"]')?.dataset.col });
      dragged = null;
    }),
    on(root, 'drop', (e) => e.preventDefault()),
    on(root, 'focusout', (e: FocusEvent) => { if (lifted && !moving && e.relatedTarget && !root.contains(e.relatedTarget as Node)) drop(true); }),
  );
}
