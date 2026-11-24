import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './blog-grid.css';

export interface Post { kind: string; title: string; href: string; date: string; read: string; image?: string }

/** Latest posts: three cards, whole card clickable via the title link. */
export function BlogGrid({ title = 'From the blog', allHref = '#blog', posts, className }: { title?: string; allHref?: string; posts: Post[]; className?: string }) {
  return (
    <section className={cx('lt-blog-grid', className)} aria-label={title}>
      <header><h2>{title}</h2><a href={allHref} data-part="all">All posts <Icon name="arrow-right" /></a></header>
      <ul>{posts.map((p, i) => <li key={p.href}><article><div data-part="art" data-n={i % 3} aria-hidden>{p.image && <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />}</div><p data-part="meta"><span>{p.kind}</span><time>{p.date}</time></p><h3><a href={p.href}>{p.title}</a></h3><p data-part="read">{p.read} read</p></article></li>)}</ul>
    </section>
  );
}
