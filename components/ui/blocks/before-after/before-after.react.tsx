import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './before-after';
import './before-after.css';

export interface BeforeAfterProps {
  title: string; lede?: string;
  /** A picture of each state (an <img> of the same size, or live markup). Plain lists of strings render the older two-list layout. */
  before: ReactNode | string[]; after: ReactNode | string[];
  beforeLabel?: string; afterLabel?: string;
  /** What each picture shows, for screen readers. */
  beforeAlt?: string; afterAlt?: string;
  captions?: [string, string]; defaultValue?: number; onChange?: (value: number) => void; className?: string;
}

/** Before and after: one picture in two states with a divider to drag (a native range: keyboard, pointer, touch). */
export function BeforeAfter({ title, lede, before, after, beforeLabel = 'Before', afterLabel = 'After', beforeAlt, afterAlt, captions, defaultValue = 50, onChange, className }: BeforeAfterProps) {
  const lists = Array.isArray(before) && Array.isArray(after) && typeof before[0] === 'string';
  const ref = useEnhance<HTMLElement, { value: number }>(lists ? null : enhance, (d) => onChange?.(d.value));
  if (lists) {
    return (
      <section ref={ref} className={cx('lt-before-after', className)} aria-label={title}>
        <header><h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
        <div data-part="cols">
          <div data-part="old"><h3>{beforeLabel}</h3><ul>{(before as string[]).map((t) => <li key={t}><Icon name="x" />{t}</li>)}</ul></div>
          <div data-part="new"><h3>{afterLabel === 'After' ? 'With us' : afterLabel}</h3><ul>{(after as string[]).map((t) => <li key={t}><Icon name="check" />{t}</li>)}</ul></div>
        </div>
      </section>
    );
  }
  return (
    <section ref={ref} className={cx('lt-before-after', className)} aria-label={title}>
      <header><h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
      <div data-part="compare">
        <div data-part="before" role="img" aria-label={beforeAlt ?? beforeLabel}>{before as ReactNode}<span data-part="tag">{beforeLabel}</span></div>
        <div data-part="after" role="img" aria-label={afterAlt ?? afterLabel}>{after as ReactNode}<span data-part="tag">{afterLabel}</span></div>
        <span data-part="handle" aria-hidden="true"><Icon name="chevron-left" /><Icon name="chevron-right" /></span>
        <input type="range" data-part="range" min={0} max={100} step={1} defaultValue={defaultValue} aria-label={`Divider between ${beforeLabel.toLowerCase()} and ${afterLabel.toLowerCase()}`} />
      </div>
      {captions && <p data-part="captions"><span><b>{beforeLabel}</b> {captions[0]}</span><span><b>{afterLabel}</b> {captions[1]}</span></p>}
    </section>
  );
}
