import { cx } from '../../_shared/react';
import './team-grid.css';

export interface Person { name: string; role: string; photo?: string }

/** Team grid: square photos (or initials), name and role. Pass `photo` URLs for real portraits. */
export function TeamGrid({ title, lede, people, className }: { title: string; lede?: string; people: Person[]; className?: string }) {
  return (
    <section className={cx('lt-team-grid', className)} aria-label={title}>
      <header><h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
      <ul>{people.map((p, i) => <li key={p.name}><span data-part="avatar" data-n={i % 4} aria-hidden>{p.photo ? <img src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : p.name.split(' ').map((w) => w[0]).join('')}</span><strong>{p.name}</strong><span>{p.role}</span></li>)}</ul>
    </section>
  );
}
