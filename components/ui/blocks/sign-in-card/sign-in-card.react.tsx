import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './sign-in-card';
import './sign-in-card.css';

export interface SignInCardProps { product: string; providers?: Array<{ label: string; icon?: 'globe' | 'code' | 'lock' }>; onEmail?: (email: string) => void; onProvider?: (label: string) => void; signupHref?: string; className?: string }

/** Passwordless sign-in card: SSO buttons, a divider, and an email magic link. */
export function SignInCard({ product, providers = [{ label: 'Continue with SSO', icon: 'globe' }], onEmail, onProvider, signupHref = '#signup', className }: SignInCardProps) {
  const id = useId();
  const ref = useEnhance<HTMLElement, { email: string }>(enhance, (d) => onEmail?.(d.email));
  return (
    <section ref={ref} className={cx('lt-sign-in-card', className)} aria-label={`Sign in to ${product}`}>
      <div data-part="card">
        <span data-part="logo" aria-hidden>{product[0]}</span>
        <h2>Sign in to {product}</h2>
        <p data-part="lede">Welcome back. Use your work email.</p>
        <div data-part="sso">{providers.map((p) => <button key={p.label} type="button" className="lt-btn" data-variant="secondary" onClick={() => onProvider?.(p.label)}>{p.icon && <Icon name={p.icon} />}{p.label}</button>)}</div>
        <p data-part="or"><span>or</span></p>
        <form data-part="form" noValidate>
          <label htmlFor={id}>Work email</label>
          <input id={id} type="email" autoComplete="email" required placeholder="you@company.com" aria-describedby={`${id}-msg`} />
          <button type="submit" className="lt-btn" data-variant="primary">Email me a sign-in link</button>
          <p id={`${id}-msg`} data-part="msg" aria-live="polite" />
        </form>
        <p data-part="foot">New here? <a href={signupHref}>Create an account</a></p>
      </div>
    </section>
  );
}
