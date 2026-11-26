import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './hero-centered.css';

export interface HeroCenteredProps {
  announcement?: { label: string; text: string; href: string }; title: string; lede: string; primary: { label: string; href: string };
  /** One quiet link beside the action. */
  secondary?: { label: string; href: string }; visual?: ReactNode;
  /** wide: a larger statement over a picture that runs edge to edge (no announcement, no frame). */
  variant?: 'wide'; className?: string;
}

/** Centred hero with an announcement pill, two actions and a framed product shot. */
export function HeroCentered({ announcement, title, lede, primary, secondary, visual, variant, className }: HeroCenteredProps) {
  return (
    <section className={cx('lt-hero-centered', className)} aria-label={title} data-variant={variant}>
      {announcement && !variant && <a data-part="pill" href={announcement.href}><span>{announcement.label}</span>{announcement.text} <Icon name="arrow-right" /></a>}
      <h1>{title}</h1>
      <p data-part="lede">{lede}</p>
      <div data-part="cta"><a className="lt-btn" data-variant="primary" data-size="lg" href={primary.href}>{primary.label}</a>{secondary && <a className="lt-btn" data-variant={variant ? 'ghost' : 'secondary'} data-size="lg" href={secondary.href}>{secondary.label}</a>}</div>
      {visual && (variant ? <div data-part="visual">{visual}</div> : <div data-part="shot">{visual}</div>)}
    </section>
  );
}
