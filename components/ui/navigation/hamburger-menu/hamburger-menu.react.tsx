import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './hamburger-menu';
import './hamburger-menu.css';

export interface HamburgerMenuProps { brand: string; links: Array<{ label: string; href: string; current?: boolean }>; cta?: { label: string; href: string }; secondary?: { label: string; href: string }; className?: string }

/** Mobile header with a morphing hamburger that opens a full-height menu below the bar. */
export function HamburgerMenu({ brand, links, cta, secondary, className }: HamburgerMenuProps) {
  const ref = useEnhance<HTMLDivElement>(enhance);
  return (
    <div ref={ref} className={cx('lt-burger-demo', className)}>
      <header data-part="bar"><a href="#home" data-part="brand">{brand}</a><button type="button" data-part="toggle" aria-expanded="false" aria-label="Menu"><span data-part="lines" aria-hidden><i /><i /><i /></span></button></header>
      <nav data-part="panel" aria-label="Main" hidden>
        <ul>{links.map((l) => <li key={l.href}><a href={l.href} aria-current={l.current ? 'page' : undefined}>{l.label}</a></li>)}</ul>
        {(cta || secondary) && <div data-part="cta">{secondary && <a className="lt-btn" data-variant="secondary" href={secondary.href}>{secondary.label}</a>}{cta && <a className="lt-btn" data-variant="primary" href={cta.href}>{cta.label}</a>}</div>}
      </nav>
    </div>
  );
}
