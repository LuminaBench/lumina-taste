import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './cookie-consent';
import './cookie-consent.css';

/** Cookie banner with equal-weight choices and an optional per-category view. Store the result yourself. */
export function CookieConsent({ text, onChoice, className }: { text: string; onChoice?: (c: { analytics: boolean }) => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { analytics: boolean }>(enhance, (d) => onChoice?.(d));
  return (
    <div ref={ref} className={cx('lt-consent', className)}>
      <section data-part="banner" role="region" aria-label="Cookies">
        <div data-part="main"><h4>Cookies</h4><p>{text}</p></div>
        <div data-part="prefs" hidden>
          <label><input type="checkbox" defaultChecked disabled /> Essential <span>Always on</span></label>
          <label><input type="checkbox" name="analytics" /> Analytics <span>Page views, no personal data</span></label>
        </div>
        <div data-part="actions">
          <button type="button" className="lt-btn" data-variant="ghost" data-part="customise" aria-expanded="false">Customise</button>
          <button type="button" className="lt-btn" data-variant="secondary" data-choice="essential">Essential only</button>
          <button type="button" className="lt-btn" data-variant="secondary" data-choice="all">Accept all</button>
        </div>
      </section>
      <p data-part="done" role="status" hidden />
    </div>
  );
}
