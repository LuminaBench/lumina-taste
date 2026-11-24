import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Comment thread: +1 toggles with counts, Reply opens an inline form, new comments append. Text is escaped. */
export function enhance(root: HTMLElement): Cleanup {
  const list = part(root, 'list')!;
  const form = part<HTMLFormElement>(root, 'new')!;
  const comment = (text: string) => `<article data-part="comment"><span data-part="avatar" aria-hidden="true">You</span><div><p data-part="head"><strong>You</strong><time>just now</time></p><p>${esc(text)}</p></div></article>`;
  return combine(
    on(root, 'click', (e) => {
      const t = e.target as Element;
      const r = t.closest<HTMLButtonElement>('[data-part="react"]');
      if (r) { const on = r.getAttribute('aria-pressed') !== 'true'; r.setAttribute('aria-pressed', String(on)); const n = r.querySelector('[data-part="n"]')!; n.textContent = String(+n.textContent! + (on ? 1 : -1)); return; }
      const rep = t.closest<HTMLButtonElement>('[data-part="reply"]');
      if (rep) {
        const host = rep.closest('li')!;
        let f = host.querySelector<HTMLFormElement>(':scope > [data-part="reply-form"]');
        if (!f) { host.insertAdjacentHTML('beforeend', '<form data-part="reply-form"><textarea rows="2" aria-label="Reply"></textarea><button type="submit" class="lt-btn" data-variant="primary" data-size="sm">Reply</button></form>'); f = host.querySelector<HTMLFormElement>(':scope > [data-part="reply-form"]')!; }
        f.querySelector('textarea')!.focus();
      }
    }),
    on(root, 'submit', (e) => {
      e.preventDefault();
      const f = e.target as HTMLFormElement;
      const ta = f.querySelector('textarea')!;
      const text = ta.value.trim();
      if (!text) return;
      if (f === form) list.insertAdjacentHTML('beforeend', `<li>${comment(text)}</li>`);
      else { const host = f.closest('li')!; let ul = host.querySelector<HTMLElement>(':scope > [data-part="replies"]'); if (!ul) { ul = document.createElement('ul'); ul.dataset.part = 'replies'; host.insertBefore(ul, f); } ul.insertAdjacentHTML('beforeend', `<li>${comment(text)}</li>`); f.remove(); }
      ta.value = '';
      emit(root, { text });
    }),
  );
}
