import type { ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { Icon } from '../../_shared/Icon';
import { enhance } from './hero-video';
import './hero-video.css';

export interface HeroVideoProps {
  title: string; lede: string; primary: { label: string; href: string };
  /** The still shown first and whenever the film is not playing: an <img>, or an art panel. */
  poster: ReactNode;
  /** The film: muted, looped, inline. Leave it out for a still-only hero. */
  src?: string; type?: string;
  /** full: the film is the whole first screen, the words at its foot over a scrim (on the palette's dark tokens). */
  variant?: 'full'; className?: string;
}

/** Hero with a still that becomes a muted looping film when motion is allowed, with a pause button. */
export function HeroVideo({ title, lede, primary, poster, src, type = 'video/mp4', variant, className }: HeroVideoProps) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, [src]);
  return (
    <section ref={ref} className={cx('lt-hero-video', className)} aria-label={title} data-variant={variant} data-tone={variant === 'full' ? 'dark' : undefined}>
      <div data-part="copy">
        <h1>{title}</h1>
        <div data-part="side"><p data-part="lede">{lede}</p><div data-part="cta"><a className="lt-btn" data-variant="primary" data-size="lg" href={primary.href}>{primary.label}</a></div></div>
      </div>
      <div data-part="media">
        {poster}
        <video data-part="video" muted loop playsInline preload="none" aria-hidden="true" hidden><source data-src={src ?? ''} type={type} /></video>
        <button type="button" data-part="toggle" aria-label="Pause the film" hidden><span data-icon="pause"><Icon name="pause" /></span><span data-icon="play"><Icon name="play" /></span></button>
      </div>
    </section>
  );
}
