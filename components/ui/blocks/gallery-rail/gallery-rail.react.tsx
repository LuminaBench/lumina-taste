import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './gallery-rail';
import '../../data/art-panel/art-panel.css';
import './gallery-rail.css';

export interface RailItem { title: string; meta?: string; picture: ReactNode }

/** A row of pictures that runs off the edge and snaps as it scrolls sideways, with previous and next buttons. */
export function GalleryRail({ eyebrow, title, label, items, className }: { eyebrow?: string; title: string; label?: string; items: RailItem[]; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, [items.length]);
  return (
    <section ref={ref} className={cx('lt-gallery-rail', className)} aria-label={title}>
      <header>
        <div>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>
        <div data-part="nav"><button type="button" data-part="prev" aria-label="Previous"><Icon name="chevron-left" /></button><button type="button" data-part="next" aria-label="Next"><Icon name="chevron-right" /></button></div>
      </header>
      <ul data-part="track" tabIndex={0} aria-label={label ?? title}>
        {items.map((it) => <li key={it.title}>{it.picture}<p data-part="caption"><b>{it.title}</b>{it.meta && <span>{it.meta}</span>}</p></li>)}
      </ul>
    </section>
  );
}
