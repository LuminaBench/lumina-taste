import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './flyout-menu';
import './flyout-menu.css';

export interface FlyoutItem { icon: IconName; label: string; description: string; href: string }
export interface FlyoutGroup { label: string; items: FlyoutItem[]; footer?: Array<{ icon: IconName; label: string; href: string }> }

/** Navbar with click-to-open flyout menus (icon, title, description) and a footer row of quick links. */
export function FlyoutMenu({ brand, groups, links = [], cta, className }: { brand: string; groups: FlyoutGroup[]; links?: Array<{ label: string; href: string }>; cta?: { label: string; href: string }; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance);
  return (
    <header ref={ref} className={cx('lt-flyout', className)}>
      <a href="#home" data-part="brand">{brand}</a>
      <nav aria-label="Main"><ul data-part="top">
        {groups.map((g, gi) => (
          <li key={g.label}>
            <button type="button" data-part="trigger" aria-expanded="false" aria-controls={`fo-${gi}`}>{g.label} <Icon name="chevron-down" /></button>
            <div id={`fo-${gi}`} data-part="flyout" hidden>
              <ul role="menu">{g.items.map((it) => <li key={it.href} role="none"><a href={it.href} role="menuitem"><span data-part="ic"><Icon name={it.icon} /></span><span><strong>{it.label}</strong><span>{it.description}</span></span></a></li>)}</ul>
              {g.footer && <div data-part="foot">{g.footer.map((f) => <a key={f.href} href={f.href}><Icon name={f.icon} />{f.label}</a>)}</div>}
            </div>
          </li>
        ))}
        {links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
      </ul></nav>
      {cta && <a className="lt-btn" data-variant="primary" data-size="sm" href={cta.href}>{cta.label}</a>}
    </header>
  );
}
