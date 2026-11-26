import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import '../../data/art-panel/art-panel.css';
import './photo-words.css';

/**
 * One photograph across the screen with a few words on it. The scrim sits only behind the words, fading out from
 * their corner (place), so the rest of the picture keeps its light. On a phone the picture is 4:5 and the words sit
 * at its foot. Pass an <img> (or an ArtPanel until there is a photograph) as photo.
 */
export function PhotoWords({ title, lede, action, photo, place = 'start-end', className }: { title: string; lede?: string; action?: ReactNode; photo: ReactNode; place?: 'start-end' | 'end-end' | 'start-start'; className?: string }) {
  return (
    <section className={cx('lt-photo-words', className)} data-place={place === 'start-end' ? undefined : place} aria-label={title}>
      <figure data-part="photo" data-tone="dark">{photo}</figure>
      <div data-part="words" data-tone="dark">
        <h2>{title}</h2>
        {lede && <p data-part="lede">{lede}</p>}
        {action && <div data-part="cta">{action}</div>}
      </div>
    </section>
  );
}
