import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './navbar-simple';
import './navbar-simple.css';

export interface NavLink { label: string; href: string; current?: boolean }

/** The plain, correct navbar: brand, four links, sign in and one primary action. Collapses to a menu. variant="pill" floats it as a centred rounded bar. */
export function NavbarSimple({ brand, links, signIn, cta, variant = 'bar', className }: { brand: string; links: NavLink[]; signIn?: NavLink; cta?: NavLink; variant?: 'bar' | 'pill'; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance);
  const items = links.map((l) => <li key={l.href}><a href={l.href} aria-current={l.current ? 'page' : undefined}>{l.label}</a></li>);
  return (
    <header ref={ref} className={cx('lt-nav-simple', className)} data-variant={variant === 'pill' ? 'pill' : undefined}>
      <a href="#home" data-part="brand"><span data-part="mark" aria-hidden />{brand}</a>
      <nav aria-label="Main"><ul data-part="links">{items}</ul></nav>
      <div data-part="actions">{signIn && <a href={signIn.href} data-part="signin">{signIn.label}</a>}{cta && <a className="lt-btn" data-variant="primary" data-size="sm" href={cta.href}>{cta.label}</a>}</div>
      <button type="button" data-part="toggle" aria-expanded="false" aria-label="Menu"><Icon name="menu" size={20} /></button>
      <div data-part="panel" hidden><ul>{items}</ul>{signIn && <a href={signIn.href}>{signIn.label}</a>}</div>
    </header>
  );
}
