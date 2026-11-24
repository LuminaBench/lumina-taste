import type { CSSProperties } from 'react';
import { cx } from '../../_shared/react';
import './logo-marquee.css';

export interface LogoMarqueeProps { label?: string; lead?: string; logos: Array<{ name: string; style?: CSSProperties }>; className?: string }

/** Endless strip of customer wordmarks. Pauses on hover; a static wrapped row under reduced motion. */
export function LogoMarquee({ label = 'Customers', lead, logos, className }: LogoMarqueeProps) {
  const row = logos.map((l) => <li key={l.name} style={l.style}>{l.name}</li>);
  return (
    <section className={cx('lt-marquee', className)} aria-label={label}>
      {lead && <p data-part="lead">{lead}</p>}
      <div data-part="track">
        <ul data-part="row">{row}</ul>
        <ul data-part="row" aria-hidden>{row}</ul>
      </div>
    </section>
  );
}
