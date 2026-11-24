import { cx } from '../../_shared/react';
import './cta-band.css';

/** Closing call to action: one sentence, one primary button, one quiet alternative. */
export function CtaBand({ title, lede, primary, secondary, className }: { title: string; lede?: string; primary: { label: string; href: string }; secondary?: { label: string; href: string }; className?: string }) {
  return (
    <section className={cx('lt-cta-band', className)} aria-label={title}>
      <div data-part="panel">
        <div><h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</div>
        <div data-part="cta"><a className="lt-btn" data-variant="primary" data-size="lg" href={primary.href}>{primary.label}</a>{secondary && <a className="lt-btn" data-variant="ghost" data-size="lg" href={secondary.href}>{secondary.label}</a>}</div>
      </div>
    </section>
  );
}
