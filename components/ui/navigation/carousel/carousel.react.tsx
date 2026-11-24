import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './carousel';
import './carousel.css';

export interface CarouselSlide { kicker: string; title: string; href: string; meta: string }

/** Scroll-snap carousel with Previous/Next and dots. Never auto-advances. */
export function Carousel({ label, slides, onChange, className }: { label: string; slides: CarouselSlide[]; onChange?: (index: number) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, { index: number }>(enhance, (d) => onChange?.(d.index));
  return (
    <section ref={ref} className={cx('lt-carousel', className)} aria-roledescription="carousel" aria-label={label}>
      <header><h3>{label}</h3><div data-part="nav"><button type="button" data-part="prev" aria-label="Previous slides"><Icon name="chevron-left" /></button><button type="button" data-part="next" aria-label="Next slides"><Icon name="chevron-right" /></button></div></header>
      <ul data-part="track" tabIndex={0} aria-label={`${label}, scroll sideways`}>
        {slides.map((s, i) => (
          <li key={s.href} data-part="slide" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}>
            <div data-part="art" data-n={i % 4} aria-hidden />
            <p data-part="kicker">{s.kicker}</p><h4><a href={s.href}>{s.title}</a></h4><p data-part="meta">{s.meta}</p>
          </li>
        ))}
      </ul>
      <div data-part="dots">{slides.map((_, i) => <button key={i} type="button" data-part="dot" aria-label={`Go to slide ${i + 1}`} aria-current={i === 0 || undefined} />)}</div>
    </section>
  );
}
