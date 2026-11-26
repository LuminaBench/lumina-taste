import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import '../../data/art-panel/art-panel.css';
import './photo-collage.css';

/**
 * Three to five photographs of one place or one day at different sizes, close together: the room, the detail and
 * the hands at work at once. The first tile leads. Pass <img> (or an ArtPanel until there are photographs) as tiles.
 */
export function PhotoCollage({ title, lede, tiles, caption, tone, className }: { title: string; lede?: string; tiles: ReactNode[]; caption?: string; tone?: 'well'; className?: string }) {
  return (
    <section className={cx('lt-photo-collage', className)} data-tone={tone} aria-label={title}>
      <header><h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
      <ul data-part="tiles">{tiles.slice(0, 5).map((t, i) => <li key={i}><figure data-part="tile">{t}</figure></li>)}</ul>
      {caption && <p data-part="caption">{caption}</p>}
    </section>
  );
}
