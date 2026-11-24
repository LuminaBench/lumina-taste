import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './lightbox';
import './lightbox.css';

export interface LightboxPhoto { title: string; alt: string; src?: string }

/** Thumbnail grid that opens a photo viewer with arrows, caption and count. */
export function Lightbox({ label, photos, className }: { label: string; photos: LightboxPhoto[]; className?: string }) {
  const ref = useEnhance<HTMLDivElement>(enhance, undefined, [photos.length]);
  return (
    <div ref={ref} className={cx('lt-lightbox', className)} data-photos={photos.map((p) => `${p.title}~${p.alt}`).join('|')}>
      <ul data-part="grid" aria-label={label}>
        {photos.map((p, i) => (
          <li key={p.title}><button type="button" data-part="thumb" data-i={i} aria-label={`Open photo ${i + 1} of ${photos.length}: ${p.title}`}><span data-part="ph" data-n={i % 6} aria-hidden /></button></li>
        ))}
      </ul>
      <dialog data-part="viewer" aria-label="Photo viewer">
        <figure><span data-part="ph" data-n="0" role="img" aria-label="" /><figcaption><span data-part="caption" /><span data-part="count" /></figcaption></figure>
        <button type="button" data-part="prev" aria-label="Previous photo"><Icon name="chevron-left" size={20} /></button>
        <button type="button" data-part="next" aria-label="Next photo"><Icon name="chevron-right" size={20} /></button>
        <button type="button" data-part="close" aria-label="Close"><Icon name="x" size={20} /></button>
      </dialog>
    </div>
  );
}
