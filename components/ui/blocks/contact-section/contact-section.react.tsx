import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './contact-section';
import './contact-section.css';

/** Contact section: details on the left, a short form on the right. Validates on submit. */
export function ContactSection({ title = 'Talk to a person', lede, email, onSend, className }: { title?: string; lede?: string; email: string; onSend?: (data: Record<string, string>) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, Record<string, string>>(enhance, (d) => onSend?.(d));
  return (
    <section ref={ref} className={cx('lt-contact-section', className)} aria-label={title}>
      <div data-part="info"><h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}<dl><div><dt>Email</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div></dl></div>
      <form data-part="form" noValidate>
        <div data-part="row"><label>Name<input name="name" autoComplete="name" required /></label><label>Work email<input name="email" type="email" autoComplete="email" required /></label></div>
        <label>Topic<select name="topic"><option>Sales</option><option>Support</option><option>Billing</option><option>Something else</option></select></label>
        <label>Message<textarea name="message" rows={4} required /></label>
        <button type="submit" className="lt-btn" data-variant="primary">Send message</button>
        <p data-part="msg" role="status" />
      </form>
    </section>
  );
}
