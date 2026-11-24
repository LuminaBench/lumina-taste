import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './image-compare';
import './image-compare.css';

export interface ImageCompareProps { before: ReactNode; after: ReactNode; beforeLabel: string; afterLabel: string; caption?: string; defaultValue?: number; onChange?: (value: number) => void; className?: string }

/** Before/after comparison. Pass <img> elements (object-fit: cover) as `before` and `after`. */
export function ImageCompare({ before, after, beforeLabel, afterLabel, caption, defaultValue = 50, onChange, className }: ImageCompareProps) {
  const ref = useEnhance<HTMLElement, { value: number }>(enhance, (d) => onChange?.(d.value));
  return (
    <figure ref={ref} className={cx('lt-compare', className)}>
      <div data-part="frame">
        <div data-part="before" role="img" aria-label={beforeLabel}>{before}<span data-part="tag">Before</span></div>
        <div data-part="after" role="img" aria-label={afterLabel}>{after}<span data-part="tag">After</span></div>
        <span data-part="handle" aria-hidden><Icon name="chevron-left" /><Icon name="chevron-right" /></span>
        <input type="range" min={0} max={100} defaultValue={defaultValue} aria-label="Reveal after image" data-part="range" />
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
