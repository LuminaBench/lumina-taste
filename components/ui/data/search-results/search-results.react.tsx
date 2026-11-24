import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './search-results.css';

export interface SearchHit { kind: string; title: string; meta: string; snippet: ReactNode; href: string }

/** Search results: count and query in the heading, kind filters, matched words highlighted with <mark>. */
export function SearchResults({ query, hits, className }: { query: string; hits: SearchHit[]; className?: string }) {
  return (
    <section className={cx('lt-results', className)} aria-label={`Results for ${query}`}>
      <header><h3>{hits.length} results for “{query}”</h3></header>
      <ol>{hits.map((h) => <li key={h.href}><a href={h.href}><span data-part="kind">{h.kind}</span><span data-part="main"><strong>{h.title}</strong><span>{h.meta}</span><span data-part="snippet">{h.snippet}</span></span></a></li>)}</ol>
    </section>
  );
}
