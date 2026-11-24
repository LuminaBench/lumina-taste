import { cx } from '../../_shared/react';
import './how-it-works.css';

/** Three numbered steps on one connecting line (vertical on narrow screens). */
export function HowItWorks({ eyebrow, title, steps, className }: { eyebrow?: string; title: string; steps: Array<{ title: string; text: string }>; className?: string }) {
  return (
    <section className={cx('lt-how-it-works', className)} aria-label={title}>
      <header>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}</h2></header>
      <ol>{steps.map((s, i) => <li key={s.title}><span data-part="n">{i + 1}</span><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
    </section>
  );
}
