// "Which one?" view: pairs people mix up, shown side by side with live thumbnails and one rule.
import { COMPARE } from './generated/registry';
import { esc } from './core';
import { byId, miniCard, mountPreviews } from './elements';

export function viewCompare(main: HTMLElement, id?: string) {
  main.innerHTML = `<section class="g-hero g-hero-sm"><p class="g-kicker">${COMPARE.pairs.length} comparisons</p><h1>Which one do I need?</h1><p class="g-sub">${esc(COMPARE.intro)}</p></section>
    <nav class="g-cmp-toc" aria-label="Comparisons">${COMPARE.pairs.map((p) => `<a href="#/compare/${p.id}"${p.id === id ? ' aria-current="true"' : ''}>${esc(p.title)}</a>`).join('')}</nav>
    ${COMPARE.pairs.map((p) => `<section class="g-cmp" id="cmp-${p.id}" aria-labelledby="cmp-${p.id}-t">
      <h2 id="cmp-${p.id}-t">${esc(p.title)}</h2>
      <p class="g-rule">${esc(p.rule)}</p>
      <div class="g-cmp-row" data-n="${p.ids.length}">${p.ids.map((x) => { const c = byId(x); return c ? miniCard(c, p.use[x]) : ''; }).join('')}</div>
    </section>`).join('')}`;
  mountPreviews(main);
  if (id) requestAnimationFrame(() => main.querySelector(`#cmp-${CSS.escape(id)}`)?.scrollIntoView({ block: 'start' }));
}
