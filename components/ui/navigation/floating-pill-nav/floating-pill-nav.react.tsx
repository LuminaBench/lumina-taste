import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './floating-pill-nav';
import './floating-pill-nav.css';

export function FloatingPillNav({ links, current, cta, onNavigate, className }: { links: Array<{ label: string; href: string }>; current?: string; cta?: { label: string; href: string }; onNavigate?: (href: string) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, { href: string }>(enhance, (d) => onNavigate?.(d.href));
  return (
    <nav ref={ref} className={cx('lt-pillnav', className)} aria-label="Sections">
      <span data-part="hover" aria-hidden="true" />
      {links.map((l) => <a key={l.href} href={l.href} aria-current={l.href === current ? 'true' : undefined}>{l.label}</a>)}
      {cta && <a href={cta.href} data-part="cta">{cta.label}</a>}
    </nav>
  );
}
