import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './feature-split.css';

export interface SplitRow { eyebrow?: string; title: string; text: string; points?: string[]; visual: ReactNode }

/** Alternating text-and-picture rows: the classic way to explain three features in depth. */
export function FeatureSplit({ label, rows, className }: { label: string; rows: SplitRow[]; className?: string }) {
  return (
    <section className={cx('lt-feature-split', className)} aria-label={label}>
      {rows.map((r, i) => (
        <article key={r.title} data-part="row" data-flip={i % 2 ? '' : undefined}>
          <div data-part="copy">{r.eyebrow && <p data-part="eyebrow">{r.eyebrow}</p>}<h3>{r.title}</h3><p>{r.text}</p>{r.points && <ul>{r.points.map((p) => <li key={p}><Icon name="check" />{p}</li>)}</ul>}</div>
          <div data-part="visual">{r.visual}</div>
        </article>
      ))}
    </section>
  );
}
