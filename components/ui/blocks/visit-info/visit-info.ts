import type { Cleanup } from '../../_shared/dom';

/**
 * Visit info: marks today's row in the hours table and says, in words, whether the place is open now.
 * Rows carry data-day (1 = Monday … 7 = Sunday) and hours written "8:00 to 16:00" (or "Closed").
 * Uses the visitor's clock; set data-now="2026-11-28T10:30" to fix it (for previews and tests).
 */
export function enhance(root: HTMLElement): Cleanup {
  const now = root.dataset.now ? new Date(root.dataset.now) : new Date();
  const day = ((now.getDay() + 6) % 7) + 1;
  const row = root.querySelector<HTMLElement>(`tr[data-day="${day}"]`);
  const out = root.querySelector<HTMLElement>('[data-part="now"]');
  row?.setAttribute('data-today', '');
  const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
  const hours = row?.querySelector('td')?.textContent?.match(/(\d{1,2}(?::\d{2})?)\s*(?:to|–|-)\s*(\d{1,2}(?::\d{2})?)/);
  if (out) {
    const t = now.getHours() * 60 + now.getMinutes();
    if (hours && t >= mins(hours[1]) && t < mins(hours[2])) { out.textContent = `Open now, until ${hours[2]}`; out.setAttribute('data-open', ''); }
    else if (hours && t < mins(hours[1])) out.textContent = `Opens today at ${hours[1]}`;
    else out.textContent = 'Closed now';
  }
  return () => { row?.removeAttribute('data-today'); if (out) { out.textContent = ''; out.removeAttribute('data-open'); } };
}
