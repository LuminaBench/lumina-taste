import type { Cleanup } from '../../_shared/dom';

const card = () => `<span data-part="card"><span data-half="top"><b></b></span><span data-half="bottom"><b></b></span><span data-half="flap-top"><b></b></span><span data-half="flap-bottom"><b></b></span></span>`;

function setCard(el: HTMLElement, next: string) {
  const [top, bottom, flapTop, flapBottom] = [...el.children].map((c) => c.firstElementChild as HTMLElement);
  const prev = el.dataset.v;
  if (prev === next) return;
  if (prev === undefined) {
    [top, bottom, flapTop, flapBottom].forEach((h) => (h.textContent = next));
    el.dataset.v = next;
    return;
  }
  top.textContent = next;        // revealed behind the falling flap
  bottom.textContent = prev;     // covered by the rising flap
  flapTop.textContent = prev;
  flapBottom.textContent = next;
  el.removeAttribute('data-flip');
  void el.offsetWidth;
  el.setAttribute('data-flip', '');
  el.dataset.v = next;
  const done = () => { bottom.textContent = next; };
  setTimeout(done, 400);
}

/** Split-flap countdown (data-countdown seconds) or clock. role="timer"; screen readers get a once-a-minute summary. */
export function enhance(root: HTMLElement): Cleanup {
  const end = Date.now() + +(root.dataset.countdown ?? 3600) * 1000;
  const groups = [...root.querySelectorAll<HTMLElement>('[data-part="digits"]')];
  groups.forEach((g) => (g.innerHTML = card() + card()));
  const sr = root.querySelector<HTMLElement>('[data-part="sr"]');
  let lastMinute = -1;
  const tick = () => {
    const left = Math.max(0, Math.round((end - Date.now()) / 1000));
    const parts = [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, '0'));
    groups.forEach((g, i) => [...g.children].forEach((c, j) => setCard(c as HTMLElement, parts[i][j])));
    const minute = Math.floor(left / 60);
    if (sr && minute !== lastMinute) { sr.textContent = `${parts[0]} hours ${parts[1]} minutes remaining`; lastMinute = minute; }
  };
  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}
