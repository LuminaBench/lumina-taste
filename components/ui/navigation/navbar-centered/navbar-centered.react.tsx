import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './navbar-centered.css';

/** Centred-logo header for brands and shops: category links left, logo centred, icons right. */
export function NavbarCentered({ brand, links, actions, variant, tone, className }: { brand: string; links: Array<{ label: string; href: string }>; actions?: ReactNode; variant?: 'masthead'; tone?: 'dark' | 'accent'; className?: string }) {
  return (
    <header className={cx('lt-nav-centered', className)} data-variant={variant} data-tone={tone}>
      <nav aria-label="Main"><ul>{links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul></nav>
      <a href="#home" data-part="brand">{brand}</a>
      <div data-part="actions">{actions}</div>
    </header>
  );
}
