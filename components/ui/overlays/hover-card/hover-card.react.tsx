import { useId, type ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './hover-card';
import '../../feedback/status-dot/status-dot.css';
import './hover-card.css';

/** Preview card for a link. The card supplements the link; everything in it must also be reachable on the target page. */
export function HoverCard({ href, label, children, className }: { href: string; label: ReactNode; children: ReactNode; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLSpanElement>(enhance);
  return (
    <span ref={ref} className="lt-hovercard-demo">
      <a href={href} data-part="anchor" aria-describedby={id}>{label}</a>
      <span className={cx('lt-hovercard', className)} id={id} popover="manual" role="tooltip">{children}</span>
    </span>
  );
}
