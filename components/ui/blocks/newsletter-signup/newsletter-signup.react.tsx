import { useId } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './newsletter-signup';
import './newsletter-signup.css';

export interface NewsletterSignupProps { title: string; lede?: string; note?: string; button?: string; onSubscribe?: (email: string) => void; className?: string }

/** One-line email form: validates on submit, explains errors, confirms in place. */
export function NewsletterSignup({ title, lede, note = 'No spam. Unsubscribe in one click.', button = 'Subscribe', onSubscribe, className }: NewsletterSignupProps) {
  const id = useId();
  const ref = useEnhance<HTMLElement, { email: string }>(enhance, (d) => onSubscribe?.(d.email));
  return (
    <section ref={ref} className={cx('lt-newsletter-signup', className)} aria-label={title}>
      <div data-part="copy"><h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</div>
      <form data-part="form" noValidate>
        <label htmlFor={id} className="lt-visually-hidden">Email address</label>
        <div data-part="row"><input id={id} type="email" name="email" placeholder="you@company.com" autoComplete="email" required aria-describedby={`${id}-msg`} /><button type="submit" className="lt-btn" data-variant="primary">{button}</button></div>
        <p id={`${id}-msg`} data-part="msg" aria-live="polite">{note}</p>
      </form>
    </section>
  );
}
