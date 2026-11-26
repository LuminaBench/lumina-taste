import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './hero-mosaic.css';

export interface HeroMosaicProps {
  title: string; eyebrow?: string; lede?: string; primary: { label: string; href: string }; secondary?: { label: string; href: string };
  /** Three to five pictures (photographs, art panels or devices) in one tone; the first is the large one. */
  tiles: ReactNode[]; className?: string;
}

/** Hero of three to five pictures set as one composition, with the headline in the corner they leave. */
export function HeroMosaic({ title, eyebrow, lede, primary, secondary, tiles, className }: HeroMosaicProps) {
  return (
    <section className={cx('lt-hero-mosaic', className)} aria-label={title}>
      <div data-part="copy">
        {eyebrow && <p data-part="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lede && <p data-part="lede">{lede}</p>}
        <div data-part="cta"><a className="lt-btn" data-variant="primary" data-size="lg" href={primary.href}>{primary.label}</a>{secondary && <a className="lt-btn" data-variant="ghost" data-size="lg" href={secondary.href}>{secondary.label}</a>}</div>
      </div>
      <ul data-part="tiles">{tiles.slice(0, 5).map((t, i) => <li key={i}>{t}</li>)}</ul>
    </section>
  );
}
