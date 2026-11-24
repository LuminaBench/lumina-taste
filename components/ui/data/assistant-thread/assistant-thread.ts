import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/**
 * Assistant conversation: Copy puts an answer on the clipboard, Retry and "Try again" emit
 * lt-change with { action: 'retry', turn }. Streaming is yours to drive: see streamInto().
 */
export function enhance(root: HTMLElement): Cleanup {
  const live = root.querySelector<HTMLElement>('[data-part="live"]');
  const say = (t: string) => { if (live) live.textContent = t; };
  let timer = 0;
  return combine(
    on(root, 'click', (e: MouseEvent) => {
      const b = (e.target as Element).closest<HTMLButtonElement>('button[data-action]');
      if (!b) return;
      const turn = b.closest<HTMLElement>('[data-role="assistant"]');
      const turns = [...root.querySelectorAll('[data-part="turns"] > li')];
      if (b.dataset.action === 'copy' && turn) {
        const text = turn.querySelector<HTMLElement>('[data-part="answer"]')?.innerText ?? '';
        void navigator.clipboard?.writeText(text).catch(() => {});
        const label = b.querySelector('span');
        if (label) { label.textContent = 'Copied'; clearTimeout(timer); timer = window.setTimeout(() => (label.textContent = 'Copy'), 1800); }
        say('Answer copied.');
      } else if (b.dataset.action === 'retry') {
        emit(root, { action: 'retry', turn: turn ? turns.indexOf(turn) : -1 });
      }
    }),
    () => clearTimeout(timer),
  );
}

/**
 * Stream text into an assistant turn, word by word, with the caret at the end. Returns a function
 * that stops it. Pass the <li data-role="assistant">; it is marked data-state="streaming" until done.
 */
export function streamInto(turn: HTMLElement, text: string, opts: { wordsPerSecond?: number; onDone?: () => void } = {}): () => void {
  const answer = turn.querySelector<HTMLElement>('[data-part="answer"]') ?? turn;
  const p = document.createElement('p');
  const caret = document.createElement('span');
  caret.dataset.part = 'caret'; caret.setAttribute('aria-hidden', 'true');
  answer.append(p);
  turn.dataset.state = 'streaming';
  const words = text.split(/(\s+)/);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0, id = 0;
  const finish = () => { clearInterval(id); p.textContent = text; delete turn.dataset.state; opts.onDone?.(); };
  if (reduced) { finish(); return () => {}; }
  id = window.setInterval(() => {
    i += 2;
    p.textContent = words.slice(0, i).join('');
    p.append(caret);
    if (i >= words.length) finish();
  }, 1000 / (opts.wordsPerSecond ?? 18));
  return () => { clearInterval(id); delete turn.dataset.state; caret.remove(); };
}
