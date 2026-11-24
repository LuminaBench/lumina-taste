import { useId, type ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './navbar-mega';
import '../../controls/button/button.css';
import './navbar-mega.css';

export interface MegaLink { label: string; description: string; href: string; icon: IconName }
export interface NavbarMegaProps {
  brand: ReactNode; brandHref?: string; megaLabel: string; columns: Array<{ label: string; links: MegaLink[] }>;
  feature?: { eyebrow: string; title: string; body: string; href: string; cta: string };
  links: Array<{ label: string; href: string }>; signInHref?: string; cta?: { label: string; href: string }; className?: string;
}

export function NavbarMega({ brand, brandHref = '/', megaLabel, columns, feature, links, signInHref, cta, className }: NavbarMegaProps) {
  const id = useId();
  const ref = useEnhance<HTMLElement>(enhance);
  return (
    <header ref={ref} className={cx('lt-navbar', className)}>
      <div data-part="bar">
        <a data-part="brand" href={brandHref}>{brand}</a>
        <button type="button" data-part="burger" aria-expanded={false} aria-controls={`${id}l`} aria-label="Menu"><Icon name="menu" size={20} /></button>
        <nav id={`${id}l`} data-part="links" aria-label="Main">
          <ul>
            <li><button type="button" data-part="mega-trigger" aria-expanded={false} aria-controls={`${id}m`}>{megaLabel}<Icon name="chevron-down" size={14} /></button></li>
            {links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>
          <div data-part="actions">
            {signInHref && <a href={signInHref} data-part="signin">Sign in</a>}
            {cta && <a href={cta.href} className="lt-btn" data-variant="primary" data-size="sm"><span data-part="label">{cta.label}</span></a>}
          </div>
        </nav>
      </div>
      <div data-part="mega" id={`${id}m`} hidden>
        <div data-part="mega-inner">
          {columns.map((c) => (
            <ul data-part="mega-col" aria-label={c.label} key={c.label}>
              {c.links.map((l) => (
                <li key={l.href}><a href={l.href}><span data-part="mi"><Icon name={l.icon} size={18} /></span><span><strong>{l.label}</strong><small>{l.description}</small></span></a></li>
              ))}
            </ul>
          ))}
          {feature && (
            <a data-part="feature" href={feature.href}>
              <span className="lt-eyebrow">{feature.eyebrow}</span><strong>{feature.title}</strong><small>{feature.body}</small>
              <span data-part="feature-link">{feature.cta}<Icon name="arrow-right" size={14} /></span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
