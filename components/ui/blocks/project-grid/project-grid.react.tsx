import { cx } from '../../_shared/react';
import './project-grid.css';

export interface Project { title: string; meta: string; year?: string; href: string; image?: string; kind?: string }

/** Portfolio work grid: large plates with the project name, type and year. Pass image for a photo. */
export function ProjectGrid({ title, eyebrow, projects, cols = 2, className }: { title: string; eyebrow?: string; projects: Project[]; cols?: 2 | 3; className?: string }) {
  return (
    <section className={cx('lt-project-grid', className)} aria-label={title} data-cols={cols}>
      <header>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}</h2></header>
      <ul>{projects.map((p, i) => (
        <li key={p.href}><a href={p.href}>
          <div data-part="media" aria-hidden>{p.image ? <img src={p.image} alt="" /> : <><b>{String(i + 1).padStart(2, '0')}</b>{p.kind && <span>{p.kind}</span>}</>}</div>
          <div data-part="meta"><h3>{p.title}</h3><p>{p.meta}</p>{p.year && <time>{p.year}</time>}</div>
        </a></li>))}</ul>
    </section>
  );
}
