import type { ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './side-scroll';
import './side-scroll.css';

export interface SideScrollItem { visual: ReactNode; name: string; fact?: string }

/** A row of work that slides sideways while the page scrolls down (pinned); a native swipe row on phones. */
export function SideScroll({ title, lede, items, label = 'Work, scroll sideways', className }: { title: string; lede?: string; items: SideScrollItem[]; label?: string; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, [items.length]);
  return (
    <section ref={ref} className={cx('lt-side-scroll', className)} aria-label={title}>
      <div data-part="pin">
        <header><h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
        <ul data-part="track" tabIndex={0} aria-label={label}>
          {items.map((it) => <li key={it.name}>{it.visual}<p data-part="caption"><b>{it.name}</b>{it.fact && <span>{it.fact}</span>}</p></li>)}
        </ul>
        <div data-part="progress" aria-hidden="true"><span /></div>
      </div>
    </section>
  );
}
