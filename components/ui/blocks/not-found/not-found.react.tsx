import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './not-found.css';

/** Error page: what happened in plain words, search, and a few ways out. */
export function NotFound({ code = '404', title, lede, links, onSearch, className }: { code?: string; title: string; lede: string; links: Array<{ label: string; href: string }>; onSearch?: (q: string) => void; className?: string }) {
  return (
    <section className={cx('lt-not-found', className)} aria-label={title}>
      <p data-part="code">{code}</p>
      <h2>{title}</h2>
      <p data-part="lede">{lede}</p>
      <form data-part="search" role="search" onSubmit={(e) => { e.preventDefault(); onSearch?.(new FormData(e.currentTarget).get('q') as string); }}><label htmlFor="lt-nf-q" className="lt-visually-hidden">Search</label><span><Icon name="search" /></span><input id="lt-nf-q" name="q" type="search" placeholder="Search" /></form>
      <ul data-part="links">{links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
    </section>
  );
}
