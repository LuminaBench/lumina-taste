import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './art-panel.css';

/**
 * Stands in for a photograph until there is one: the thing's name set large on a tinted panel.
 * Pass children (an <img>) and the photo takes over. shot is the brief for the photographer.
 */
export function ArtPanel({ name, fact, index, label, shot, tone, ratio = '4/5', backdrop, className, children }: { name: string; fact?: string; index?: string; label: string; shot?: string; tone?: 'accent' | 'ink'; ratio?: '4/5' | '1/1' | '3/2' | '16/9' | '3/4'; backdrop?: 'lines' | 'dots' | 'grid' | 'grain'; className?: string; children?: ReactNode }) {
  return (
    <figure className={cx('lt-art', className)} data-tone={tone} data-ratio={ratio === '4/5' ? undefined : ratio} data-backdrop={backdrop} data-shot={shot}>
      {children}
      {index && <p data-part="index">{index}</p>}
      <p data-part="name">{name}</p>
      {fact && <p data-part="fact">{fact}</p>}
      <figcaption className="lt-visually-hidden">{label}</figcaption>
    </figure>
  );
}
