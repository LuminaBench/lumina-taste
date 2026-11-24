import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './logo-cloud.css';

/** A static row of customer logos (monochrome). For motion use logo-marquee instead. */
export function LogoCloud({ lead, logos, className }: { lead: string; logos: Array<{ name: string; logo?: ReactNode }>; className?: string }) {
  return (
    <section className={cx('lt-logo-cloud', className)} aria-label={lead}>
      <h2 data-part="eyebrow">{lead}</h2>
      <ul>{logos.map((l) => <li key={l.name}>{l.logo ?? l.name}</li>)}</ul>
    </section>
  );
}
