import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './breadcrumbs';
import './breadcrumbs.css';

/** The last item is the current page (no href). */
export function Breadcrumbs({ items, className }: { items: Array<{ label: string; href?: string }>; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, [items.length]);
  return (
    <nav ref={ref} className={cx('lt-crumbs', className)} aria-label="Breadcrumb">
      <ol>
        {items.map((it, i) => (
          <li key={i}>{i === items.length - 1 || !it.href ? <span aria-current="page">{it.label}</span> : <a href={it.href}>{it.label}</a>}</li>
        ))}
      </ol>
    </nav>
  );
}
