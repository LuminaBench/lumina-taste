import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './site-footer.css';

/** Balanced footer: 3–5 columns of equal length work best. One legal line, nothing else. */
export function SiteFooter({ brand, blurb, columns, legal, className }: { brand: ReactNode; blurb: string; columns: Array<{ title: string; links: Array<{ label: string; href: string }> }>; legal: ReactNode[]; className?: string }) {
  return (
    <footer className={cx('lt-footer', className)}>
      <div data-part="top">
        <div data-part="about"><a data-part="brand" href="/">{brand}</a><p>{blurb}</p></div>
        <nav data-part="cols" aria-label="Footer">
          {columns.map((c) => (
            <div key={c.title}><h2>{c.title}</h2><ul>{c.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul></div>
          ))}
        </nav>
      </div>
      <div data-part="legal">{legal.map((l, i) => <span key={i}>{l}</span>)}</div>
    </footer>
  );
}
