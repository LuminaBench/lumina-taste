import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './before-after.css';

/** "Before / with us" comparison: the old way muted, the new way outlined in the accent. */
export function BeforeAfter({ title, before, after, afterLabel = 'With us', className }: { title: string; before: string[]; after: string[]; afterLabel?: string; className?: string }) {
  return (
    <section className={cx('lt-before-after', className)} aria-label={title}>
      <header><h2>{title}</h2></header>
      <div data-part="cols">
        <div data-part="old"><h3>Before</h3><ul>{before.map((t) => <li key={t}><Icon name="x" />{t}</li>)}</ul></div>
        <div data-part="new"><h3>{afterLabel}</h3><ul>{after.map((t) => <li key={t}><Icon name="check" />{t}</li>)}</ul></div>
      </div>
    </section>
  );
}
