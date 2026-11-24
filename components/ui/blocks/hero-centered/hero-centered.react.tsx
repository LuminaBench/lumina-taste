import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './hero-centered.css';

export interface HeroCenteredProps { announcement?: { label: string; text: string; href: string }; title: string; lede: string; primary: { label: string; href: string }; secondary?: { label: string; href: string }; visual?: ReactNode; className?: string }

/** Centred hero with an announcement pill, two actions and a framed product shot. */
export function HeroCentered({ announcement, title, lede, primary, secondary, visual, className }: HeroCenteredProps) {
  return (
    <section className={cx('lt-hero-centered', className)} aria-label={title}>
      {announcement && <a data-part="pill" href={announcement.href}><span>{announcement.label}</span>{announcement.text} <Icon name="arrow-right" /></a>}
      <h2>{title}</h2>
      <p data-part="lede">{lede}</p>
      <div data-part="cta"><a className="lt-btn" data-variant="primary" data-size="lg" href={primary.href}>{primary.label}</a>{secondary && <a className="lt-btn" data-variant="secondary" data-size="lg" href={secondary.href}>{secondary.label}</a>}</div>
      {visual && <div data-part="shot">{visual}</div>}
    </section>
  );
}
