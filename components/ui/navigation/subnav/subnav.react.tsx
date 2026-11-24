import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './subnav.css';

/** Page header with a breadcrumb, title, actions and underline section links (real links, not tabs). */
export function Subnav({ crumb, title, actions, links, className }: { crumb?: { label: string; href: string }; title: string; actions?: ReactNode; links: Array<{ label: string; href: string; count?: number; current?: boolean }>; className?: string }) {
  return (
    <div className={cx('lt-subnav', className)}>
      <div data-part="head"><div>{crumb && <p data-part="crumb"><a href={crumb.href}>{crumb.label}</a> / </p>}<h2>{title}</h2></div>{actions && <div data-part="actions">{actions}</div>}</div>
      <nav aria-label={`${title} sections`}><ul>{links.map((l) => <li key={l.href}><a href={l.href} aria-current={l.current ? 'page' : undefined}>{l.label}{l.count != null && <span>{l.count}</span>}</a></li>)}</ul></nav>
    </div>
  );
}
