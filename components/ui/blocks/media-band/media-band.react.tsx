import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './media-band.css';

/** One claim, one large picture, three facts: the cinematic beat of a page. Dark by default. */
export function MediaBand({ eyebrow, title, quiet, lede, media, caption, facts, tone = 'dark', className }: { eyebrow?: string; title: string; quiet?: string; lede?: string; media: ReactNode; caption?: string; facts?: Array<{ value: string; label: string }>; tone?: 'dark' | 'well' | 'plain'; className?: string }) {
  return (
    <section className={cx('lt-media-band', className)} data-tone={tone === 'plain' ? undefined : tone} aria-label={title}>
      <header>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}{quiet && <> <span data-part="quiet">{quiet}</span></>}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
      <figure data-part="media" data-zoom="">{media}{caption && <figcaption>{caption}</figcaption>}</figure>
      {facts && <dl data-part="facts">{facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}
    </section>
  );
}
