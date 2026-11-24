import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './article-layout.css';

/** Reading layout: one 68ch column and a sticky "On this page" list. Pair with scrollspy-toc for highlighting. */
export function ArticleLayout({ eyebrow, title, lede, toc, children, className }: { eyebrow?: string; title: string; lede?: string; toc: Array<{ id: string; label: string }>; children: ReactNode; className?: string }) {
  return (
    <section className={cx('lt-article-layout', className)} aria-label={title}>
      <article>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}{children}</article>
      <aside aria-label="On this page"><p>On this page</p><ul>{toc.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.label}</a></li>)}</ul></aside>
    </section>
  );
}
