import { emit, on, type Cleanup } from '../../_shared/dom';

/**
 * Task list: native checkboxes in whole-row labels. Ticking one updates the "2 of 5 done" line and the
 * progress track, and emits lt-change { name, done, doneCount, total }. Set data-noun="habits" to change
 * the wording ("2 of 5 habits done").
 */
export function enhance(root: HTMLElement): Cleanup {
  const boxes = () => [...root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
  const count = root.querySelector<HTMLElement>('[data-part="count"]');
  const bar = root.querySelector<HTMLElement>('[data-part="track"] span');
  const sync = () => {
    const all = boxes(), done = all.filter((b) => b.checked).length;
    const noun = root.dataset.noun ? ` ${root.dataset.noun}` : '';
    if (count) count.textContent = all.length ? (done === all.length ? `All ${all.length}${noun} done` : `${done} of ${all.length}${noun} done`) : '';
    bar?.style.setProperty('--p', `${all.length ? (done / all.length) * 100 : 0}%`);
    return { doneCount: done, total: all.length };
  };
  sync();
  return on(root, 'change', (e) => {
    const box = e.target as HTMLInputElement;
    if (box.type !== 'checkbox') return;
    emit(root, { name: box.name, done: box.checked, ...sync() });
  });
}
