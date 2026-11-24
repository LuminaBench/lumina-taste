import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx } from '../../_shared/react';
import './feature-grid.css';

export interface Feature { icon: IconName; title: string; text: string }

/** Three-column feature list: icon, short title, one sentence each. */
export function FeatureGrid({ eyebrow, title, features, className }: { eyebrow?: string; title: string; features: Feature[]; className?: string }) {
  return (
    <section className={cx('lt-feature-grid', className)} aria-label={title}>
      <header>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}</h2></header>
      <ul>{features.map((f) => <li key={f.title}><span data-part="icon"><Icon name={f.icon} /></span><h3>{f.title}</h3><p>{f.text}</p></li>)}</ul>
    </section>
  );
}
